const crypto = require("crypto");
const { prisma } = require("../config/db");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/apiError");
const {
  createRazorpayOrder,
  verifyRazorpayWebhookSignature,
  verifyRazorpayPaymentSignature,
  refundRazorpayPayment,
} = require("../services/payment.service");
const { dispatchNotification } = require("../services/notification.service");
const env = require("../config/env");
const logger = require("../utils/logger");
const { recordLedgerEntry } = require("../services/ledger.service");
const { logAdminAction } = require("../services/audit.service");

// Helper to validate UUIDs
const isValidUuid = (id) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

const PAYMENT_SELECT = {
  id: true,
  projectId: true,
  recruiterId: true,
  freelancerId: true,
  amount: true,
  currency: true,
  gatewayOrderId: true,
  gatewayReceipt: true,
  gatewayPaymentId: true,
  status: true,
  escrowStatus: true,
  idempotencyKey: true,
  createdAt: true,
  updatedAt: true,
};

const createPaymentOrder = catchAsync(async (req, res) => {
  const { projectId, amount, currency, idempotencyKey } = req.validatedBody;
  const userUserId = req.user.id || req.user._id;

  if (!isValidUuid(projectId)) {
    throw new ApiError(400, "Invalid project id");
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      recruiterId: true,
      selectedFreelancer: true,
      status: true,
      budgetMin: true,
      budgetMax: true,
      currency: true,
      title: true,
    },
  });

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  if (project.recruiterId !== userUserId) {
    throw new ApiError(403, "You can only create payment for your own project");
  }

  if (!project.selectedFreelancer) {
    throw new ApiError(400, "Cannot create payment before selecting a freelancer");
  }

  if (!["selected", "in_progress"].includes(project.status)) {
    throw new ApiError(400, "Project is not in payable state");
  }

  if (currency !== project.currency) {
    throw new ApiError(400, "Payment currency must match project currency");
  }

  if (amount < project.budgetMin || amount > project.budgetMax) {
    throw new ApiError(400, "Payment amount must be within project budget range");
  }

  if (idempotencyKey) {
    const existing = await prisma.payment.findFirst({
      where: {
        projectId: project.id,
        recruiterId: userUserId,
        idempotencyKey,
      },
      select: PAYMENT_SELECT,
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Payment order already exists for this idempotency key",
        data: existing,
      });
    }
  } else {
    const existingPending = await prisma.payment.findFirst({
      where: {
        projectId: project.id,
        recruiterId: userUserId,
        status: { in: ["created", "authorized"] },
        escrowStatus: "pending",
        amount,
        currency,
      },
      orderBy: { createdAt: "desc" },
      select: PAYMENT_SELECT,
    });

    if (existingPending) {
      return res.status(200).json({
        success: true,
        message: "Existing pending payment order returned",
        data: existingPending,
      });
    }
  }

  const amountPaise = Math.round(amount * 100);
  const receipt = `sb_${project.id}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const razorpayOrder = await createRazorpayOrder({
    amountPaise,
    currency,
    receipt,
    notes: {
      projectId: String(project.id),
      recruiterId: String(userUserId),
      freelancerId: String(project.selectedFreelancer),
    },
  });

  const payment = await prisma.payment.create({
    data: {
      projectId: project.id,
      recruiterId: userUserId,
      freelancerId: project.selectedFreelancer,
      amount,
      currency,
      gatewayOrderId: razorpayOrder.id,
      gatewayReceipt: razorpayOrder.receipt || receipt,
      status: "created",
      escrowStatus: "pending",
      idempotencyKey: idempotencyKey || "",
      timeline: {
        create: [
          {
            event: "order_created",
            status: "created",
            note: "Razorpay order generated",
            metadata: { gatewayOrderId: razorpayOrder.id },
          },
        ],
      },
    },
    select: PAYMENT_SELECT,
  });

  await recordLedgerEntry({
    userId: userUserId,
    projectId: project.id,
    paymentId: payment.id,
    transactionType: "PAYMENT",
    grossAmount: amount,
    currency,
    gatewayOrderId: razorpayOrder.id,
    idempotencyKey: idempotencyKey || "",
    status: "CREATED",
    note: "Razorpay order created for project payment",
  });

  await dispatchNotification({
    recipientIds: [project.recruiterId, project.selectedFreelancer],
    type: "payment_created",
    title: "Payment order created",
    message: `Payment order created for project "${project.title}".`,
    entityType: "Payment",
    entityId: payment.id,
    metadata: {
      projectId: project.id,
      amount,
      currency,
    },
  });

  res.status(201).json({
    success: true,
    message: "Payment order created successfully",
    data: {
      payment,
      razorpayOrder,
    },
  });

  logger.reqInfo(req, "payment_order_created", {
    paymentId: payment.id,
    projectId: project.id,
    recruiterId: userUserId,
    freelancerId: String(project.selectedFreelancer),
  });
});

const handleWebhookEvent = async ({ eventType, entity, payment, eventId, payloadHash, signature }) => {
  const gatewayOrderId = entity?.order_id || payment?.order_id || "";
  const gatewayPaymentId = entity?.id || payment?.id || "";

  await prisma.paymentWebhookEvent.create({
    data: {
      eventId,
      eventType,
      payloadHash,
      processedAt: new Date(),
      gatewayOrderId,
      gatewayPaymentId,
      signature: signature || "",
    },
  });

  if (!gatewayOrderId) {
    return { updated: false, reason: "order_id_missing" };
  }

  const paymentRecord = await prisma.payment.findUnique({
    where: { gatewayOrderId },
  });

  if (!paymentRecord) {
    return { updated: false, reason: "payment_record_not_found" };
  }

  let nextStatus = paymentRecord.status;
  let nextEscrowStatus = paymentRecord.escrowStatus;
  let eventName = "webhook_received";
  let eventNote = `Unhandled event recorded: ${eventType}`;

  if (eventType === "payment.captured" || eventType === "order.paid") {
    nextStatus = "captured";
    nextEscrowStatus = "held_in_escrow";
    eventName = "escrow_held";
    eventNote = "Payment captured and moved to escrow hold";
  } else if (eventType === "payment.authorized") {
    nextStatus = "authorized";
    eventName = "payment_authorized";
    eventNote = "Payment authorized at gateway";
  } else if (eventType === "payment.failed") {
    nextStatus = "failed";
    eventName = "payment_failed";
    eventNote = "Payment failed at gateway";
  }

  const updatedPayment = await prisma.payment.update({
    where: { id: paymentRecord.id },
    data: {
      gatewayPaymentId: gatewayPaymentId || paymentRecord.gatewayPaymentId,
      status: nextStatus,
      escrowStatus: nextEscrowStatus,
      timeline: {
        create: [
          {
            event: eventName,
            status: nextStatus,
            note: eventNote,
            metadata: { eventType, gatewayPaymentId, gatewayOrderId },
          },
        ],
      },
    },
  });

  if (eventType === "payment.captured" || eventType === "order.paid") {
    try {
      const { ensureProjectConversation } = require("./chat.controller");
      await ensureProjectConversation(updatedPayment.projectId);
    } catch (cErr) {
      logger.warn("ensureProjectConversation_failed", { error: cErr.message });
    }

    await recordLedgerEntry({
      userId: updatedPayment.recruiterId,
      projectId: updatedPayment.projectId,
      paymentId: updatedPayment.id,
      transactionType: "ESCROW_HOLD",
      grossAmount: updatedPayment.amount,
      currency: updatedPayment.currency,
      gatewayOrderId: gatewayOrderId || updatedPayment.gatewayOrderId,
      gatewayPaymentId: gatewayPaymentId || updatedPayment.gatewayPaymentId,
      status: "COMPLETED",
      note: "Payment captured and held in secure escrow",
    });

    await dispatchNotification({
      recipientIds: [updatedPayment.recruiterId, updatedPayment.freelancerId],
      type: "escrow_held",
      title: "Escrow funded",
      message: "Payment captured and held in escrow.",
      entityType: "Payment",
      entityId: updatedPayment.id,
      metadata: {
        gatewayOrderId,
        gatewayPaymentId,
        eventType,
      },
    });
  }

  if (eventType === "payment.failed") {
    await dispatchNotification({
      recipientIds: [updatedPayment.recruiterId],
      type: "payment_failed",
      title: "Payment failed",
      message: "A payment attempt failed. Please retry payment.",
      entityType: "Payment",
      entityId: updatedPayment.id,
      metadata: {
        gatewayOrderId,
        gatewayPaymentId,
        eventType,
      },
    });
  }

  return { updated: true, paymentId: updatedPayment.id };
};

const handleRazorpayWebhook = catchAsync(async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  if (!signature) {
    throw new ApiError(401, "Missing Razorpay signature header");
  }

  const rawBodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
  if (!rawBodyBuffer.length) {
    throw new ApiError(400, "Webhook raw payload is required");
  }

  const isSignatureValid = verifyRazorpayWebhookSignature(rawBodyBuffer, String(signature));
  if (!isSignatureValid) {
    logger.reqWarn(req, "payment_webhook_signature_invalid", {
      eventId: req.headers["x-razorpay-event-id"] || null,
    });
    throw new ApiError(401, "Invalid Razorpay webhook signature");
  }

  let payload;
  try {
    payload = JSON.parse(rawBodyBuffer.toString("utf8"));
  } catch (error) {
    throw new ApiError(400, "Invalid webhook JSON payload");
  }

  const eventType = String(payload.event || "").trim();
  if (!eventType) {
    throw new ApiError(400, "Webhook event type is missing");
  }

  const paymentEntity = payload?.payload?.payment?.entity || null;
  const orderEntity = payload?.payload?.order?.entity || null;
  const entity = paymentEntity || orderEntity || null;
  const payloadHash = crypto.createHash("sha256").update(rawBodyBuffer).digest("hex");
  const eventIdHeader = req.headers["x-razorpay-event-id"];
  const eventId =
    String(eventIdHeader || "").trim() ||
    `${eventType}:${entity?.id || "unknown"}:${payload.created_at || Date.now()}`;

  const duplicateEvent = await prisma.paymentWebhookEvent.findFirst({
    where: {
      OR: [
        { eventId },
        { payloadHash },
      ],
    },
    select: { eventId: true },
  });

  if (duplicateEvent) {
    logger.reqWarn(req, "payment_webhook_duplicate", {
      eventId,
      duplicateEventId: duplicateEvent.eventId,
    });
    return res.status(200).json({
      success: true,
      message: "Duplicate or replayed webhook event already processed",
      data: { eventId, duplicateEventId: duplicateEvent.eventId },
    });
  }

  const result = await handleWebhookEvent({
    eventType,
    entity,
    payment: paymentEntity,
    eventId,
    payloadHash,
    signature: String(signature),
  });

  res.status(200).json({
    success: true,
    message: "Webhook processed successfully",
    data: {
      eventId,
      eventType,
      paymentUpdated: result.updated,
      reason: result.reason || "",
    },
  });

  logger.reqInfo(req, "payment_webhook_processed", {
    eventId,
    eventType,
    paymentUpdated: result.updated,
    reason: result.reason || null,
  });
});

const releaseEscrowPayment = catchAsync(async (req, res) => {
  const { paymentId, forceRelease, releaseNote } = req.validatedBody;
  const isAdmin = req.user.role === "admin";
  const isRecruiter = req.user.role === "recruiter";
  const userUserId = req.user.id || req.user._id;

  if (!isValidUuid(paymentId)) {
    throw new ApiError(400, "Invalid payment id");
  }

  if (forceRelease && !isAdmin) {
    throw new ApiError(403, "Only admin can force release escrow");
  }

  const initialPayment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { recruiterId: true, escrowStatus: true },
  });

  if (!initialPayment) {
    throw new ApiError(404, "Payment not found");
  }

  if (isRecruiter && initialPayment.recruiterId !== userUserId) {
    throw new ApiError(403, "You can only release payment for your own project");
  }

  if (initialPayment.escrowStatus === "released") {
    return res.status(200).json({
      success: true,
      message: "Escrow already released",
      data: { payment: initialPayment },
    });
  }

  let responsePayment = null;
  let responseProject = null;

  // Run updates in a PostgreSQL transaction
  await prisma.$transaction(async (tx) => {
    const paymentDoc = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!paymentDoc) {
      throw new ApiError(404, "Payment not found");
    }

    if (isRecruiter && paymentDoc.recruiterId !== userUserId) {
      throw new ApiError(403, "You can only release payment for your own project");
    }

    if (paymentDoc.status !== "captured") {
      throw new ApiError(400, "Only captured payments can be released");
    }

    if (paymentDoc.escrowStatus !== "held_in_escrow") {
      throw new ApiError(400, "Payment is not currently held in escrow");
    }

    const projectDoc = await tx.project.findUnique({ where: { id: paymentDoc.projectId } });
    if (!projectDoc) {
      throw new ApiError(404, "Associated project not found");
    }

    const completionAllowed = ["completed", "paid"].includes(projectDoc.status);
    if (!completionAllowed && !forceRelease) {
      throw new ApiError(
        400,
        "Escrow release allowed only after project completion. Admin can use forceRelease."
      );
    }

    const nextStatus = paymentDoc.status === "authorized" ? "captured" : paymentDoc.status;

    responsePayment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        escrowStatus: "released",
        status: nextStatus,
        timeline: {
          create: [
            {
              event: "escrow_released",
              status: "released",
              note: releaseNote || (forceRelease ? "Force-released by admin" : "Released after completion"),
              metadata: {
                releasedBy: userUserId,
                role: req.user.role,
                forceRelease: Boolean(forceRelease),
                projectStatusAtRelease: projectDoc.status,
              },
            },
          ],
        },
      },
      select: PAYMENT_SELECT,
    });

    responseProject = await tx.project.update({
      where: { id: paymentDoc.projectId },
      data: { status: "paid" },
      select: {
        id: true,
        title: true,
        status: true,
        recruiterId: true,
        selectedFreelancer: true,
        budgetMin: true,
        budgetMax: true,
        currency: true,
        updatedAt: true,
      },
    });
  });

  const feeRate = 0.15; // 15% platform fee
  const feeAmount = responsePayment.amount * feeRate;
  const netAmount = responsePayment.amount * (1 - feeRate);

  await recordLedgerEntry({
    userId: responsePayment.freelancerId,
    projectId: responseProject.id,
    paymentId: responsePayment.id,
    transactionType: "ESCROW_RELEASE",
    grossAmount: responsePayment.amount,
    feeAmount,
    netAmount,
    currency: responsePayment.currency,
    gatewayOrderId: responsePayment.gatewayOrderId,
    gatewayPaymentId: responsePayment.gatewayPaymentId,
    status: "COMPLETED",
    note: "Escrow funds released to freelancer wallet",
  });

  await dispatchNotification({
    recipientIds: [responsePayment.recruiterId, responsePayment.freelancerId],
    type: "escrow_released",
    title: "Escrow released",
    message: `Escrow payment released for project "${responseProject.title}".`,
    entityType: "Payment",
    entityId: responsePayment.id,
    metadata: {
      projectId: responseProject.id,
      paymentId: responsePayment.id,
      releasedBy: userUserId,
      role: req.user.role,
      forceRelease: Boolean(forceRelease),
    },
  });

  res.status(200).json({
    success: true,
    message: "Escrow released successfully",
    data: {
      payment: responsePayment,
      project: responseProject,
    },
  });

  logger.reqInfo(req, "payment_escrow_released", {
    paymentId: responsePayment.id,
    projectId: responseProject.id,
    releasedBy: userUserId,
    releasedByRole: req.user.role,
    forceRelease: Boolean(forceRelease),
  });
});

const verifyPayment = catchAsync(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.validatedBody;
  const userUserId = req.user.id || req.user._id;

  const isValid = verifyRazorpayPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);

  if (!isValid) {
    logger.reqWarn(req, "payment_verify_signature_invalid", {
      razorpayOrderId,
      razorpayPaymentId,
    });
    await logAdminAction({
      req,
      action: "SECURITY_EVENT:PAYMENT_SIGNATURE_VERIFICATION_FAILED",
      targetType: "PAYMENT",
      targetId: razorpayOrderId,
      metadata: { razorpayOrderId, razorpayPaymentId, reason: "Invalid HMAC SHA256 signature" },
    });
    throw new ApiError(400, "Payment signature verification failed. Security event recorded.");
  }

  const payment = await prisma.payment.findUnique({
    where: { gatewayOrderId: razorpayOrderId },
  });

  if (!payment) {
    throw new ApiError(404, "Payment record not found for this order");
  }

  if (payment.recruiterId !== userUserId) {
    throw new ApiError(403, "You are not authorized to verify this payment");
  }

  let finalPayment = payment;

  if (!payment.gatewayPaymentId) {
    finalPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        gatewayPaymentId: razorpayPaymentId,
        timeline: {
          create: [
            {
              event: "payment_verified_by_frontend",
              status: payment.status,
              note: "Frontend checkout signature verified successfully",
              metadata: { razorpayOrderId, razorpayPaymentId },
            },
          ],
        },
      },
    });
  }

  logger.reqInfo(req, "payment_verify_success", {
    razorpayOrderId,
    razorpayPaymentId,
    paymentId: finalPayment.id,
  });

  res.status(200).json({
    success: true,
    message: "Payment signature verified successfully",
    data: {
      verified: true,
      paymentId: finalPayment.id,
      gatewayOrderId: finalPayment.gatewayOrderId,
      gatewayPaymentId: finalPayment.gatewayPaymentId,
      status: finalPayment.status,
      escrowStatus: finalPayment.escrowStatus,
    },
  });
});

const refundPayment = catchAsync(async (req, res) => {
  const { paymentId, reason, refundAmount } = req.validatedBody;
  const isAdmin = req.user.role === "admin";
  const isRecruiter = req.user.role === "recruiter";
  const userUserId = req.user.id || req.user._id;

  if (!isValidUuid(paymentId)) {
    throw new ApiError(400, "Invalid payment id");
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new ApiError(404, "Payment not found");
  }

  if (isRecruiter && payment.recruiterId !== userUserId) {
    throw new ApiError(403, "You can only refund payments from your own projects");
  }

  if (payment.status !== "captured") {
    throw new ApiError(400, `Cannot refund a payment with status '${payment.status}'. Payment must be captured.`);
  }

  if (payment.escrowStatus === "released") {
    throw new ApiError(400, "Cannot refund a payment whose escrow has already been released.");
  }

  if (payment.status === "refunded" || payment.escrowStatus === "refunded") {
    return res.status(200).json({
      success: true,
      message: "Payment has already been refunded",
      data: { payment },
    });
  }

  if (!payment.gatewayPaymentId) {
    throw new ApiError(400, "Razorpay payment ID is not recorded yet. Please wait for webhook confirmation.");
  }

  const amountToRefund = refundAmount !== null ? refundAmount : payment.amount;
  const isFullRefund = amountToRefund >= payment.amount;
  const amountPaise = Math.round(amountToRefund * 100);

  let razorpayRefund;
  try {
    razorpayRefund = await refundRazorpayPayment({
      gatewayPaymentId: payment.gatewayPaymentId,
      amountPaise,
      notes: { reason: reason || "Refund requested", refundedBy: userUserId },
    });
  } catch (error) {
    logger.reqError(req, "payment_refund_razorpay_failed", {
      paymentId: payment.id,
      gatewayPaymentId: payment.gatewayPaymentId,
      errorMessage: error?.message || "Unknown error",
    });
    throw new ApiError(502, `Razorpay refund failed: ${error?.description || error?.message || "Unknown error"}`);
  }

  const nextStatus = isFullRefund ? "refunded" : "captured";
  const nextEscrowStatus = isFullRefund ? "refunded" : payment.escrowStatus;

  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: nextStatus,
      escrowStatus: nextEscrowStatus,
      timeline: {
        create: [
          {
            event: isFullRefund ? "full_refund_issued" : "partial_refund_issued",
            status: nextStatus,
            note: reason || (isFullRefund ? "Full refund issued" : `Partial refund of ${amountToRefund} issued`),
            metadata: {
              refundId: razorpayRefund.id,
              refundAmountPaise: amountPaise,
              refundAmount: amountToRefund,
              isFullRefund,
              refundedBy: userUserId,
              role: req.user.role,
              razorpayStatus: razorpayRefund.status,
            },
          },
        ],
      },
    },
    select: PAYMENT_SELECT,
  });

  await recordLedgerEntry({
    userId: payment.recruiterId,
    projectId: payment.projectId,
    paymentId: payment.id,
    transactionType: "REFUND",
    grossAmount: amountToRefund,
    currency: payment.currency,
    gatewayOrderId: payment.gatewayOrderId,
    gatewayPaymentId: payment.gatewayPaymentId,
    status: "COMPLETED",
    note: reason || (isFullRefund ? "Full payment refund" : "Partial payment refund"),
  });

  const project = await prisma.project.findUnique({
    where: { id: payment.projectId },
    select: { title: true, recruiterId: true, selectedFreelancer: true },
  });

  await dispatchNotification({
    recipientIds: [payment.recruiterId, payment.freelancerId],
    type: "payment_refunded",
    title: isFullRefund ? "Refund issued" : "Partial refund issued",
    message: isFullRefund
      ? `A full refund of ${amountToRefund} ${payment.currency} has been issued for project "${project?.title || ""}".`
      : `A partial refund of ${amountToRefund} ${payment.currency} has been issued for project "${project?.title || ""}".`,
    entityType: "Payment",
    entityId: payment.id,
    metadata: {
      refundId: razorpayRefund.id,
      refundAmount: amountToRefund,
      currency: payment.currency,
      isFullRefund,
    },
  });

  logger.reqInfo(req, "payment_refund_issued", {
    paymentId: payment.id,
    gatewayPaymentId: payment.gatewayPaymentId,
    refundId: razorpayRefund.id,
    refundAmount: amountToRefund,
    isFullRefund,
    refundedBy: userUserId,
    role: req.user.role,
  });

  res.status(200).json({
    success: true,
    message: isFullRefund ? "Full refund issued successfully" : "Partial refund issued successfully",
    data: {
      payment: updatedPayment,
      refund: {
        id: razorpayRefund.id,
        amount: amountToRefund,
        currency: payment.currency,
        status: razorpayRefund.status,
        isFullRefund,
      },
    },
  });
});

const getPaymentStats = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const role = req.user.role;

  const where = {
    status: "captured",
  };

  if (role === "recruiter") {
    where.recruiterId = userId;
  } else {
    where.freelancerId = userId;
  }

  const payments = await prisma.payment.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: {
      recruiter: {
        include: {
          subscriptions: {
            where: {
              status: "active",
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
              ],
            },
          },
        },
      },
      freelancer: {
        include: {
          subscriptions: {
            where: {
              status: "active",
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
              ],
            },
          },
        },
      },
    },
  });

  let totalAmount = 0;
  let taxAmount = 0;
  let netAmount = 0;

  const monthlyGroupsData = {};

  payments.forEach((p) => {
    const hasDiscount = (p.recruiter?.subscriptions?.length || 0) > 0 || (p.freelancer?.subscriptions?.length || 0) > 0;
    const rate = hasDiscount ? 0.10 : 0.15;

    totalAmount += p.amount;
    taxAmount += p.amount * rate;
    netAmount += p.amount * (1 - rate);

    const date = new Date(p.createdAt);
    const monthYear = date.toLocaleString("en-US", { month: "short", year: "numeric" });
    if (!monthlyGroupsData[monthYear]) {
      monthlyGroupsData[monthYear] = { amount: 0, tax: 0, net: 0 };
    }
    monthlyGroupsData[monthYear].amount += p.amount;
    monthlyGroupsData[monthYear].tax += p.amount * rate;
    monthlyGroupsData[monthYear].net += p.amount * (1 - rate);
  });

  const graphData = Object.entries(monthlyGroupsData).map(([month, data]) => ({
    name: month,
    amount: data.amount,
    tax: data.tax,
    net: data.net,
  }));

  res.status(200).json({
    success: true,
    message: "Payment statistics fetched successfully",
    data: {
      totalAmount,
      taxAmount,
      netAmount,
      paymentsCount: payments.length,
      graphData,
      payments: payments.map((p) => {
        const hasDiscount = (p.recruiter?.subscriptions?.length || 0) > 0 || (p.freelancer?.subscriptions?.length || 0) > 0;
        const rate = hasDiscount ? 0.10 : 0.15;
        return {
          id: p.id,
          amount: p.amount,
          tax: p.amount * rate,
          net: p.amount * (1 - rate),
          status: p.status,
          escrowStatus: p.escrowStatus,
          createdAt: p.createdAt,
        };
      }),
    },
  });
});

const createSourcingOrder = catchAsync(async (req, res) => {
  const userUserId = req.user.id || req.user._id;
  const amount = 2359; // ₹1,999 + 18% GST = ₹2,359
  const amountPaise = amount * 100;
  const receipt = `src_${String(userUserId).slice(-8)}_${String(Date.now()).slice(-8)}`;

  const razorpayOrder = await createRazorpayOrder({
    amountPaise,
    currency: "INR",
    receipt,
    notes: {
      userId: String(userUserId),
      type: "expert_sourcing_fee",
      amount: "₹1,999",
      tax: "₹360",
      total: "₹2,359",
    },
  });

  res.status(200).json({
    success: true,
    data: {
      orderId: razorpayOrder.id,
      amount: amountPaise,
      currency: "INR",
      keyId: env.razorpayKeyId,
      receipt,
    },
  });
});

const verifySourcingPayment = catchAsync(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new ApiError(400, "Missing signature verification details");
  }

  const isValid = verifyRazorpayPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!isValid) {
    throw new ApiError(400, "Invalid payment signature");
  }

  res.status(200).json({
    success: true,
    message: "Payment signature verified successfully",
  });
});

const createFineOrder = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fineAmount: true, fineStatus: true, fineReason: true },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const fineAmount = user.fineAmount || 5000;
  const amountPaise = Math.round(fineAmount * 100);
  const receipt = `fine_${userId.slice(0, 8)}_${Date.now().toString().slice(-6)}`;

  const razorpayOrder = await createRazorpayOrder({
    amount: amountPaise,
    currency: "INR",
    receipt,
    notes: {
      userId,
      type: "ACCOUNT_UNBLOCK_FINE",
      reason: user.fineReason || "Contact details policy violation fine",
    },
  });

  res.status(200).json({
    success: true,
    data: {
      orderId: razorpayOrder.id,
      amount: amountPaise,
      currency: "INR",
      keyId: env.razorpayKeyId,
      receipt,
      fineAmount,
    },
  });
});

const verifyFinePayment = catchAsync(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  const userId = req.user.id || req.user._id;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new ApiError(400, "Missing signature verification details");
  }

  const isValid = verifyRazorpayPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!isValid) {
    throw new ApiError(400, "Invalid fine payment signature");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      fineStatus: "PAID",
      moderationStatus: "active",
      fineReason: "Fine paid via Razorpay (" + razorpayPaymentId + ")",
    },
    select: { id: true, name: true, email: true, moderationStatus: true, fineStatus: true },
  });

  await dispatchNotification({
    recipientId: userId,
    type: "FINE_PAID_UNBLOCKED",
    title: "🎉 Account Unblocked!",
    message: "Your ₹5,000 fine payment has been successfully verified. Your account access has been fully restored.",
    metadata: { paymentId: razorpayPaymentId, orderId: razorpayOrderId },
  }).catch(() => {});

  res.status(200).json({
    success: true,
    message: "Fine payment verified and account unblocked successfully!",
    data: updatedUser,
  });
});

module.exports = {
  createPaymentOrder,
  handleRazorpayWebhook,
  releaseEscrowPayment,
  verifyPayment,
  refundPayment,
  getPaymentStats,
  createSourcingOrder,
  verifySourcingPayment,
  createFineOrder,
  verifyFinePayment,
};
