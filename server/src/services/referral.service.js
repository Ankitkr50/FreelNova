const { prisma } = require("../config/db");

// In-memory store for referrals & private talent pools
const referralsStore = [];
const privateTalentPoolsStore = {};

/**
 * Creates a verified freelancer-to-freelancer referral.
 */
const createReferral = async (referrerUserId, payload) => {
  const { referredFreelancerId, projectId, note } = payload;

  const referrer = await prisma.user.findUnique({ where: { id: referrerUserId }, select: { name: true } });
  if (!referrer) throw new Error("Referrer not found");

  const referral = {
    id: `ref-${Date.now()}`,
    referrerUserId,
    referrerName: referrer.name,
    referredFreelancerId,
    projectId,
    note: note || "Recommending for specialized backend DevOps tasks.",
    status: "HIRED_COMMISSION_ELIGIBLE",
    rewardAmount: 2500,
    createdAt: new Date().toISOString(),
  };

  referralsStore.unshift(referral);
  return referral;
};

/**
 * Manages Private Talent Pools 2.0 for enterprise clients.
 */
const getOrCreatePrivateTalentPool = async (recruiterId, poolName = "React Experts") => {
  const poolId = `pool-${recruiterId.slice(0, 8)}-${poolName.toLowerCase().replace(/\s+/g, "-")}`;

  if (!privateTalentPoolsStore[poolId]) {
    const members = await prisma.user.findMany({
      where: { role: "freelancer", isVerified: true },
      select: { id: true, name: true, username: true, skills: true, ratingAvg: true },
      take: 4,
    });

    privateTalentPoolsStore[poolId] = {
      poolId,
      poolName,
      recruiterId,
      members,
    };
  }

  return privateTalentPoolsStore[poolId];
};

module.exports = {
  createReferral,
  getOrCreatePrivateTalentPool,
};
