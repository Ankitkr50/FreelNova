const { prisma } = require("../config/db");

/**
 * Middleware to enforce required subscription plan tiers.
 * Tiers: "pro" | "elite" | "enterprise"
 */
const requireSubscriptionTier = (minTier = "pro") => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id || req.user._id;

      // Admins bypass subscription tier restrictions
      if (req.user.role === "admin") {
        return next();
      }

      const activeSubscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: "active",
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });

      if (!activeSubscription) {
        return res.status(403).json({
          success: false,
          message: `This feature requires an active ${minTier.toUpperCase()} subscription. Upgrade your plan to access.`,
        });
      }

      const userPlan = (activeSubscription.plan || "").toLowerCase();

      const planPriority = { free: 1, pro: 2, elite: 3, enterprise: 4 };
      const reqPriority = planPriority[minTier.toLowerCase()] || 2;
      const currentPriority = planPriority[userPlan] || 1;

      if (currentPriority < reqPriority) {
        return res.status(403).json({
          success: false,
          message: `Your current ${userPlan.toUpperCase()} plan does not include this feature. Upgrade to ${minTier.toUpperCase()} or higher.`,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  requireSubscriptionTier,
};
