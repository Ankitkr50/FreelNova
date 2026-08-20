const express = require("express");
const projectController = require("../controllers/project.controller");
const { protect, authorize, verifyProfileCompleted } = require("../middleware/auth.middleware");
const {
  validateProjectCreatePayload,
  validateProjectApplyPayload,
  validateProjectSelectionPayload,
  validateProjectReviewApplicantPayload,
  validateProjectStatusUpdatePayload,
} = require("../middleware/validate.middleware");

const router = express.Router();

router.get("/", protect, projectController.listProjects);
router.get("/search", protect, projectController.listProjects);
router.get("/applied", protect, projectController.listAppliedProjects);
router.post(
  "/",
  protect,
  authorize("recruiter"),
  verifyProfileCompleted,
  validateProjectCreatePayload,
  projectController.createProject
);
router.post(
  "/:id/apply",
  protect,
  authorize("freelancer"),
  verifyProfileCompleted,
  validateProjectApplyPayload,
  projectController.applyToProject
);
router.post(
  "/:id/select",
  protect,
  authorize("recruiter"),
  validateProjectSelectionPayload,
  projectController.selectFreelancer
);
router.get("/:id/applicants", protect, projectController.getProjectApplicants);
router.post(
  "/:id/applicants/:applicantId/review",
  protect,
  authorize("recruiter", "admin"),
  validateProjectReviewApplicantPayload,
  projectController.reviewApplicant
);
router.patch(
  "/:id/status",
  protect,
  authorize("recruiter", "admin"),
  validateProjectStatusUpdatePayload,
  projectController.updateProjectStatus
);
router.post(
  "/autopilot/generate",
  protect,
  authorize("recruiter", "admin"),
  projectController.generateAutopilotProject
);

router.get("/:id/vault", protect, projectController.getProjectVault);
router.post("/:id/vault/decisions", protect, projectController.addVaultDecision);
router.post("/:id/vault/ai-memory", protect, projectController.queryProjectAIMemory);

router.get("/:id/workforce", protect, projectController.getHybridWorkforce);
router.post("/:id/workforce/agents", protect, projectController.assignAIAgentToProject);
router.post("/:id/workforce/outputs", protect, projectController.logWorkOutput);

router.get("/:id/intent", protect, projectController.getProjectIntentScore);
router.get("/:id/client-trust", protect, projectController.getClientTrustProfile);

router.post("/:id/trial", protect, projectController.createTrialProject);
router.get("/:id/deliverable-escrow", protect, projectController.getDeliverableEscrowStatus);

router.get("/:id/ip-vault", protect, projectController.getProjectIPVault);
router.post("/translate-requirement", protect, projectController.translateRequirement);
router.get("/:id/compatibility", protect, projectController.getGlobalCompatibility);
router.post("/:id/knowledge-graph", protect, projectController.queryKnowledgeGraph);

router.get("/:id/matching-candidates", protect, projectController.getMatchingCandidatesForProject);
router.get("/:id/continuity", protect, projectController.detectProjectContinuityRisk);
router.post("/:id/continuity/approve", protect, projectController.approveReplacementCandidate);
router.get("/work-graph/query", protect, projectController.queryPlatformWorkGraph);
router.post("/:id/meetings", protect, projectController.createMeetingSession);
router.get("/:id/meetings", protect, projectController.getProjectMeetings);
router.get("/:id/outcome", protect, projectController.getProjectOutcomeScore);
router.get("/disputes/:disputeId/evidence-summary", protect, projectController.generateAIDisputeEvidenceSummary);

router.get("/:id", protect, projectController.getProjectById);

module.exports = router;
