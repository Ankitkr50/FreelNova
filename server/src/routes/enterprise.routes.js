const express = require("express");
const router = express.Router();
const enterpriseController = require("../controllers/enterprise.controller");
const { protect, requireAdminPermission } = require("../middleware/auth.middleware");
const { PERMISSIONS } = require("../constants/permissions");

// All routes require authenticated user
router.use(protect);

// ── 1. Support Tickets ────────────────────────────────────────────────────────
router.get(
  "/tickets",
  requireAdminPermission(
    PERMISSIONS.TICKETS_VIEW || "tickets_view",
    PERMISSIONS.TICKETS_MANAGE || "tickets_manage",
    PERMISSIONS.SUPPORT_TICKETS_MANAGE || "support_tickets_manage"
  ),
  enterpriseController.getTickets
);

router.post("/tickets", enterpriseController.createTicket); // User or staff can create

router.patch(
  "/tickets/:id/assign",
  requireAdminPermission(
    PERMISSIONS.TICKETS_ASSIGN || "tickets_assign",
    PERMISSIONS.TICKETS_MANAGE || "tickets_manage",
    PERMISSIONS.SUPPORT_TICKETS_MANAGE || "support_tickets_manage"
  ),
  enterpriseController.assignTicket
);

router.patch(
  "/tickets/:id/status",
  requireAdminPermission(
    PERMISSIONS.TICKETS_MANAGE || "tickets_manage",
    PERMISSIONS.SUPPORT_TICKETS_MANAGE || "support_tickets_manage"
  ),
  enterpriseController.updateTicketStatus
);

router.post("/tickets/:id/messages", enterpriseController.addTicketMessage);

// ── 2. Disputes Center ────────────────────────────────────────────────────────
router.get(
  "/disputes/:id/details",
  requireAdminPermission(
    PERMISSIONS.DISPUTES_VIEW || "disputes_view",
    PERMISSIONS.DISPUTES_RESOLVE || "disputes_resolve"
  ),
  enterpriseController.getDisputeDetails
);

router.patch(
  "/disputes/:id/state",
  requireAdminPermission(
    PERMISSIONS.DISPUTES_RESOLVE || "disputes_resolve",
    PERMISSIONS.DISPUTES_MANAGE || "disputes_manage"
  ),
  enterpriseController.updateDisputeState
);

// ── 3. Finance Approvals ──────────────────────────────────────────────────────
router.get(
  "/finance-approvals",
  requireAdminPermission(
    PERMISSIONS.FINANCE_VIEW || "finance_view",
    PERMISSIONS.FINANCE_APPROVE || "finance_approve",
    PERMISSIONS.PAYMENTS_VIEW || "payments_view"
  ),
  enterpriseController.getFinanceApprovals
);

router.post(
  "/finance-approvals",
  requireAdminPermission(
    PERMISSIONS.FINANCE_VIEW || "finance_view",
    PERMISSIONS.PAYMENTS_MANAGE || "payments_manage"
  ),
  enterpriseController.createFinanceApprovalRequest
);

router.post(
  "/finance-approvals/:id/process",
  requireAdminPermission(
    PERMISSIONS.FINANCE_APPROVE || "finance_approve",
    PERMISSIONS.REFUND_APPROVE || "refund_approve",
    PERMISSIONS.ESCROW_APPROVE || "escrow_approve"
  ),
  enterpriseController.processFinanceApproval
);

// ── 4. Security & Fraud Center ───────────────────────────────────────────────
router.get(
  "/security-signals",
  requireAdminPermission(
    PERMISSIONS.SECURITY_VIEW || "security_view",
    PERMISSIONS.SECURITY_INVESTIGATE || "security_investigate",
    PERMISSIONS.STAFF_MANAGE || "staff_manage"
  ),
  enterpriseController.getSecurityDashboardSignals
);

router.patch(
  "/security-alerts/:id/resolve",
  requireAdminPermission(
    PERMISSIONS.SECURITY_INVESTIGATE || "security_investigate",
    PERMISSIONS.STAFF_MANAGE || "staff_manage"
  ),
  enterpriseController.resolveSecurityAlert
);

// ── 5. Company Analytics ──────────────────────────────────────────────────────
router.get(
  "/analytics",
  requireAdminPermission(
    PERMISSIONS.ANALYTICS_VIEW || "analytics_view",
    PERMISSIONS.FINANCIAL_REPORTS_VIEW || "financial_reports_view"
  ),
  enterpriseController.getCompanyAnalyticsData
);

// ── 6. Internal Knowledge Base ────────────────────────────────────────────────
router.get(
  "/knowledge",
  requireAdminPermission(
    PERMISSIONS.KNOWLEDGE_VIEW || "knowledge_view",
    PERMISSIONS.USERS_VIEW || "users_view"
  ),
  enterpriseController.getKnowledgeArticles
);

router.post(
  "/knowledge",
  requireAdminPermission(
    PERMISSIONS.KNOWLEDGE_MANAGE || "knowledge_manage",
    PERMISSIONS.STAFF_MANAGE || "staff_manage"
  ),
  enterpriseController.createKnowledgeArticle
);

// ── 7. Employee Handover ──────────────────────────────────────────────────────
router.get(
  "/handover",
  requireAdminPermission(
    PERMISSIONS.HANDOVER_VIEW || "handover_view",
    PERMISSIONS.STAFF_VIEW || "staff_view"
  ),
  enterpriseController.getHandovers
);

router.post(
  "/handover",
  requireAdminPermission(
    PERMISSIONS.HANDOVER_MANAGE || "handover_manage",
    PERMISSIONS.STAFF_MANAGE || "staff_manage"
  ),
  enterpriseController.executeEmployeeHandover
);

// ── 8. Internal Notes ─────────────────────────────────────────────────────────
router.get(
  "/notes/:entityType/:entityId",
  requireAdminPermission(
    PERMISSIONS.INTERNAL_NOTES_VIEW || "internal_notes_view",
    PERMISSIONS.USERS_VIEW || "users_view"
  ),
  enterpriseController.getInternalNotes
);

router.post(
  "/notes",
  requireAdminPermission(
    PERMISSIONS.INTERNAL_NOTES_CREATE || "internal_notes_create",
    PERMISSIONS.USERS_VIEW || "users_view"
  ),
  enterpriseController.createInternalNote
);

// ── 9. Notifications 2.0 ──────────────────────────────────────────────────────
router.post(
  "/notifications/targeted",
  requireAdminPermission(
    PERMISSIONS.NOTIFICATIONS_SEND || "notifications_send",
    PERMISSIONS.STAFF_MANAGE || "staff_manage"
  ),
  enterpriseController.sendTargetedNotification
);

// ── 10. Super Admin Command Center ────────────────────────────────────────────
router.get(
  "/command-center",
  requireAdminPermission(
    PERMISSIONS.ANALYTICS_VIEW || "analytics_view",
    PERMISSIONS.USERS_VIEW || "users_view"
  ),
  enterpriseController.getCommandCenterData
);

// ── 11. Sensitive Action Center ──────────────────────────────────────────────
router.post(
  "/sensitive-actions/request",
  requireAdminPermission(
    PERMISSIONS.SENSITIVE_ACTIONS_REQUEST || "sensitive_actions_request",
    PERMISSIONS.STAFF_MANAGE || "staff_manage"
  ),
  enterpriseController.requestSensitiveAction
);

router.post(
  "/sensitive-actions/:id/approve",
  requireAdminPermission(
    PERMISSIONS.SENSITIVE_ACTIONS_APPROVE || "sensitive_actions_approve",
    PERMISSIONS.STAFF_MANAGE || "staff_manage"
  ),
  enterpriseController.approveSensitiveAction
);

// ── 12. Case Management ───────────────────────────────────────────────────────
router.get(
  "/cases",
  requireAdminPermission(
    PERMISSIONS.CASES_VIEW || "cases_view",
    PERMISSIONS.USERS_VIEW || "users_view"
  ),
  enterpriseController.getCases
);

router.post(
  "/cases",
  requireAdminPermission(
    PERMISSIONS.CASES_MANAGE || "cases_manage",
    PERMISSIONS.USERS_VIEW || "users_view"
  ),
  enterpriseController.createCase
);

// ── 13. Policy & Compliance ───────────────────────────────────────────────────
router.get(
  "/policies",
  requireAdminPermission(
    PERMISSIONS.POLICIES_VIEW || "policies_view",
    PERMISSIONS.SETTINGS_MANAGE || "settings_manage"
  ),
  enterpriseController.getPolicies
);

router.post(
  "/policies",
  requireAdminPermission(
    PERMISSIONS.POLICIES_MANAGE || "policies_manage",
    PERMISSIONS.SETTINGS_MANAGE || "settings_manage"
  ),
  enterpriseController.createOrUpdatePolicy
);

module.exports = router;
