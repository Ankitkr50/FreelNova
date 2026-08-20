const { prisma } = require("../config/db");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/apiError");

// Helper to validate UUIDs
const isValidUuid = (id) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  title: true,
  message: true,
  entityType: true,
  entityId: true,
  metadata: true,
  isRead: true,
  readAt: true,
  createdAt: true,
  updatedAt: true,
};

const listMyNotifications = catchAsync(async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
  const unreadOnly = String(req.query.unreadOnly || "false").toLowerCase() === "true";
  const skip = (page - 1) * limit;
  const userUserId = req.user.id || req.user._id;

  const isSuperAdmin =
    req.user.role === "admin" ||
    req.user.email?.toLowerCase() === "fn.freelnova@gmail.com" ||
    req.user.adminRole === "SUPER_ADMIN" ||
    String(req.user.userCode || "").startsWith("AID");

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const where = {
    recipientId: userUserId,
    createdAt: { gte: sevenDaysAgo },
  };
  if (isSuperAdmin) {
    where.type = { not: "SYSTEM_BROADCAST" };
  }
  if (unreadOnly) {
    where.isRead = false;
  }

  const unreadWhere = { ...where, isRead: false };

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      select: NOTIFICATION_SELECT,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: unreadWhere }),
  ]);

  res.status(200).json({
    success: true,
    message: "Notifications fetched successfully",
    data: items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      unreadCount,
    },
  });
});

const markNotificationAsRead = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userUserId = req.user.id || req.user._id;

  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid notification id");
  }

  const notification = await prisma.notification.findFirst({
    where: {
      id,
      recipientId: userUserId,
    },
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  let updatedNotification = notification;

  if (!notification.isRead) {
    updatedNotification = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      select: NOTIFICATION_SELECT,
    });
  }

  res.status(200).json({
    success: true,
    message: "Notification marked as read",
    data: updatedNotification,
  });
});

const markAllNotificationsAsRead = catchAsync(async (req, res) => {
  const userUserId = req.user.id || req.user._id;

  await prisma.notification.updateMany({
    where: {
      recipientId: userUserId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  res.status(200).json({
    success: true,
    message: "All notifications marked as read successfully",
  });
});

const searchRecipients = catchAsync(async (req, res) => {
  const { q, role } = req.query;
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
    where.role = (role === "client" || role === "recruiter") ? "recruiter" : role.toLowerCase();
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      userCode: true,
      role: true,
    },
    take: 20,
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({
    success: true,
    data: users,
  });
});

const broadcastAnnouncement = catchAsync(async (req, res) => {
  const { title, message, targetType = "ALL", recipientIds = [] } = req.body;

  if (!message || !String(message).trim()) {
    throw new ApiError(400, "Announcement message is required.");
  }

  const isSuperAdmin =
    req.user.role === "admin" ||
    req.user.email?.toLowerCase() === "fn.freelnova@gmail.com" ||
    req.user.adminRole === "SUPER_ADMIN" ||
    String(req.user.userCode || "").startsWith("AID");

  if (!isSuperAdmin) {
    throw new ApiError(403, "Forbidden: Only Super Administrators can send notifications.");
  }

  let finalRecipientIds = [];

  if (targetType === "SELECTED" || targetType === "INDIVIDUAL") {
    if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
      throw new ApiError(400, "Please select at least one recipient user.");
    }
    const validUsers = await prisma.user.findMany({
      where: { id: { in: recipientIds } },
      select: { id: true },
    });
    finalRecipientIds = validUsers.map((u) => u.id);
  } else if (targetType === "FREELANCER") {
    const users = await prisma.user.findMany({
      where: { role: "freelancer" },
      select: { id: true },
    });
    finalRecipientIds = users.map((u) => u.id);
  } else if (targetType === "CLIENT" || targetType === "RECRUITER") {
    const users = await prisma.user.findMany({
      where: { role: "recruiter" },
      select: { id: true },
    });
    finalRecipientIds = users.map((u) => u.id);
  } else if (targetType === "PRO") {
    const users = await prisma.user.findMany({
      where: {
        subscriptions: {
          some: {
            status: "active",
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        },
      },
      select: { id: true },
    });
    finalRecipientIds = users.map((u) => u.id);
  } else {
    // Default: "ALL"
    const users = await prisma.user.findMany({
      select: { id: true },
    });
    finalRecipientIds = users.map((u) => u.id);
  }

  // Exclude the sender (Super Admin) from receiving their own notification broadcast
  const senderId = req.user.id || req.user._id;
  finalRecipientIds = finalRecipientIds.filter((id) => id !== senderId);

  if (finalRecipientIds.length === 0) {
    return res.status(200).json({
      success: true,
      message: "No matching registered users found for the selected target scope.",
      data: { totalRecipients: 0 },
    });
  }

  const { dispatchNotification } = require("../services/notification.service");
  const senderName = req.user.name || "Super Admin";

  const noticeTitle = title && String(title).trim() ? String(title).trim() : "FreelNova Platform Notice";

  const notifications = await dispatchNotification({
    recipientIds: finalRecipientIds,
    type: "SYSTEM_BROADCAST",
    title: noticeTitle.replace(/^📢\s*/, "").trim(),
    message: String(message).trim(),
    entityType: "BROADCAST",
    metadata: {
      sender: senderName,
      senderEmail: req.user.email,
      targetType,
      broadcastAt: new Date().toISOString(),
    },
  });

  res.status(200).json({
    success: true,
    message: `Notification dispatched to ${finalRecipientIds.length} user(s) successfully!`,
    data: {
      totalRecipients: finalRecipientIds.length,
      notificationsSent: notifications.length,
    },
  });
});

module.exports = {
  listMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  broadcastAnnouncement,
  searchRecipients,
};
