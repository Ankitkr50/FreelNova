const express = require("express");
const userController = require("../controllers/user.controller");
const { protect } = require("../middleware/auth.middleware");
const {
  validateUserProfileUpdatePayload,
  validateResumeMetadataPayload,
  validateProfileCompletionPayload,
} = require("../middleware/validate.middleware");

const router = express.Router();

router.get("/", protect, userController.listFreelancers);
router.get("/check-username", protect, userController.checkUsernameAvailability);
router.get("/profile", protect, userController.getProfile);
router.put("/profile", protect, validateUserProfileUpdatePayload, userController.updateProfile);
router.put("/profile/complete", protect, validateProfileCompletionPayload, userController.completeProfile);

router.put(
  "/profile/resume",
  protect,
  validateResumeMetadataPayload,
  userController.updateResumeMetadata
);
router.post("/support-inquiry", protect, userController.sendSupportInquiry);
router.post("/flag-solicitation", protect, userController.flagSolicitation);

router.get("/work-passport", protect, userController.getWorkPassport);
router.get("/career-autopilot", protect, userController.getCareerAutopilot);
router.post("/career-autopilot/generate-proposal", protect, userController.generateAIProposal);
router.get("/ai-twin/config", protect, userController.getAITwinConfig);
router.put("/ai-twin/config", protect, userController.updateAITwinConfig);
router.post("/:id/ai-twin/query", protect, userController.queryAITwin);
router.get("/:id/work-passport", protect, userController.getWorkPassport);

router.post("/retainers", protect, userController.createRetainerContract);
router.get("/retainers", protect, userController.listRetainerContracts);
router.post("/retainers/:id/terminate", protect, userController.terminateRetainerContract);

router.get("/company-workspace", protect, userController.getCompanyWorkspace);
router.post("/company-workspace/approvals", protect, userController.createApprovalRequest);
router.post("/company-workspace/approvals/:requestId/approve", protect, userController.approveWorkflowStep);
router.get("/opportunity-radar", protect, userController.getOpportunityRadar);
router.get("/earning-intelligence", protect, userController.getEarningIntelligence);
router.get("/rehiring-pool", protect, userController.getSmartRehiringPool);
router.get("/spend-intelligence", protect, userController.getClientSpendIntelligence);
router.get("/income-os", protect, userController.getIncomeOS);
router.post("/decision-assistant", protect, userController.getMarketplaceDecision);
router.get("/mentors", protect, userController.listMentors);
router.post("/mentors/book", protect, userController.bookMentorSession);
router.get("/studio", protect, userController.getOrCreateStudio);
router.post("/studio", protect, userController.getOrCreateStudio);
router.get("/protection", protect, userController.getProtectionEligibility);
router.get("/matching-projects", protect, userController.getMatchingProjectsForFreelancer);
router.get("/business-os", protect, userController.getFreelancerBusinessOS);
router.get("/availability", protect, userController.getOrUpdateAvailability);
router.post("/availability", protect, userController.getOrUpdateAvailability);
router.get("/productized-services", protect, userController.listProductizedServices);
router.post("/productized-services/:id/buy", protect, userController.buyProductizedService);
router.post("/referrals", protect, userController.createReferral);
router.get("/private-talent-pool", protect, userController.getOrCreatePrivateTalentPool);
router.get("/career-mobility", protect, userController.getCareerMobilitySuggestions);
router.get("/workforce-directory", protect, userController.getUnifiedWorkforceDirectory);
router.get("/security/trust-events", protect, userController.getUserTrustEvents);
router.get("/security/fraud-risk", protect, userController.assessUserFraudRisk);
router.get("/security/2fa", protect, userController.getOrSetup2FA);
router.post("/security/2fa/enable", protect, userController.enable2FA);
router.get("/security/sessions", protect, userController.getActiveSessions);
router.post("/security/sessions/revoke-all", protect, userController.revokeAllOtherSessions);
router.get("/financial/ledger", protect, userController.getFinancialLedgerEntries);
router.get("/financial/reconciliation", protect, userController.runFinancialReconciliation);
router.post("/contract/change-request", protect, userController.createContractChangeRequest);
router.get("/security/incidents", protect, userController.listSecurityIncidents);
router.get("/system/metrics", protect, userController.getProductionSystemMetrics);
router.get("/growth/liquidity", protect, userController.getMarketplaceLiquidityMetrics);
router.get("/growth/funnels", protect, userController.getFunnelAnalytics);
router.post("/growth/onboarding-goal", protect, userController.setUserOnboardingGoal);
router.get("/search-v2", protect, userController.searchNaturalLanguage);
router.get("/home-feed", protect, userController.getPersonalizedHomeFeed);
router.get("/action-center", protect, userController.getActionCenterItems);
router.get("/seo/freelancer/:username", userController.getPublicFreelancerSEOProfile);
router.get("/ai/cost-usage", protect, userController.getAICostUsage);
router.get("/system/feature-flags", userController.getFeatureFlags);
router.post("/oauth/apps", protect, userController.createOAuthApplication);
router.post("/oauth/token", userController.issueOAuthAccessToken);
router.post("/webhooks/subscriptions", protect, userController.registerWebhookSubscription);
router.post("/copilot/query", protect, userController.queryFreelNovaCopilot);
router.post("/ai-sandbox/test", protect, userController.runAISandboxTest);
router.post("/integrations/slack", userController.handleSlackSlashCommand);
router.get("/global/currency", userController.formatGlobalCurrency);
router.post("/partners/register", protect, userController.registerPartnerProgram);
router.get("/ecosystem/metrics", protect, userController.getEcosystemMetrics);
router.get("/:id/skill-graph", protect, userController.getVerifiedSkillGraph);

module.exports = router;


