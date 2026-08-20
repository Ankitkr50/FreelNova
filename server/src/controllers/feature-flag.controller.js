const { prisma } = require("../config/db");
const ApiError = require("../utils/apiError");
const catchAsync = require("../utils/catchAsync");
const { logAdminAction } = require("../services/audit.service");

const DEFAULT_FLAGS = [
  { key: "NEW_PAYMENT_FLOW", name: "Modern Escrow Checkout", description: "Direct Razorpay instant escrow settlement", isEnabled: true },
  { key: "AI_MATCHING", name: "AI Proposal Matchmaker", description: "Algorithmic freelancer-project compatibility matching", isEnabled: false },
  { key: "VIDEO_CALLS", name: "In-Browser Video Meetings", description: "WebRTC encrypted video interview rooms", isEnabled: false },
  { key: "CHAT_SENTIMENT_WATCH", name: "Real-time NLP Sentiment Scanner", description: "Proactive dispute prediction and sentiment analysis", isEnabled: true },
  { key: "CRYPTO_PAYOUTS", name: "USDT / Web3 Payout Rail", description: "International stablecoin settlement option", isEnabled: false },
];

/**
 * List Feature Flags
 */
const listFeatureFlags = catchAsync(async (req, res) => {
  let flags = await prisma.featureFlag.findMany({
    orderBy: { createdAt: "asc" },
  });

  // Seed defaults if empty
  if (flags.length === 0) {
    await prisma.featureFlag.createMany({
      data: DEFAULT_FLAGS,
      skipDuplicates: true,
    });
    flags = await prisma.featureFlag.findMany({ orderBy: { createdAt: "asc" } });
  }

  res.status(200).json({
    success: true,
    data: { flags },
  });
});

/**
 * Toggle or Update Feature Flag
 */
const toggleFeatureFlag = catchAsync(async (req, res) => {
  const { flagId } = req.params;
  const { isEnabled, targetRoles } = req.body;

  const data = {};
  if (isEnabled !== undefined) data.isEnabled = Boolean(isEnabled);
  if (targetRoles !== undefined) data.targetRoles = targetRoles;

  const flag = await prisma.featureFlag.update({
    where: { id: flagId },
    data,
  });

  await logAdminAction({
    adminUserId: req.user.id,
    action: "FEATURE_FLAG_TOGGLED",
    targetType: "FEATURE_FLAG",
    targetId: flag.key,
    metadata: { key: flag.key, isEnabled: flag.isEnabled, targetRoles: flag.targetRoles },
    req,
  });

  res.status(200).json({
    success: true,
    message: `Feature flag "${flag.name}" is now ${flag.isEnabled ? "ENABLED" : "DISABLED"}.`,
    data: { flag },
  });
});

module.exports = {
  listFeatureFlags,
  toggleFeatureFlag,
};
