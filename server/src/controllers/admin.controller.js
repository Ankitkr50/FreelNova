const { prisma } = require("../config/db");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/apiError");
const logger = require("../utils/logger");
const { userCache } = require("../middleware/auth.middleware");
const { logAdminAction } = require("../services/audit.service");
const { AUDIT_ACTIONS } = require("../constants/permissions");

// Helper to validate UUIDs
const isValidUuid = (id) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

const parsePagination = (query) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const applyDateFilterToWhere = (query, where) => {
  const { date, range } = query;
  if (date) {
    const targetDateStr = String(date).trim();
    const end = new Date(`${targetDateStr}T23:59:59.999Z`);
    let start;
    if (range === "last_10_days") {
      start = new Date(end.getTime() - 10 * 24 * 60 * 60 * 1000);
    } else if (range === "last_15_days") {
      start = new Date(end.getTime() - 15 * 24 * 60 * 60 * 1000);
    } else if (range === "last_30_days") {
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      start = new Date(`${targetDateStr}T00:00:00.000Z`);
    }
    where.createdAt = {
      gte: start,
      lte: end,
    };
  }
};

const adminListUsers = catchAsync(async (req, res) => {
  const { q, role, moderationStatus, sort = "newest" } = req.query;
  const { page, limit, skip } = parsePagination(req.query);

  const where = {};
  if (q) {
    const queryStr = String(q).trim();
    const cleanUsername = queryStr.replace(/^@/, "");
    const upperCode = queryStr.toUpperCase();
    where.OR = [
      { name: { contains: queryStr, mode: "insensitive" } },
      { email: { contains: queryStr, mode: "insensitive" } },
      { username: { contains: cleanUsername.toLowerCase(), mode: "insensitive" } },
      { userCode: { contains: upperCode, mode: "insensitive" } },
    ];
  }
  if (role) {
    where.role = role.trim().toLowerCase();
  }
  if (moderationStatus) {
    where.moderationStatus = moderationStatus.trim().toLowerCase();
  }

  applyDateFilterToWhere(req.query, where);

  const sortMap = {
    newest: { createdAt: "desc" },
    oldest: { createdAt: "asc" },
    rating_high: { ratingAvg: "desc" },
    rating_low: { ratingAvg: "asc" },
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        userCode: true,
        role: true,
        adminRole: true,
        customRoleTitle: true,
        adminPermissions: true,
        staffStatus: true,
        moderationStatus: true,
        moderationNote: true,
        fineAmount: true,
        fineStatus: true,
        fineReason: true,
        moderatedBy: true,
        moderatedAt: true,
        ratingAvg: true,
        ratingCount: true,
        isEmailVerified: true,
        isVerified: true,
        profileCompleted: true,
        createdAt: true,
        updatedAt: true,
        subscriptions: {
          where: {
            status: "active",
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
          select: {
            plan: true,
          },
        },
      },
      orderBy: sortMap[sort] || sortMap.newest,
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  res.status(200).json({
    success: true,
    message: "Admin users fetched successfully",
    data: items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  });

  logger.reqInfo(req, "admin_users_listed", { page, limit, total });
});

const adminUpdateUserStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const adminUserId = req.user.id || req.user._id;

  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid user id");
  }

  const { moderationStatus, moderationNote, isVerified, fineAmount, fineStatus, fineReason, username } = req.body || {};
  const updateData = {};
  if (moderationStatus !== undefined) updateData.moderationStatus = moderationStatus;
  if (moderationNote !== undefined) updateData.moderationNote = moderationNote;
  if (isVerified !== undefined) updateData.isVerified = isVerified;
  if (fineAmount !== undefined) updateData.fineAmount = Number(fineAmount) || 0;
  if (fineStatus !== undefined) updateData.fineStatus = fineStatus;
  if (fineReason !== undefined) updateData.fineReason = fineReason;

  if (username !== undefined) {
    const formattedUsername = username ? String(username).toLowerCase().trim().replace(/^@/, "") : null;
    if (formattedUsername) {
      if (!/^[a-z0-9_-]{3,30}$/.test(formattedUsername)) {
        throw new ApiError(400, "Username must be 3-30 characters long and contain only lowercase letters, numbers, underscores, or hyphens.");
      }
      const existingUsername = await prisma.user.findFirst({
        where: {
          username: { equals: formattedUsername, mode: "insensitive" },
          id: { not: id },
        },
      });
      if (existingUsername) {
        throw new ApiError(409, "Username is already taken by another user");
      }
      updateData.username = formattedUsername;
    } else {
      updateData.username = null;
    }
  }

  updateData.moderatedBy = adminUserId;
  updateData.moderatedAt = new Date();

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isVerified: true,
      moderationStatus: true,
      moderationNote: true,
      fineAmount: true,
      fineStatus: true,
      fineReason: true,
      moderatedBy: true,
      moderatedAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Send system notification if fine is issued/pending
  if (fineStatus === "PENDING" || (updateData.fineAmount > 0 && fineStatus !== "PAID" && fineStatus !== "WAIVED")) {
    await prisma.notification.create({
      data: {
        recipientId: id,
        type: "ACCOUNT_FINE_ISSUED",
        title: `⚠️ Fine Notice (₹${updateData.fineAmount || 5000})`,
        message: fineReason || "An administrative fine of ₹5,000 has been issued to your account for policy violation (e.g. sharing off-platform contact details). Clear the fine to restore access.",
        metadata: { fineAmount: updateData.fineAmount || 5000, fineReason: fineReason || "" },
      },
    }).catch(() => {});
  }

  // Evict user from cache so authorization gates re-verify status on next request
  await userCache.del(id);

  let auditAction = AUDIT_ACTIONS.USER_UPDATED;
  if (moderationStatus === "suspended") auditAction = AUDIT_ACTIONS.USER_SUSPENDED;
  if (moderationStatus === "blocked") auditAction = AUDIT_ACTIONS.USER_BLOCKED;
  if (moderationStatus === "active" && user.moderationStatus === "active") auditAction = AUDIT_ACTIONS.USER_UNBLOCKED;

  await logAdminAction({
    req,
    action: auditAction,
    targetType: "USER",
    targetId: id,
    metadata: {
      userEmail: user.email,
      userName: user.name,
      moderationStatus: user.moderationStatus,
      isVerified: user.isVerified,
      note: moderationNote || "",
    },
  });

  res.status(200).json({
    success: true,
    message: "User moderation status updated",
    data: user,
  });

  logger.reqInfo(req, "admin_user_moderated", {
    targetUserId: id,
    moderationStatus: moderationStatus || "active",
  });
});

const adminListProjects = catchAsync(async (req, res) => {
  const { q, status, moderationStatus, category, recruiterId, sort = "newest" } = req.query;
  const { page, limit, skip } = parsePagination(req.query);

  const where = {};
  if (q) {
    const queryStr = String(q).trim();
    where.OR = [
      { title: { contains: queryStr, mode: "insensitive" } },
      { description: { contains: queryStr, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status.trim().toLowerCase();
  if (moderationStatus) where.moderationStatus = moderationStatus.trim().toLowerCase();
  if (category) where.category = { equals: category.trim(), mode: "insensitive" };
  if (recruiterId && isValidUuid(recruiterId)) {
    where.recruiterId = recruiterId;
  }

  applyDateFilterToWhere(req.query, where);

  const sortMap = {
    newest: { createdAt: "desc" },
    oldest: { createdAt: "asc" },
    budget_high: { budgetMax: "desc" },
    budget_low: { budgetMin: "asc" },
  };

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        moderationStatus: true,
        moderationNote: true,
        recruiterId: true,
        selectedFreelancer: true,
        budgetMin: true,
        budgetMax: true,
        currency: true,
        applicationCount: true,
        createdAt: true,
        updatedAt: true,
        recruiter: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: sortMap[sort] || sortMap.newest,
      skip,
      take: limit,
    }),
    prisma.project.count({ where }),
  ]);

  const mapped = items.map((item) => {
    const mappedItem = { ...item, recruiterId: item.recruiter };
    delete mappedItem.recruiter;
    return mappedItem;
  });

  res.status(200).json({
    success: true,
    message: "Admin projects fetched successfully",
    data: mapped,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  });

  logger.reqInfo(req, "admin_projects_listed", { page, limit, total });
});

const adminModerateProject = catchAsync(async (req, res) => {
  const { id } = req.params;
  const adminUserId = req.user.id || req.user._id;

  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid project id");
  }

  const { moderationStatus, moderationNote } = req.validatedBody;

  const project = await prisma.project.update({
    where: { id },
    data: {
      moderationStatus,
      moderationNote,
      moderatedBy: adminUserId,
      moderatedAt: new Date(),
    },
    select: {
      id: true,
      title: true,
      status: true,
      moderationStatus: true,
      moderationNote: true,
      moderatedBy: true,
      moderatedAt: true,
      recruiterId: true,
      updatedAt: true,
    },
  });

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  await logAdminAction({
    req,
    action: AUDIT_ACTIONS.PROJECT_MODERATED,
    targetType: "PROJECT",
    targetId: id,
    metadata: {
      projectTitle: project.title,
      moderationStatus: project.moderationStatus,
      moderationNote: project.moderationNote || "",
    },
  });

  res.status(200).json({
    success: true,
    message: "Project moderation updated",
    data: project,
  });

  logger.reqInfo(req, "admin_project_moderated", {
    projectId: id,
    moderationStatus,
  });
});

const adminListPayments = catchAsync(async (req, res) => {
  const {
    status,
    escrowStatus,
    reviewStatus,
    recruiterId,
    freelancerId,
    projectId,
    sort = "newest",
  } = req.query;
  const { page, limit, skip } = parsePagination(req.query);

  const where = {};
  if (status) where.status = status.trim().toLowerCase();
  if (escrowStatus) where.escrowStatus = escrowStatus.trim().toLowerCase();
  if (reviewStatus) where.reviewStatus = reviewStatus.trim().toLowerCase();
  if (recruiterId && isValidUuid(recruiterId)) where.recruiterId = recruiterId;
  if (freelancerId && isValidUuid(freelancerId)) where.freelancerId = freelancerId;
  if (projectId && isValidUuid(projectId)) where.projectId = projectId;

  applyDateFilterToWhere(req.query, where);

  const sortMap = {
    newest: { createdAt: "desc" },
    oldest: { createdAt: "asc" },
    amount_high: { amount: "desc" },
    amount_low: { amount: "asc" },
  };

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      select: {
        id: true,
        projectId: true,
        recruiterId: true,
        freelancerId: true,
        amount: true,
        currency: true,
        status: true,
        escrowStatus: true,
        reviewStatus: true,
        reviewNote: true,
        reviewedBy: true,
        reviewedAt: true,
        gatewayOrderId: true,
        gatewayPaymentId: true,
        createdAt: true,
        updatedAt: true,
        recruiter: { select: { id: true, name: true, email: true, username: true, role: true } },
        freelancer: { select: { id: true, name: true, email: true, username: true, role: true } },
        project: { select: { id: true, title: true, projectCode: true, status: true, category: true } },
      },
      orderBy: sortMap[sort] || sortMap.newest,
      skip,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  const mapped = items.map((item) => {
    const mappedItem = {
      ...item,
      recruiterId: item.recruiter,
      freelancerId: item.freelancer,
      projectRelation: item.project,
    };
    delete mappedItem.recruiter;
    delete mappedItem.freelancer;
    delete mappedItem.project;
    return mappedItem;
  });

  res.status(200).json({
    success: true,
    message: "Admin payments fetched successfully",
    data: mapped,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  });

  logger.reqInfo(req, "admin_payments_listed", { page, limit, total });
});

const adminReviewPayment = catchAsync(async (req, res) => {
  const { id } = req.params;
  const adminUserId = req.user.id || req.user._id;

  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid payment id");
  }

  const { reviewStatus, reviewNote } = req.validatedBody;

  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) {
    throw new ApiError(404, "Payment not found");
  }

  const updatedPayment = await prisma.payment.update({
    where: { id },
    data: {
      reviewStatus,
      reviewNote,
      reviewedBy: adminUserId,
      reviewedAt: new Date(),
      timeline: {
        create: [
          {
            event: "admin_payment_review",
            status: payment.status,
            note: reviewNote || "Payment reviewed by admin",
            metadata: { reviewStatus, reviewedBy: adminUserId },
          },
        ],
      },
    },
    include: {
      timeline: true,
    },
  });

  await logAdminAction({
    req,
    action: AUDIT_ACTIONS.PAYMENT_UPDATED,
    targetType: "PAYMENT",
    targetId: id,
    metadata: {
      reviewStatus,
      reviewNote: reviewNote || "",
      amount: updatedPayment.amount,
      currency: updatedPayment.currency,
    },
  });

  res.status(200).json({
    success: true,
    message: "Payment review updated",
    data: updatedPayment,
  });

  logger.reqInfo(req, "admin_payment_reviewed", {
    paymentId: id,
    reviewStatus,
  });
});

const adminCreateDispute = catchAsync(async (req, res) => {
  const payload = req.validatedBody;
  const adminUserId = req.user.id || req.user._id;

  const dispute = await prisma.dispute.create({
    data: {
      projectId: payload.projectId,
      paymentId: payload.paymentId || null,
      raisedBy: payload.raisedBy || adminUserId,
      againstUserId: payload.againstUserId || null,
      type: payload.type,
      reason: payload.reason,
      priority: payload.priority,
      status: "open",
      assignedAdminId: adminUserId,
      timeline: {
        create: [
          {
            event: "dispute_created",
            note: "Dispute created by admin",
            actorId: adminUserId,
          },
        ],
      },
    },
  });

  res.status(201).json({
    success: true,
    message: "Dispute created successfully",
    data: dispute,
  });

  logger.reqInfo(req, "admin_dispute_created", {
    disputeId: dispute.id,
    projectId: payload.projectId,
    priority: payload.priority,
  });
});

const adminListDisputes = catchAsync(async (req, res) => {
  const { q, status, priority, type, projectId, paymentId, sort = "newest" } = req.query;
  const { page, limit, skip } = parsePagination(req.query);

  const where = {};
  if (status) where.status = status.trim().toLowerCase();
  if (priority) where.priority = priority.trim().toLowerCase();
  if (type) where.type = type.trim().toLowerCase();
  if (projectId && isValidUuid(projectId)) where.projectId = projectId;
  if (paymentId && isValidUuid(paymentId)) where.paymentId = paymentId;
  if (q) {
    where.reason = { contains: String(q).trim(), mode: "insensitive" };
  }

  applyDateFilterToWhere(req.query, where);

  const sortMap = {
    newest: { createdAt: "desc" },
    oldest: { createdAt: "asc" },
  };

  const [items, total] = await Promise.all([
    prisma.dispute.findMany({
      where,
      orderBy: sortMap[sort] || sortMap.newest,
      skip,
      take: limit,
      select: {
        id: true,
        projectId: true,
        paymentId: true,
        raisedBy: true,
        againstUserId: true,
        type: true,
        reason: true,
        status: true,
        priority: true,
        resolutionNote: true,
        assignedAdminId: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
        project: { select: { id: true, title: true, status: true } },
        payment: { select: { id: true, amount: true, currency: true, status: true } },
        raiser: { select: { id: true, name: true, email: true, role: true } },
        againstUser: { select: { id: true, name: true, email: true, role: true } },
        admin: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.dispute.count({ where }),
  ]);

  const mapped = items.map((item) => {
    const mappedItem = {
      ...item,
      projectId: item.project,
      paymentId: item.payment,
      raisedBy: item.raiser,
      againstUserId: item.againstUser,
      assignedAdminId: item.admin,
    };
    delete mappedItem.project;
    delete mappedItem.payment;
    delete mappedItem.raiser;
    delete mappedItem.againstUser;
    delete mappedItem.admin;
    return mappedItem;
  });

  res.status(200).json({
    success: true,
    message: "Admin disputes fetched successfully",
    data: mapped,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  });

  logger.reqInfo(req, "admin_disputes_listed", { page, limit, total });
});

const adminPatchDispute = catchAsync(async (req, res) => {
  const { id } = req.params;
  const adminUserId = req.user.id || req.user._id;

  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid dispute id");
  }

  const dispute = await prisma.dispute.findUnique({ where: { id } });
  if (!dispute) {
    throw new ApiError(404, "Dispute not found");
  }

  const { status, priority, resolutionNote, assignedAdminId } = req.validatedBody;

  const dataToUpdate = {};
  if (status) dataToUpdate.status = status;
  if (priority) dataToUpdate.priority = priority;
  if (resolutionNote) dataToUpdate.resolutionNote = resolutionNote;
  if (assignedAdminId) dataToUpdate.assignedAdminId = assignedAdminId;
  else if (!dispute.assignedAdminId) dataToUpdate.assignedAdminId = adminUserId;

  if (status && ["resolved", "closed", "rejected"].includes(status)) {
    dataToUpdate.resolvedAt = new Date();
  }

  const updatedDispute = await prisma.dispute.update({
    where: { id },
    data: {
      ...dataToUpdate,
      timeline: {
        create: [
          {
            event: "dispute_updated",
            note: `Admin updated dispute${status ? ` to ${status}` : ""}`,
            actorId: adminUserId,
          },
        ],
      },
    },
  });

  await logAdminAction({
    req,
    action: AUDIT_ACTIONS.DISPUTE_RESOLVED,
    targetType: "DISPUTE",
    targetId: id,
    metadata: {
      status: updatedDispute.status,
      priority: updatedDispute.priority,
      resolutionNote: resolutionNote || "",
    },
  });

  res.status(200).json({
    success: true,
    message: "Dispute updated successfully",
    data: updatedDispute,
  });

  logger.reqInfo(req, "admin_dispute_updated", {
    disputeId: id,
    status: status || null,
    priority: priority || null,
  });
});

const adminGetIntelligence = catchAsync(async (req, res) => {
  const { date, range = "single_date" } = req.query;
  const targetDateStr = date || new Date().toISOString().slice(0, 10);
  
  let startOfDay;
  const endOfDay = new Date(`${targetDateStr}T23:59:59.999Z`);

  if (range === "last_10_days") {
    startOfDay = new Date(endOfDay.getTime() - 10 * 24 * 60 * 60 * 1000);
  } else if (range === "last_15_days") {
    startOfDay = new Date(endOfDay.getTime() - 15 * 24 * 60 * 60 * 1000);
  } else if (range === "last_30_days") {
    startOfDay = new Date(endOfDay.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else {
    startOfDay = new Date(`${targetDateStr}T00:00:00.000Z`);
  }

  // 1. Financial Metrics
  const payments = await prisma.payment.findMany({
    select: {
      amount: true,
      status: true,
      escrowStatus: true,
      recruiter: {
        select: {
          subscriptions: {
            where: {
              status: "active",
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
              ],
            },
            select: { id: true },
          },
        },
      },
      freelancer: {
        select: {
          subscriptions: {
            where: {
              status: "active",
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
              ],
            },
            select: { id: true },
          },
        },
      },
    },
  });

  let totalTurnover = 0;
  let activeEscrow = 0;
  let releasedPayouts = 0;
  let platformRevenue = 0;

  payments.forEach(p => {
    const hasDiscount = (p.recruiter?.subscriptions?.length || 0) > 0 || (p.freelancer?.subscriptions?.length || 0) > 0;
    const rate = hasDiscount ? 0.10 : 0.15;

    if (p.status === "captured") {
      totalTurnover += p.amount;
      platformRevenue += p.amount * rate;
    }
    if (p.escrowStatus === "held_in_escrow") {
      activeEscrow += p.amount;
    }
    if (p.escrowStatus === "released") {
      releasedPayouts += p.amount;
    }
  });

  // Calculate weekly growth rate of platform turnover (comparing past 7 days vs previous 7 days)
  const nowTime = new Date();
  const sevenDaysAgo = new Date(nowTime.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(nowTime.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [currentWeekPayments, previousWeekPayments] = await Promise.all([
    prisma.payment.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
          lte: nowTime
        },
        status: "captured"
      },
      select: { amount: true }
    }),
    prisma.payment.findMany({
      where: {
        createdAt: {
          gte: fourteenDaysAgo,
          lte: sevenDaysAgo
        },
        status: "captured"
      },
      select: { amount: true }
    })
  ]);

  const currentWeekVol = currentWeekPayments.reduce((sum, p) => sum + p.amount, 0);
  const previousWeekVol = previousWeekPayments.reduce((sum, p) => sum + p.amount, 0);

  let growthPercent = 0;
  if (previousWeekVol > 0) {
    growthPercent = ((currentWeekVol - previousWeekVol) / previousWeekVol) * 100;
  } else if (currentWeekVol > 0) {
    growthPercent = 100;
  }
  const turnoverGrowthPercent = Math.round(growthPercent * 10) / 10;

  // 2. Query System Timelines / Audit Trails
  const [paymentLogs, subscriptionLogs, disputeLogs] = await Promise.all([
    prisma.paymentTimeline.findMany({
      take: 15,
      orderBy: { createdAt: "desc" },
      include: {
        payment: {
          select: {
            gatewayOrderId: true,
            amount: true
          }
        }
      }
    }),
    prisma.subscriptionTimeline.findMany({
      take: 15,
      orderBy: { createdAt: "desc" },
      include: {
        subscription: {
          select: {
            plan: true,
            amount: true
          }
        }
      }
    }),
    prisma.disputeTimeline.findMany({
      take: 15,
      orderBy: { createdAt: "desc" }
    })
  ]);

  const auditLogs = [];

  paymentLogs.forEach(log => {
    auditLogs.push({
      id: log.id,
      category: "payment",
      event: log.event,
      status: log.status,
      note: log.note || `Payment of INR ${log.payment?.amount || 0} modified`,
      createdAt: log.createdAt
    });
  });

  subscriptionLogs.forEach(log => {
    auditLogs.push({
      id: log.id,
      category: "subscription",
      event: log.event,
      status: log.status,
      note: log.note || `Subscription plan ${log.subscription?.plan || "Pro"} updated`,
      createdAt: log.createdAt
    });
  });

  disputeLogs.forEach(log => {
    auditLogs.push({
      id: log.id,
      category: "dispute",
      event: log.event,
      note: log.note || `Dispute timeline event: ${log.event}`,
      createdAt: log.createdAt
    });
  });

  auditLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const topAuditLogs = auditLogs.slice(0, 25);

  const [openDisputes, resolvedDisputes] = await Promise.all([
    prisma.dispute.count({ where: { status: "open" } }),
    prisma.dispute.count({ where: { status: "resolved" } })
  ]);

  // 3. Date-Specific Live Daily Analytics
  const [dailyUsers, dailyProjects, dailyPayments] = await Promise.all([
    prisma.user.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    }),
    prisma.project.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      select: {
        id: true,
        title: true,
        category: true,
        budgetMin: true,
        budgetMax: true,
        currency: true,
        createdAt: true
      }
    }),
    prisma.payment.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      select: {
        id: true,
        amount: true,
        status: true,
        escrowStatus: true,
        createdAt: true
      }
    })
  ]);

  const policyViolations = await prisma.notification.findMany({
    where: { type: "policy_violation" },
    orderBy: { createdAt: "desc" },
    take: 30
  });

  res.status(200).json({
    success: true,
    data: {
      metrics: {
        totalTurnover,
        platformRevenue,
        activeEscrow,
        releasedPayouts,
        turnoverGrowthPercent
      },
      auditLogs: topAuditLogs,
      disputes: {
        open: openDisputes,
        resolved: resolvedDisputes
      },
      policyViolations,
      dailyAnalytics: {
        date: targetDateStr,
        range,
        users: dailyUsers,
        projects: dailyProjects,
        payments: dailyPayments,
        summary: {
          newUsersCount: dailyUsers.length,
          newProjectsCount: dailyProjects.length,
          paymentsCount: dailyPayments.length,
          paymentsVolume: dailyPayments.reduce((sum, p) => sum + p.amount, 0)
        }
      }
    }
  });
});

const adminGetUserDetails = catchAsync(async (req, res) => {
  const { id } = req.params;

  const cleanQuery = String(id).replace(/^@/, "").trim();
  const upperQuery = cleanQuery.toUpperCase();
  const userWhere = isValidUuid(cleanQuery)
    ? { id: cleanQuery }
    : {
        OR: [
          { userCode: { equals: upperQuery, mode: "insensitive" } },
          { username: { equals: cleanQuery.toLowerCase(), mode: "insensitive" } },
          { email: { equals: cleanQuery.toLowerCase(), mode: "insensitive" } },
          { name: { contains: cleanQuery, mode: "insensitive" } },
        ],
      };

  const user = await prisma.user.findFirst({
    where: userWhere,
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      userCode: true,
      role: true,
      adminRole: true,
      adminPermissions: true,
      staffStatus: true,
      moderationStatus: true,
      moderationNote: true,
      category: true,
      profileCompleted: true,
      isVerified: true,
      phone: true,
      schoolOrCollege: true,
      schoolResult: true,
      schoolIdCard: true,
      aadhaarCard: true,
      aadhaarCardPhoto: true,
      passportOrNationalId: true,
      passportPhoto: true,
      taxIdNumber: true,
      swiftBic: true,
      ibanAccountNo: true,
      timezone: true,
      panCard: true,
      bankAccountNo: true,
      bankIfsc: true,
      bankName: true,
      bankHolderName: true,
      upiId: true,
      companyName: true,
      companyId: true,
      createdAt: true,
      subscriptions: {
        select: {
          id: true,
          plan: true,
          status: true,
          expiresAt: true,
          createdAt: true,
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  let projects = [];
  let payments = [];
  let totalVolume = 0;

  if (user.role === "recruiter") {
    projects = await prisma.project.findMany({
      where: { recruiterId: user.id },
      select: {
        id: true,
        projectCode: true,
        title: true,
        status: true,
        budgetMin: true,
        budgetMax: true,
        currency: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    payments = await prisma.payment.findMany({
      where: { recruiterId: user.id },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        escrowStatus: true,
        gatewayPaymentId: true,
        createdAt: true,
        project: {
          select: {
            title: true,
            projectCode: true,
          },
        },
        freelancer: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    totalVolume = payments
      .filter((p) => p.status === "captured")
      .reduce((sum, p) => sum + p.amount, 0);
  } else if (user.role === "freelancer") {
    const applications = await prisma.application.findMany({
      where: { freelancerId: user.id },
      select: {
        id: true,
        status: true,
        createdAt: true,
        project: {
          select: {
            id: true,
            projectCode: true,
            title: true,
            status: true,
            budgetMin: true,
            budgetMax: true,
            currency: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    projects = applications.map((app) => ({
      id: app.project.id,
      projectCode: app.project.projectCode,
      title: app.project.title,
      applicationStatus: app.status,
      projectStatus: app.project.status,
      budgetMin: app.project.budgetMin,
      budgetMax: app.project.budgetMax,
      currency: app.project.currency,
      appliedAt: app.createdAt,
    }));

    payments = await prisma.payment.findMany({
      where: { freelancerId: user.id },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        escrowStatus: true,
        gatewayPaymentId: true,
        createdAt: true,
        project: {
          select: {
            title: true,
            projectCode: true,
          },
        },
        recruiter: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    totalVolume = payments
      .filter((p) => p.status === "captured")
      .reduce((sum, p) => sum + p.amount, 0);
  }

  // 360-Degree Connectors: Tickets, Disputes, Ledger & Sessions
  const [tickets, disputes, ledgerEntries, sessions] = await Promise.all([
    prisma.supportTicket.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        ticketNumber: true,
        category: true,
        priority: true,
        status: true,
        subject: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.dispute.findMany({
      where: { OR: [{ raisedBy: user.id }, { againstUserId: user.id }] },
      select: {
        id: true,
        type: true,
        reason: true,
        status: true,
        priority: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.financialLedger.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        ledgerId: true,
        transactionType: true,
        grossAmount: true,
        netAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.adminSession.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        ipAddress: true,
        browser: true,
        os: true,
        device: true,
        isRevoked: true,
        lastActiveAt: true,
      },
      orderBy: { lastActiveAt: "desc" },
      take: 10,
    }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      user,
      projects,
      payments,
      totalVolume,
      tickets,
      disputes,
      ledgerEntries,
      sessions,
    },
  });
});

const adminGetProjectDetails = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid project id");
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      recruiter: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          companyName: true,
          ratingAvg: true,
          isVerified: true,
        },
      },
      freelancer: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          ratingAvg: true,
          isVerified: true,
        },
      },
      applications: {
        include: {
          freelancer: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
              ratingAvg: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      payments: {
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          escrowStatus: true,
          gatewayPaymentId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  res.status(200).json({
    success: true,
    data: project,
  });
});

module.exports = {
  adminListUsers,
  adminUpdateUserStatus,
  adminListProjects,
  adminModerateProject,
  adminListPayments,
  adminReviewPayment,
  adminCreateDispute,
  adminListDisputes,
  adminPatchDispute,
  adminGetIntelligence,
  adminGetUserDetails,
  adminGetProjectDetails,
};
