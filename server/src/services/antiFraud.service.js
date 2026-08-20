const { prisma } = require("../config/db");

// In-memory fraud incident flags store
const fraudIncidentFlagsStore = [];

/**
 * Computes Risk Level (LOW, MEDIUM, HIGH, CRITICAL) for a user or operation.
 */
const assessUserFraudRisk = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, isVerified: true, createdAt: true },
  });

  if (!user) throw new Error("User not found");

  let riskLevel = "LOW";
  const riskSignals = [];

  if (!user.isVerified) {
    riskSignals.push("Identity Verification Pending");
  }

  const userIncidents = fraudIncidentFlagsStore.filter((f) => f.userId === userId);
  if (userIncidents.length > 0) {
    riskLevel = "MEDIUM";
    riskSignals.push(`${userIncidents.length} prior risk alerts recorded`);
  }

  return {
    userId: user.id,
    riskLevel,
    riskSignals,
    actionRecommended: riskLevel === "LOW" ? "ALLOW" : "FLAG_FOR_HUMAN_REVIEW",
  };
};

module.exports = {
  assessUserFraudRisk,
};
