const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { prisma } = require("../config/db");
const ApiError = require("../utils/apiError");
const catchAsync = require("../utils/catchAsync");
const env = require("../config/env");
const { userCache } = require("../middleware/auth.middleware");
const { sendEmail, isEmailConfigured, buildFreelNovaEmailHtml } = require("../services/email.service");
const { logAdminAction } = require("../services/audit.service");
const { dispatchNotification } = require("../services/notification.service");
const sessionService = require("../services/session.service");
const { resequenceUserPools, generateNextUserCodeAtomic } = require("../services/userCode.service");
const { signAccessToken, signRefreshToken } = require("../utils/jwt");
const {
  PERMISSIONS,
  ADMIN_ROLES,
  ROLE_PERMISSIONS,
  AUDIT_ACTIONS,
} = require("../constants/permissions");

// Helper to validate UUIDs
const isValidUuid = (id) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

const ensurePrimarySuperAdmin = (user) => {
  const isPrimary = user?.email === "fn.freelnova@gmail.com" || (user?.adminRole === ADMIN_ROLES.SUPER_ADMIN && !user?.customRoleTitle);
  if (!isPrimary) {
    throw new ApiError(403, "Only Primary Super Administrator can access Staff RBAC management.");
  }
};

/**
 * List all staff members and pending invitations.
 */
const listStaff = catchAsync(async (req, res) => {
  ensurePrimarySuperAdmin(req.user);
  const rawStaff = await prisma.user.findMany({
    where: {
      OR: [
        { role: "admin" },
        { adminRole: { not: null } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      adminRole: true,
      customRoleTitle: true,
      adminPermissions: true,
      staffStatus: true,
      lastLoginAt: true,
      createdAt: true,
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const staffMembers = rawStaff.map((s) => ({
    ...s,
    customRoleTitle: s.customRoleTitle || (s.adminRole === "CUSTOM" ? "Main Admin" : (s.adminRole ? String(s.adminRole).replace(/_/g, " ") : "SUPER ADMIN")),
  }));

  const pendingInvitations = await prisma.staffInvitation.findMany({
    where: {
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const summary = {
    totalStaff: staffMembers.length,
    activeStaff: staffMembers.filter((s) => s.staffStatus === "ACTIVE").length,
    suspendedStaff: staffMembers.filter((s) => s.staffStatus === "SUSPENDED").length,
    revokedStaff: staffMembers.filter((s) => s.staffStatus === "REVOKED").length,
    pendingInvites: pendingInvitations.length,
  };

  res.status(200).json({
    success: true,
    data: {
      staff: staffMembers,
      pendingInvitations,
      summary,
      roles: ADMIN_ROLES,
      availablePermissions: Object.values(PERMISSIONS),
      rolePermissions: ROLE_PERMISSIONS,
    },
  });
});

/**
 * Super Admin or Staff Manager invites a new employee.
 */
const inviteStaff = catchAsync(async (req, res) => {
  const { name, email, username, role, permissions = [] } = req.body;
  const currentAdmin = req.user;

  let targetUser = null;
  const formattedUsername = username ? String(username).toLowerCase().trim().replace(/^@/, "") : null;
  let formattedEmail = email ? String(email).toLowerCase().trim() : null;

  if (formattedUsername) {
    targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: formattedUsername },
          { email: formattedUsername },
        ],
      },
    });
    if (targetUser) {
      formattedEmail = targetUser.email;
    }
  }

  if (!formattedEmail) {
    if (email) {
      formattedEmail = String(email).toLowerCase().trim();
    } else {
      throw new ApiError(400, "Work email or platform Username is required to send invite");
    }
  }

  const finalName = name && String(name).trim() ? String(name).trim() : (targetUser?.name || formattedUsername || "Staff Member");
  const selectedRole = role || ADMIN_ROLES.SUPPORT_STAFF;

  const isCustomRole = selectedRole === ADMIN_ROLES.CUSTOM || !Object.values(ADMIN_ROLES).includes(selectedRole);

  // Security checks for assigning roles and permissions
  const isSuperAdmin =
    currentAdmin.adminRole === ADMIN_ROLES.SUPER_ADMIN ||
    (!currentAdmin.adminRole && (currentAdmin.email === "fn.freelnova@gmail.com" || currentAdmin.role === "admin"));

  if (selectedRole === ADMIN_ROLES.SUPER_ADMIN && !isSuperAdmin) {
    throw new ApiError(403, "Only a Super Admin can create another Super Admin");
  }

  // Determine final assigned permissions
  let finalPermissions = [];
  if (selectedRole === ADMIN_ROLES.SUPER_ADMIN) {
    finalPermissions = Object.values(PERMISSIONS);
  } else if (isCustomRole) {
    if (!Array.isArray(permissions) || permissions.length === 0) {
      throw new ApiError(400, "Custom role must have at least one permission assigned");
    }
    finalPermissions = permissions.filter((p) => Object.values(PERMISSIONS).includes(p));
  } else {
    finalPermissions = ROLE_PERMISSIONS[selectedRole] || [];
    // Allow appending extra permissions if specified
    if (Array.isArray(permissions) && permissions.length > 0) {
      const validExtra = permissions.filter((p) => Object.values(PERMISSIONS).includes(p));
      finalPermissions = Array.from(new Set([...finalPermissions, ...validExtra]));
    }
  }

  // Non-super-admins cannot grant permissions they do not possess
  if (!isSuperAdmin) {
    const requesterPermissions = currentAdmin.adminPermissions || [];
    const hasDisallowed = finalPermissions.some((p) => !requesterPermissions.includes(p));
    if (hasDisallowed) {
      throw new ApiError(403, "You cannot assign permissions that you do not hold yourself");
    }
  }

  // Check if existing user is already an admin
  const existingUser = targetUser || (await prisma.user.findUnique({
    where: { email: formattedEmail },
  }));

  if (existingUser && existingUser.role === "admin" && existingUser.staffStatus === "ACTIVE") {
    throw new ApiError(409, "A staff member with this username/email already exists and is active");
  }

  // Delete previous unused invitations for the same email
  await prisma.staffInvitation.deleteMany({
    where: {
      email: formattedEmail,
      usedAt: null,
    },
  });

  // Generate secure single-use invitation token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const isPresetRole = Object.values(ADMIN_ROLES).includes(selectedRole);
  const dbRole = isPresetRole ? selectedRole : ADMIN_ROLES.CUSTOM;
  const customTitle = String(selectedRole).trim();

  const invitation = await prisma.staffInvitation.create({
    data: {
      name: String(name).trim(),
      email: formattedEmail,
      role: dbRole,
      customRoleTitle: customTitle,
      permissions: finalPermissions,
      token,
      invitedById: currentAdmin.id,
      expiresAt,
    },
  });

  const clientBaseUrl = env.clientUrl || "http://localhost:5173";
  const inviteUrl = `${clientBaseUrl}/admin/accept-invite?token=${token}`;

  // Automatically send in-app notification to the target user if registered on platform
  if (existingUser) {
    await dispatchNotification({
      recipientIds: [existingUser.id],
      type: "SYSTEM_BROADCAST",
      title: "🎉 You've Been Invited to Join the Staff Team!",
      message: `Super Admin (${currentAdmin.name || "Admin"}) has invited you to join the FreelNova Staff Team as ${selectedRole.replace(/_/g, " ")}. Click the button below to accept your staff invitation.`,
      entityType: "STAFF_INVITE",
      entityId: invitation.id,
      metadata: {
        inviteUrl,
        token,
        role: selectedRole,
        sender: currentAdmin.name || "Super Admin",
      },
    }).catch((err) => console.warn("[Notification Fallback] Failed to dispatch staff invite notification:", err.message));
  }

  // Attempt sending invitation email
  if (isEmailConfigured()) {
    try {
      await sendEmail({
        to: formattedEmail,
        subject: "Staff Invitation — Join FreelNova Administration",
        text: `Hello ${name},\n\nYou have been invited to join the FreelNova administration team as ${selectedRole}.\n\nClick the link below to set up your password and access the Super Admin Panel:\n${inviteUrl}\n\nThis invitation expires in 7 days.\n\nBest regards,\nFreelNova Team`,
        html: buildFreelNovaEmailHtml({
          headline: "Congratulations — You're Invited to FreelNova Admin Team! 🎉",
          recipientName: name,
          introText: `You have been invited by <strong>${currentAdmin.name || "Super Admin"}</strong> to join the FreelNova administration team with the role of <strong>${selectedRole.replace(/_/g, " ")}</strong>. Please click the invitation link below to accept:`,
          codeLabel: "STAFF INVITATION LINK",
          codeValue: inviteUrl,
          copyInstruction: "Click or copy the URL above into your web browser to accept your staff invite.",
          whatsNextText: "After clicking the invitation link, you will set up your staff password and gain access to the Super Admin Panel.",
          securityNote: "This invitation link is single-use and will expire in 7 days.",
        }),
      });
    } catch (mailErr) {
      console.warn("[Email Fallback] Failed to send staff invitation email:", mailErr.message);
    }
  }

  // Record audit log
  await logAdminAction({
    req,
    action: AUDIT_ACTIONS.STAFF_INVITED,
    targetType: "STAFF_INVITATION",
    targetId: invitation.id,
    metadata: {
      name,
      email: formattedEmail,
      role: selectedRole,
      permissionsCount: finalPermissions.length,
    },
  });

  res.status(201).json({
    success: true,
    message: `Invitation successfully sent to ${formattedEmail}`,
    data: {
      invitationId: invitation.id,
      email: formattedEmail,
      role: selectedRole,
      inviteUrl,
      expiresAt,
    },
  });
});

/**
 * Validate invitation token for employee password setup.
 */
const getInvitationDetails = catchAsync(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    throw new ApiError(400, "Invitation token is required");
  }

  const invitation = await prisma.staffInvitation.findUnique({
    where: { token },
    include: {
      invitedBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!invitation) {
    throw new ApiError(404, "Invalid or unrecognized invitation link");
  }

  if (invitation.usedAt) {
    throw new ApiError(400, "This invitation link has already been used");
  }

  if (new Date() > new Date(invitation.expiresAt)) {
    throw new ApiError(400, "This invitation link has expired. Please request a new invitation");
  }

  res.status(200).json({
    success: true,
    data: {
      email: invitation.email,
      name: invitation.name,
      role: invitation.role,
      permissions: invitation.permissions,
      invitedBy: invitation.invitedBy?.name || "Super Admin",
      expiresAt: invitation.expiresAt,
    },
  });
});

/**
 * Staff accepts invitation and sets password.
 */
const acceptInvitation = catchAsync(async (req, res) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  if (!token) {
    throw new ApiError(400, "Invitation token is required");
  }

  if (!password || password.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters long");
  }

  if (confirmPassword && password !== confirmPassword) {
    throw new ApiError(400, "Passwords do not match");
  }

  const invitation = await prisma.staffInvitation.findUnique({
    where: { token },
  });

  if (!invitation) {
    throw new ApiError(404, "Invalid invitation link");
  }

  if (invitation.usedAt) {
    throw new ApiError(400, "This invitation link has already been used");
  }

  if (new Date() > new Date(invitation.expiresAt)) {
    throw new ApiError(400, "This invitation link has expired");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  let user = await prisma.user.findUnique({
    where: { email: invitation.email },
  });

  const adminCode = (user && user.userCode && user.userCode.startsWith("AID"))
    ? user.userCode
    : await generateNextUserCodeAtomic("admin");

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: "admin",
        adminRole: invitation.role,
        customRoleTitle: invitation.customRoleTitle || String(invitation.role).replace(/_/g, " "),
        adminPermissions: invitation.permissions,
        staffStatus: "ACTIVE",
        password: hashedPassword,
        isEmailVerified: true,
        userCode: adminCode,
        lastLoginAt: new Date(),
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        name: invitation.name,
        email: invitation.email,
        password: hashedPassword,
        role: "admin",
        adminRole: invitation.role,
        customRoleTitle: invitation.customRoleTitle || String(invitation.role).replace(/_/g, " "),
        adminPermissions: invitation.permissions,
        staffStatus: "ACTIVE",
        userCode: adminCode,
        username: adminCode,
        isEmailVerified: true,
        invitedById: invitation.invitedById,
        lastLoginAt: new Date(),
      },
    });
  }

  // Mark invitation as used
  await prisma.staffInvitation.update({
    where: { id: invitation.id },
    data: { usedAt: new Date() },
  });

  // Invalidate any old cache for this user
  await userCache.del(user.id);

  // Record audit log
  await logAdminAction({
    req,
    adminUserId: user.id,
    action: AUDIT_ACTIONS.STAFF_CREATED,
    targetType: "USER",
    targetId: user.id,
    metadata: {
      email: user.email,
      role: user.adminRole,
      invitationId: invitation.id,
    },
  });

  // Issue auth tokens
  const tokenPayload = { sub: user.id, role: user.role };
  const accessToken = signAccessToken(tokenPayload, env);
  const refreshToken = signRefreshToken(tokenPayload, env);
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: hashedRefreshToken },
  });

  await resequenceUserPools();

  res.status(200).json({
    success: true,
    message: "Staff account successfully activated! Welcome to FreelNova Team.",
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        adminRole: user.adminRole,
        adminPermissions: user.adminPermissions,
        staffStatus: user.staffStatus,
        isEmailVerified: true,
      },
      accessToken,
      refreshToken,
    },
  });
});

/**
 * Update staff role and permissions.
 */
const updateStaffRoleAndPermissions = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { role, permissions } = req.body;
  const currentAdmin = req.user;

  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid staff user ID");
  }

  if (id === currentAdmin.id) {
    throw new ApiError(403, "You cannot modify your own role or permissions");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!targetUser || targetUser.role !== "admin") {
    throw new ApiError(404, "Staff user not found");
  }

  // Prevent modifying the primary platform super admin
  if (targetUser.email === "fn.freelnova@gmail.com") {
    throw new ApiError(403, "Primary platform Super Admin permissions cannot be modified");
  }

  const isSuperAdmin =
    currentAdmin.adminRole === ADMIN_ROLES.SUPER_ADMIN ||
    (!currentAdmin.adminRole && (currentAdmin.email === "fn.freelnova@gmail.com" || currentAdmin.role === "admin"));

  if (role === ADMIN_ROLES.SUPER_ADMIN && !isSuperAdmin) {
    throw new ApiError(403, "Only a Super Admin can promote someone to Super Admin");
  }

  let finalPermissions = permissions;
  if (!Array.isArray(finalPermissions)) {
    finalPermissions = targetUser.adminPermissions || [];
  }

  if (role && role !== targetUser.adminRole && (!permissions || permissions.length === 0)) {
    finalPermissions = ROLE_PERMISSIONS[role] || [];
  }

  const isPresetRole = Object.values(ADMIN_ROLES).includes(role);
  const dbRole = role ? (isPresetRole ? role : ADMIN_ROLES.CUSTOM) : targetUser.adminRole;
  const customTitle = role ? String(role).trim() : targetUser.customRoleTitle;

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      adminRole: dbRole,
      customRoleTitle: customTitle,
      adminPermissions: finalPermissions,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      adminRole: true,
      customRoleTitle: true,
      adminPermissions: true,
      staffStatus: true,
      updatedAt: true,
    },
  });

  // Invalidate cache immediately so new permissions take effect
  await userCache.del(id);

  // Record audit log
  await logAdminAction({
    req,
    action: AUDIT_ACTIONS.STAFF_PERMISSIONS_CHANGED,
    targetType: "USER",
    targetId: id,
    metadata: {
      targetEmail: targetUser.email,
      oldRole: targetUser.adminRole,
      newRole: updatedUser.adminRole,
      oldPermissionsCount: targetUser.adminPermissions?.length || 0,
      newPermissionsCount: updatedUser.adminPermissions?.length || 0,
    },
  });

  res.status(200).json({
    success: true,
    message: "Staff role and permissions updated successfully",
    data: updatedUser,
  });
});

/**
 * Suspend, Reactivate, or Revoke staff member access.
 */
const updateStaffStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const currentAdmin = req.user;

  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid staff user ID");
  }

  const validStatuses = ["ACTIVE", "SUSPENDED", "REVOKED"];
  if (!status || !validStatuses.includes(String(status).toUpperCase())) {
    throw new ApiError(400, "Status must be ACTIVE, SUSPENDED, or REVOKED");
  }

  const nextStatus = String(status).toUpperCase();

  if (id === currentAdmin.id) {
    throw new ApiError(403, "You cannot change your own staff status");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!targetUser || targetUser.role !== "admin") {
    throw new ApiError(404, "Staff user not found");
  }

  if (targetUser.email === "fn.freelnova@gmail.com") {
    throw new ApiError(403, "Primary platform Super Admin cannot be suspended or revoked");
  }

  // Prevent revoking the last Super Admin
  if (targetUser.adminRole === ADMIN_ROLES.SUPER_ADMIN && nextStatus !== "ACTIVE") {
    const activeSuperAdmins = await prisma.user.count({
      where: {
        role: "admin",
        adminRole: ADMIN_ROLES.SUPER_ADMIN,
        staffStatus: "ACTIVE",
        id: { not: id },
      },
    });

    if (activeSuperAdmins === 0 && targetUser.email !== "fn.freelnova@gmail.com") {
      throw new ApiError(400, "Cannot suspend or revoke the only active Super Admin");
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { staffStatus: nextStatus },
    select: {
      id: true,
      name: true,
      email: true,
      adminRole: true,
      staffStatus: true,
      updatedAt: true,
    },
  });

  // Invalidate cache immediately so access is cut off instantly
  await userCache.del(id);
  if (nextStatus !== "ACTIVE") {
    await sessionService.invalidateAllUserSessions(id);
  }

  let auditAction = AUDIT_ACTIONS.STAFF_STATUS_CHANGED || "STAFF_STATUS_CHANGED";
  if (nextStatus === "SUSPENDED") auditAction = AUDIT_ACTIONS.STAFF_SUSPENDED;
  if (nextStatus === "ACTIVE") auditAction = AUDIT_ACTIONS.STAFF_REACTIVATED;
  if (nextStatus === "REVOKED") auditAction = AUDIT_ACTIONS.STAFF_REVOKED;

  await logAdminAction({
    req,
    action: auditAction,
    targetType: "USER",
    targetId: id,
    metadata: {
      targetEmail: targetUser.email,
      previousStatus: targetUser.staffStatus,
      newStatus: nextStatus,
    },
  });

  res.status(200).json({
    success: true,
    message: `Staff member status updated to ${nextStatus}`,
    data: updatedUser,
  });
});

/**
 * Cancel/Revoke a pending staff invitation.
 */
const cancelInvitation = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid invitation ID");
  }

  const invitation = await prisma.staffInvitation.findUnique({
    where: { id },
  });

  if (!invitation) {
    throw new ApiError(404, "Invitation not found");
  }

  await prisma.staffInvitation.delete({
    where: { id },
  });

  await logAdminAction({
    req,
    action: "STAFF_INVITATION_CANCELLED",
    targetType: "STAFF_INVITATION",
    targetId: id,
    metadata: { email: invitation.email },
  });

  res.status(200).json({
    success: true,
    message: "Invitation cancelled successfully",
  });
});

/**
 * List audit logs with pagination and search.
 */
const listAuditLogs = catchAsync(async (req, res) => {
  const { page = 1, limit = 50, action, targetType, q } = req.query;
  const pageNum = Math.max(Number.parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const where = {};
  if (action) {
    where.action = action.trim();
  }
  if (targetType) {
    where.targetType = targetType.trim();
  }
  if (q) {
    where.OR = [
      { action: { contains: q, mode: "insensitive" } },
      { targetType: { contains: q, mode: "insensitive" } },
      { targetId: { contains: q, mode: "insensitive" } },
      { ipAddress: { contains: q, mode: "insensitive" } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      include: {
        adminUser: {
          select: {
            id: true,
            name: true,
            email: true,
            adminRole: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limitNum,
    }),
    prisma.adminAuditLog.count({ where }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      logs,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

/**
 * System health diagnostics for Developers and Super Admin.
 */
const getSystemHealth = catchAsync(async (req, res) => {
  const memory = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());

  // Test DB connection
  let dbStatus = "healthy";
  let dbPingMs = 0;
  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbPingMs = Date.now() - t0;
  } catch (dbErr) {
    dbStatus = "unhealthy";
  }

  // Count active stats
  const [totalUsers, totalProjects, totalPayments, totalAuditLogs] = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.payment.count(),
    prisma.adminAuditLog.count(),
  ]);

  res.status(200).json({
    success: true,
    data: {
      status: "operational",
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      uptimeFormatted: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
      environment: env.nodeEnv || "development",
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        rssMb: Math.round(memory.rss / (1024 * 1024)),
        heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024)),
        heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
      },
      database: {
        status: dbStatus,
        pingMs: dbPingMs,
        provider: "PostgreSQL (Neon Cloud)",
      },
      counters: {
        totalUsers,
        totalProjects,
        totalPayments,
        totalAuditLogs,
      },
    },
  });
});

/**
 * Demote / Revoke staff status back to a normal platform user (Freelancer / Recruiter).
 */
const demoteStaffToUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const currentAdmin = req.user;

  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid staff user ID");
  }

  if (id === currentAdmin.id) {
    throw new ApiError(403, "You cannot demote your own staff account");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!targetUser) {
    throw new ApiError(404, "User not found");
  }

  if (targetUser.email === "fn.freelnova@gmail.com") {
    throw new ApiError(403, "Primary platform Super Admin cannot be demoted");
  }

  // Prevent demoting the only active Super Admin
  if (targetUser.adminRole === ADMIN_ROLES.SUPER_ADMIN) {
    const activeSuperAdmins = await prisma.user.count({
      where: {
        role: "admin",
        adminRole: ADMIN_ROLES.SUPER_ADMIN,
        staffStatus: "ACTIVE",
        id: { not: id },
      },
    });

    if (activeSuperAdmins === 0) {
      throw new ApiError(400, "Cannot demote the only active Super Admin");
    }
  }

  const restoredRole = targetUser.userCode?.startsWith("CID") ? "recruiter" : "freelancer";
  const nextFidCode = await generateNextUserCodeAtomic(restoredRole);

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      role: restoredRole,
      userCode: targetUser.userCode && targetUser.userCode.startsWith("FID") ? targetUser.userCode : nextFidCode,
      adminRole: null,
      customRoleTitle: null,
      adminPermissions: [],
      staffStatus: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      adminRole: true,
      staffStatus: true,
      updatedAt: true,
    },
  });

  await userCache.del(id);
  await resequenceUserPools();

  await logAdminAction({
    req,
    action: AUDIT_ACTIONS.STAFF_REVOKED,
    targetType: "USER",
    targetId: id,
    metadata: {
      targetEmail: targetUser.email,
      previousAdminRole: targetUser.adminRole,
      restoredRole: updatedUser.role,
    },
  });

  res.status(200).json({
    success: true,
    message: `Staff member demoted back to normal ${restoredRole} user successfully`,
    data: updatedUser,
  });
});

module.exports = {
  listStaff,
  inviteStaff,
  getInvitationDetails,
  acceptInvitation,
  updateStaffRoleAndPermissions,
  updateStaffStatus,
  demoteStaffToUser,
  cancelInvitation,
  listAuditLogs,
  getSystemHealth,
};
