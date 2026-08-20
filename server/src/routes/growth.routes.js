const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const growthController = require("../controllers/growth.controller");

const router = express.Router();

router.use(protect);

router.get("/reputation", growthController.getReputation);
router.get("/reputation/:userId", growthController.getReputation);
router.get("/referrals", growthController.getReferralInfo);
router.get("/feed", growthController.getDiscoveryFeed);
router.get("/instant-hire", growthController.getInstantHire);
router.post("/launchpad/orchestrate", growthController.launchpadOrchestrate);
router.get("/rewards", growthController.getRewardBalance);
router.post("/rewards/claim", growthController.claimReward);
router.get("/showcase", growthController.getShowcase);
router.get("/showcase/:username", growthController.getShowcase);
router.get("/community", growthController.getCommunity);
router.post("/community", growthController.createCommunityPostHandler);
router.get("/business-toolkit", growthController.getBusinessToolkit);
router.get("/achievements", growthController.getAchievements);
router.get("/dashboard", growthController.getGrowthDashboard);

module.exports = router;
