// In-memory store for user AI token usage
const aiUsageStore = {};

/**
 * Tracks AI request token usage and validates tier limits (Free, Pro, Elite, Enterprise).
 */
const trackAndValidateAIUsage = async (userId, userPlan = "PRO", tokensUsed = 250) => {
  const limits = {
    FREE: 2000,
    PRO: 50000,
    ELITE: 200000,
    ENTERPRISE: 1000000,
  };

  const planLimit = limits[userPlan] || limits.PRO;

  if (!aiUsageStore[userId]) {
    aiUsageStore[userId] = { totalTokens: 0, requestsCount: 0 };
  }

  aiUsageStore[userId].totalTokens += tokensUsed;
  aiUsageStore[userId].requestsCount += 1;

  const remainingTokens = Math.max(0, planLimit - aiUsageStore[userId].totalTokens);

  return {
    userId,
    userPlan,
    tokensUsedThisRequest: tokensUsed,
    totalTokensUsed: aiUsageStore[userId].totalTokens,
    planLimit,
    remainingTokens,
    estimatedCostUsd: Number((aiUsageStore[userId].totalTokens * 0.000002).toFixed(4)),
    allowed: aiUsageStore[userId].totalTokens <= planLimit,
  };
};

module.exports = {
  trackAndValidateAIUsage,
};
