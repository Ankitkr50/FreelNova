const crypto = require("crypto");
const { prisma } = require("../config/db");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/apiError");
const { createRazorpayOrder, verifyRazorpayPaymentSignature } = require("../services/payment.service");
const logger = require("../utils/logger");
const env = require("../config/env");

// Helper to validate UUIDs
const isValidUuid = (id) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

// Plan config — amounts in INR
const PLAN_CONFIG = {
  pro_monthly: { label: "FreelNova Pro Monthly", amount: 1099, durationDays: 30 },
  pro_yearly:  { label: "FreelNova Pro Yearly",  amount: 7999, durationDays: 365 },
};

const createSubscriptionOrder = catchAsync(async (req, res) => {
  const { plan, currency, idempotencyKey } = req.validatedBody;
  const targetCurrency = currency || "INR";
  const isUSD = targetCurrency === "USD";
  const amount = plan === "pro_monthly" ? (isUSD ? 15 : 1099) : (isUSD ? 99 : 7999);
  const planConfig = PLAN_CONFIG[plan];
  const userUserId = req.user.id || req.user._id;

  // Idempotency — return existing pending order for same key
  if (idempotencyKey) {
    const existing = await prisma.subscription.findFirst({
      where: {
        userId: userUserId,
        idempotencyKey,
        status: "created",
      },
    });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Existing subscription order returned",
        data: {
          orderId: existing.gatewayOrderId,
          amount: existing.amount * 100, // in paise for Razorpay SDK
          currency: existing.currency,
          subscriptionId: existing.id,
          keyId: env.razorpayKeyId,
          plan,
          planLabel: planConfig.label,
        },
      });
    }
  }

  // Prevent duplicate active subscription
  const activeSub = await prisma.subscription.findFirst({
    where: {
      userId: userUserId,
      status: "active",
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  });

  if (activeSub) {
    throw new ApiError(400, `You already have an active ${PLAN_CONFIG[activeSub.plan]?.label || "Pro"} subscription.`);
  }

  const amountPaise = amount * 100;
  // Razorpay receipt must be ≤ 40 chars
  const shortUserId = String(userUserId).slice(-8);
  const shortTs = String(Date.now()).slice(-8);
  const receipt = `sub_${shortUserId}_${shortTs}_${crypto.randomBytes(2).toString("hex")}`;
  const key = idempotencyKey || receipt;

  const razorpayOrder = await createRazorpayOrder({
    amountPaise,
    currency: targetCurrency,
    receipt,
    notes: {
      userId: String(userUserId),
      plan,
      planLabel: planConfig.label,
    },
  });

  const subscription = await prisma.subscription.create({
    data: {
      userId: userUserId,
      plan,
      amount,
      currency: targetCurrency,
      gatewayOrderId: razorpayOrder.id,
      idempotencyKey: key,
      status: "created",
      timeline: {
        create: [
          {
            event: "order_created",
            status: "created",
            note: `Razorpay order created for ${planConfig.label} in ${targetCurrency}`,
            metadata: { razorpayOrderId: razorpayOrder.id, amountPaise },
          },
        ],
      },
    },
  });

  logger.reqInfo(req, "subscription_order_created", {
    subscriptionId: subscription.id,
    userId: userUserId,
    plan,
    amount: planConfig.amount,
  });

  res.status(201).json({
    success: true,
    message: "Subscription order created successfully",
    data: {
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount, // paise
      currency: razorpayOrder.currency,
      subscriptionId: subscription.id,
      keyId: env.razorpayKeyId,
      plan,
      planLabel: planConfig.label,
    },
  });
});

const verifySubscriptionPayment = catchAsync(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, subscriptionId } = req.validatedBody;
  const userUserId = req.user.id || req.user._id;

  if (!isValidUuid(subscriptionId)) {
    throw new ApiError(400, "Invalid subscription id");
  }

  const isValid = verifyRazorpayPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!isValid) {
    logger.reqWarn(req, "subscription_verify_signature_invalid", { razorpayOrderId, razorpayPaymentId });
    throw new ApiError(400, "Payment signature verification failed. Possible fraud attempt.");
  }

  const subscription = await prisma.subscription.findFirst({
    where: {
      id: subscriptionId,
      userId: userUserId,
      gatewayOrderId: razorpayOrderId,
    },
  });

  if (!subscription) {
    throw new ApiError(404, "Subscription order not found or does not belong to you.");
  }

  if (subscription.status === "active") {
    return res.status(200).json({
      success: true,
      message: "Subscription already active",
      data: { subscription },
    });
  }

  const planConfig = PLAN_CONFIG[subscription.plan];
  const now = new Date();
  const expiresAt = new Date(now.getTime() + planConfig.durationDays * 24 * 60 * 60 * 1000);

  const updatedSubscription = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "active",
      gatewayPaymentId: razorpayPaymentId,
      expiresAt: expiresAt,
      timeline: {
        create: [
          {
            event: "payment_verified",
            status: "active",
            note: `Payment verified. ${planConfig.label} activated until ${expiresAt.toISOString().split("T")[0]}`,
            metadata: { razorpayOrderId, razorpayPaymentId, expiresAt },
          },
        ],
      },
    },
  });

  logger.reqInfo(req, "subscription_activated", {
    subscriptionId: updatedSubscription.id,
    userId: userUserId,
    plan: updatedSubscription.plan,
    expiresAt,
  });

  res.status(200).json({
    success: true,
    message: `${planConfig.label} subscription activated successfully!`,
    data: {
      subscription: {
        id: updatedSubscription.id,
        plan: updatedSubscription.plan,
        planLabel: planConfig.label,
        amount: updatedSubscription.amount,
        currency: updatedSubscription.currency,
        status: updatedSubscription.status,
        expiresAt: updatedSubscription.expiresAt,
        activatedAt: now,
      },
    },
  });
});

const getMySubscription = catchAsync(async (req, res) => {
  const userUserId = req.user.id || req.user._id;

  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: userUserId,
      status: "active",
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    select: {
      id: true,
      plan: true,
      amount: true,
      currency: true,
      status: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  res.status(200).json({
    success: true,
    message: subscription ? "Active subscription found" : "No active subscription",
    data: {
      subscription: subscription
        ? {
            id: subscription.id,
            plan: subscription.plan,
            planLabel: PLAN_CONFIG[subscription.plan]?.label || subscription.plan,
            amount: subscription.amount,
            currency: subscription.currency,
            status: subscription.status,
            expiresAt: subscription.expiresAt,
            createdAt: subscription.createdAt,
          }
        : null,
    },
  });
});

module.exports = {
  createSubscriptionOrder,
  verifySubscriptionPayment,
  getMySubscription,
};
