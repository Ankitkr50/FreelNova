const { prisma } = require("../config/db");
const ApiError = require("../utils/apiError");
const catchAsync = require("../utils/catchAsync");
const { logAdminAction } = require("../services/audit.service");
const { AUDIT_ACTIONS } = require("../constants/permissions");
const mfaService = require("../services/mfa.service");
const sessionService = require("../services/session.service");

// Temp storage for pending MFA setup secrets
const pendingMfaSetups = new Map();

/**
 * Get 2FA status for current user
 */
const getMfaStatus = catchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      twoFactorEnabled: true,
      twoFactorRecoveryCodes: true,
    },
  });

  res.status(200).json({
    success: true,
    data: {
      twoFactorEnabled: Boolean(user?.twoFactorEnabled),
      hasRecoveryCodes: Boolean(user?.twoFactorRecoveryCodes?.length > 0),
      remainingRecoveryCodesCount: user?.twoFactorRecoveryCodes?.length || 0,
    },
  });
});

/**
 * Initialize MFA setup: generate secret & QR code
 */
const setupMfa = catchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true },
  });

  const setupData = await mfaService.generateMfaSetup(user);
  pendingMfaSetups.set(user.id, {
    secret: setupData.secret,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 mins
  });

  res.status(200).json({
    success: true,
    data: {
      qrCodeDataUrl: setupData.qrCodeDataUrl,
      manualEntryKey: setupData.secret,
    },
  });
});

/**
 * Verify code and enable 2FA
 */
const verifyAndEnableMfa = catchAsync(async (req, res) => {
  const { code } = req.body;
  if (!code) throw new ApiError(400, "6-digit verification code is required.");

  const pending = pendingMfaSetups.get(req.user.id);
  if (!pending || Date.now() > pending.expiresAt) {
    throw new ApiError(400, "MFA setup session expired. Please start over.");
  }

  const isValid = mfaService.verifyTotpToken(code, pending.secret);
  if (!isValid) {
    throw new ApiError(400, "Invalid authenticator code. Please check your app and try again.");
  }

  const { rawCodes, hashedCodes } = await mfaService.generateRecoveryCodes();

  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      twoFactorEnabled: true,
      twoFactorSecret: pending.secret,
      twoFactorRecoveryCodes: hashedCodes,
    },
  });

  pendingMfaSetups.delete(req.user.id);

  await logAdminAction({
    adminUserId: req.user.id,
    action: "MFA_ENABLED",
    targetType: "USER",
    targetId: req.user.id,
    req,
  });

  res.status(200).json({
    success: true,
    message: "Two-Factor Authentication enabled successfully!",
    data: {
      recoveryCodes: rawCodes, // Shown once
    },
  });
});

/**
 * Disable 2FA
 */
const disableMfa = catchAsync(async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorRecoveryCodes: [],
    },
  });

  await logAdminAction({
    adminUserId: req.user.id,
    action: "MFA_DISABLED",
    targetType: "USER",
    targetId: req.user.id,
    req,
  });

  res.status(200).json({
    success: true,
    message: "Two-Factor Authentication has been disabled.",
  });
});

/**
 * List active sessions
 */
const listSessions = catchAsync(async (req, res) => {
  const currentToken = req.headers.authorization?.replace("Bearer ", "");
  const sessions = await sessionService.listUserSessions(req.user.id, currentToken);

  res.status(200).json({
    success: true,
    data: { sessions },
  });
});

/**
 * Revoke specific session
 */
const revokeSession = catchAsync(async (req, res) => {
  const { sessionId } = req.params;
  await sessionService.revokeSession(sessionId, req.user.id);

  await logAdminAction({
    adminUserId: req.user.id,
    action: "SESSION_REVOKED",
    targetType: "ADMIN_SESSION",
    targetId: sessionId,
    req,
  });

  res.status(200).json({
    success: true,
    message: "Session successfully terminated.",
  });
});

/**
 * Revoke all other sessions
 */
const revokeAllOtherSessions = catchAsync(async (req, res) => {
  const currentToken = req.headers.authorization?.replace("Bearer ", "");
  await sessionService.revokeAllOtherSessions(req.user.id, currentToken);

  await logAdminAction({
    adminUserId: req.user.id,
    action: "ALL_OTHER_SESSIONS_REVOKED",
    targetType: "ADMIN_SESSION",
    targetId: req.user.id,
    req,
  });

  res.status(200).json({
    success: true,
    message: "All other sessions have been logged out.",
  });
});

/**
 * List Security Alerts
 */
const listSecurityAlerts = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, isResolved } = req.query;
  const where = {};

  if (isResolved !== undefined && isResolved !== "") {
    where.isResolved = isResolved === "true";
  }

  const [alerts, total] = await Promise.all([
    prisma.securityAlert.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: "desc" },
      include: {
        targetUser: { select: { id: true, name: true, email: true } },
        resolvedBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.securityAlert.count({ where }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      alerts,
      total,
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  });
});

/**
 * Resolve Security Alert
 */
const resolveSecurityAlert = catchAsync(async (req, res) => {
  const { alertId } = req.params;

  const alert = await prisma.securityAlert.update({
    where: { id: alertId },
    data: {
      isResolved: true,
      resolvedById: req.user.id,
      resolvedAt: new Date(),
    },
  });

  await logAdminAction({
    adminUserId: req.user.id,
    action: "SECURITY_ALERT_RESOLVED",
    targetType: "SECURITY_ALERT",
    targetId: alertId,
    req,
  });

  res.status(200).json({
    success: true,
    message: "Security alert marked as resolved.",
    data: { alert },
  });
});

module.exports = {
  getMfaStatus,
  setupMfa,
  verifyAndEnableMfa,
  disableMfa,
  listSessions,
  revokeSession,
  revokeAllOtherSessions,
  listSecurityAlerts,
  resolveSecurityAlert,
};
