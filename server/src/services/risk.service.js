const { prisma } = require("../config/db");
const logger = require("../utils/logger");

/**
 * Create a Security Alert
 */
async function createSecurityAlert({
  severity = "MEDIUM",
  eventType,
  title,
  description,
  ipAddress,
  userAgent,
  targetUserId,
  metadata = {},
}) {
  try {
    const alert = await prisma.securityAlert.create({
      data: {
        severity,
        eventType,
        title,
        description,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        targetUserId: targetUserId || null,
        metadata: metadata || {},
      },
    });

    logger.warn("security_alert_triggered", { id: alert.id, severity, eventType, title });
    return alert;
  } catch (err) {
    logger.error("create_security_alert_error", { error: err.message, eventType });
    return null;
  }
}

/**
 * Evaluate Rule-based Risk for a User
 */
async function evaluateUserRisk(userId) {
  const [
    user,
    failedPaymentsCount,
    disputesCount,
    sessions,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, isVerified: true, moderationStatus: true, createdAt: true },
    }),
    prisma.payment.count({
      where: { recruiterId: userId, status: "failed" },
    }),
    prisma.dispute.count({
      where: { OR: [{ raisedBy: userId }, { againstUserId: userId }] },
    }),
    prisma.adminSession.findMany({
      where: { userId },
      take: 10,
      select: { ipAddress: true },
    }),
  ]);

  if (!user) return null;

  let riskScore = 10;
  const reasons = [];

  // Rule 1: Moderation status
  if (user.moderationStatus === "suspended") {
    riskScore += 40;
    reasons.push("Account is currently suspended");
  } else if (user.moderationStatus === "blocked") {
    riskScore += 60;
    reasons.push("Account is blocked by platform moderators");
  }

  // Rule 2: Unverified profile
  if (!user.isVerified) {
    riskScore += 15;
    reasons.push("Identity verification not completed");
  }

  // Rule 3: Multiple failed payments
  if (failedPaymentsCount >= 3) {
    riskScore += 25;
    reasons.push(`${failedPaymentsCount} failed payment transactions recorded`);
  }

  // Rule 4: Involved in disputes
  if (disputesCount >= 2) {
    riskScore += 20;
    reasons.push(`Involved in ${disputesCount} project disputes`);
  }

  // Rule 5: Multiple distinct IPs
  const distinctIps = new Set(sessions.map((s) => s.ipAddress).filter(Boolean));
  if (distinctIps.size >= 4) {
    riskScore += 15;
    reasons.push(`Logged in from ${distinctIps.size} distinct IP addresses`);
  }

  // Clamp 0 - 100
  riskScore = Math.min(100, Math.max(0, riskScore));

  let riskLevel = "LOW";
  if (riskScore >= 75) riskLevel = "CRITICAL";
  else if (riskScore >= 50) riskLevel = "HIGH";
  else if (riskScore >= 30) riskLevel = "MEDIUM";

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    riskScore,
    riskLevel,
    reasons,
  };
}

module.exports = {
  createSecurityAlert,
  evaluateUserRisk,
};
