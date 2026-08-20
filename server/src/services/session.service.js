const crypto = require("crypto");
const { prisma } = require("../config/db");
const logger = require("../utils/logger");

function hashToken(token) {
  if (!token) return "";
  return crypto.createHash("sha256").update(token).digest("hex");
}

function parseUserAgent(ua = "") {
  let browser = "Unknown Browser";
  let os = "Unknown OS";
  let device = "Desktop";

  if (/mobile/i.test(ua)) device = "Mobile Device";
  else if (/tablet|ipad/i.test(ua)) device = "Tablet";

  if (/windows/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";

  if (/edg/i.test(ua)) browser = "Microsoft Edge";
  else if (/chrome|crios/i.test(ua)) browser = "Google Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Mozilla Firefox";
  else if (/safari/i.test(ua)) browser = "Apple Safari";
  else if (/opera|opr/i.test(ua)) browser = "Opera";

  return { browser, os, device };
}

/**
 * Register active admin session on login
 */
async function registerAdminSession(userId, token, req) {
  try {
    const tokenHash = hashToken(token);
    const headers = req?.headers || {};
    const rawIp = headers["x-forwarded-for"] || req?.socket?.remoteAddress || req?.ip || "127.0.0.1";
    const ipAddress = Array.isArray(rawIp) ? rawIp[0] : String(rawIp).split(",")[0].trim();
    const userAgent = headers["user-agent"] || "Unknown";
    const { browser, os, device } = parseUserAgent(userAgent);

    return await prisma.adminSession.create({
      data: {
        userId,
        tokenHash,
        ipAddress,
        userAgent,
        browser,
        os,
        device,
        isRevoked: false,
        lastActiveAt: new Date(),
      },
    });
  } catch (err) {
    logger.error("register_admin_session_error", { error: err.message, userId });
    return null;
  }
}

/**
 * Check if a session token is active and not revoked
 */
async function isSessionActive(token) {
  if (!token) return false;
  try {
    const tokenHash = hashToken(token);
    const session = await prisma.adminSession.findUnique({
      where: { tokenHash },
      select: { isRevoked: true, user: { select: { staffStatus: true } } },
    });

    if (!session) return true; // Fallback for legacy tokens
    if (session.isRevoked || session.user?.staffStatus !== "ACTIVE") {
      return false;
    }
    return true;
  } catch (err) {
    return true;
  }
}

/**
 * Touch active timestamp on session
 */
async function touchSession(token) {
  if (!token) return;
  try {
    const tokenHash = hashToken(token);
    await prisma.adminSession.updateMany({
      where: { tokenHash, isRevoked: false },
      data: { lastActiveAt: new Date() },
    });
  } catch (err) {
    // Non-blocking
  }
}

/**
 * List all active sessions for a user
 */
async function listUserSessions(userId, currentToken) {
  const currentHash = hashToken(currentToken);
  const sessions = await prisma.adminSession.findMany({
    where: { userId },
    orderBy: { lastActiveAt: "desc" },
    take: 25,
  });

  return sessions.map((s) => ({
    id: s.id,
    ipAddress: s.ipAddress,
    browser: s.browser,
    os: s.os,
    device: s.device,
    isRevoked: s.isRevoked,
    isCurrent: s.tokenHash === currentHash,
    createdAt: s.createdAt,
    lastActiveAt: s.lastActiveAt,
  }));
}

/**
 * Revoke specific session
 */
async function revokeSession(sessionId, targetUserId) {
  const query = { id: sessionId };
  if (targetUserId) query.userId = targetUserId;

  return prisma.adminSession.updateMany({
    where: query,
    data: { isRevoked: true },
  });
}

/**
 * Revoke all other sessions except current
 */
async function revokeAllOtherSessions(userId, currentToken) {
  const currentHash = hashToken(currentToken);

  return prisma.adminSession.updateMany({
    where: {
      userId,
      tokenHash: { not: currentHash },
      isRevoked: false,
    },
    data: { isRevoked: true },
  });
}

/**
 * Invalidate all sessions for a user (e.g. upon suspension, password reset)
 */
async function invalidateAllUserSessions(userId) {
  return prisma.adminSession.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true },
  });
}

module.exports = {
  hashToken,
  registerAdminSession,
  isSessionActive,
  touchSession,
  listUserSessions,
  revokeSession,
  revokeAllOtherSessions,
  invalidateAllUserSessions,
};
