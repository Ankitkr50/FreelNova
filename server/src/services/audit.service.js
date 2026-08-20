const { prisma } = require("../config/db");
const logger = require("../utils/logger");

/**
 * Creates an immutable audit log entry for admin and staff actions.
 *
 * @param {Object} options
 * @param {Object} [options.req] - Express request object (extracts user, IP, user-agent)
 * @param {string} [options.adminUserId] - Direct admin user ID if req is unavailable
 * @param {string} options.action - Audit action constant (e.g. AUDIT_ACTIONS.STAFF_CREATED)
 * @param {string} [options.targetType] - Entity type (e.g. "USER", "PROJECT", "PAYMENT", "STAFF")
 * @param {string} [options.targetId] - Target entity identifier
 * @param {Object} [options.metadata] - Additional contextual data (secrets filtered out)
 */
async function logAdminAction({ req, adminUserId, action, targetType, targetId, metadata = {} }) {
  try {
    const userId = adminUserId || req?.user?.id || req?.user?._id || null;
    let ipAddress = null;
    let userAgent = null;

    if (req) {
      ipAddress =
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.socket?.remoteAddress ||
        req.ip ||
        null;
      userAgent = req.headers["user-agent"] ? String(req.headers["user-agent"]).slice(0, 500) : null;
    }

    // Filter any sensitive keys like passwords or raw tokens from metadata
    const sanitizedMeta = { ...metadata };
    delete sanitizedMeta.password;
    delete sanitizedMeta.confirmPassword;
    delete sanitizedMeta.token;
    delete sanitizedMeta.accessToken;
    delete sanitizedMeta.refreshToken;

    const logEntry = await prisma.adminAuditLog.create({
      data: {
        adminUserId: userId,
        action: String(action),
        targetType: targetType ? String(targetType) : null,
        targetId: targetId ? String(targetId) : null,
        metadata: sanitizedMeta,
        ipAddress,
        userAgent,
      },
    });

    return logEntry;
  } catch (err) {
    logger.error("Failed to record admin audit log:", err);
    // Never fail the primary transaction because of audit log failure
    return null;
  }
}

module.exports = {
  logAdminAction,
};
