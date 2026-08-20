const catchAsync = require("../utils/catchAsync");
const growthService = require("../services/growth.service");

const getReputation = catchAsync(async (req, res) => {
  const targetId = req.params.userId || req.user.id;
  const data = await growthService.getUnifiedReputationScore(targetId);
  res.status(200).json({ success: true, data });
});

const getReferralInfo = catchAsync(async (req, res) => {
  const data = await growthService.getReferralStats(req.user.id);
  res.status(200).json({ success: true, data });
});

const getDiscoveryFeed = catchAsync(async (req, res) => {
  const data = await growthService.getPersonalizedDiscoveryFeed(req.user.id, req.user.role, req.query);
  res.status(200).json({ success: true, data });
});

const getInstantHire = catchAsync(async (req, res) => {
  const data = await growthService.getInstantHireRecommendations(req.user.id, req.query);
  res.status(200).json({ success: true, data });
});

const launchpadOrchestrate = catchAsync(async (req, res) => {
  const data = await growthService.orchestrateLaunchpadIdea(req.user.id, req.body);
  res.status(200).json({ success: true, data });
});

const getRewardBalance = catchAsync(async (req, res) => {
  const data = await growthService.getUserRewardBalance(req.user.id);
  res.status(200).json({ success: true, data });
});

const claimReward = catchAsync(async (req, res) => {
  const { action, connects, note } = req.body;
  const data = await growthService.awardUserRewardConnects(req.user.id, action, connects || 10, note);
  res.status(200).json({ success: true, message: "Reward claimed successfully!", data });
});

const getShowcase = catchAsync(async (req, res) => {
  const username = req.params.username || req.user.username || req.user.id;
  const data = await growthService.getPublicWorkShowcase(username);
  res.status(200).json({ success: true, data });
});

const getCommunity = catchAsync(async (req, res) => {
  const data = await growthService.getCommunityPosts(req.query);
  res.status(200).json({ success: true, data });
});

const createCommunityPostHandler = catchAsync(async (req, res) => {
  const data = await growthService.createCommunityPost(req.user.id, req.body);
  res.status(201).json({ success: true, message: "Community post created!", data });
});

const getBusinessToolkit = catchAsync(async (req, res) => {
  const data = await growthService.getBusinessToolkitData(req.user.id);
  res.status(200).json({ success: true, data });
});

const getAchievements = catchAsync(async (req, res) => {
  const data = await growthService.evaluateUserAchievements(req.user.id);
  res.status(200).json({ success: true, data });
});

const getGrowthDashboard = catchAsync(async (req, res) => {
  const data = await growthService.getPersonalizedGrowthDashboard(req.user.id, req.user.role);
  res.status(200).json({ success: true, data });
});

module.exports = {
  getReputation,
  getReferralInfo,
  getDiscoveryFeed,
  getInstantHire,
  launchpadOrchestrate,
  getRewardBalance,
  claimReward,
  getShowcase,
  getCommunity,
  createCommunityPostHandler,
  getBusinessToolkit,
  getAchievements,
  getGrowthDashboard,
};
