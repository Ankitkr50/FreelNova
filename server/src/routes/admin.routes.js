const express = require("express");
const adminController = require("../controllers/admin.controller");
const staffController = require("../controllers/staff.controller");
const securityController = require("../controllers/security.controller");
const ledgerController = require("../controllers/ledger.controller");
const ticketController = require("../controllers/ticket.controller");
const featureFlagController = require("../controllers/feature-flag.controller");
const { protect, requireAdmin, requireAdminPermission } = require("../middleware/auth.middleware");
const { PERMISSIONS } = require("../constants/permissions");
const {
  validateAdminUserStatusPayload,
  validateAdminProjectModerationPayload,
  validateAdminPaymentReviewPayload,
  validateAdminDisputeCreatePayload,
  validateAdminDisputePatchPayload,
} = require("../middleware/validate.middleware");

const router = express.Router();

// ── Public Staff Invitation Endpoints (Token-Protected) ──────────────────────
router.get("/staff/invitations/:token", staffController.getInvitationDetails);
router.post("/staff/invitations/:token/accept", staffController.acceptInvitation);

// ── Protected Admin & Staff Endpoints ────────────────────────────────────────
router.use(protect, requireAdmin);

// Staff Management & RBAC Routes
router.get("/staff", requireAdminPermission(PERMISSIONS.STAFF_VIEW, PERMISSIONS.USERS_VIEW), staffController.listStaff);
router.post("/staff/invite", requireAdminPermission(PERMISSIONS.STAFF_MANAGE), staffController.inviteStaff);
router.patch("/staff/:id/role", requireAdminPermission(PERMISSIONS.PERMISSIONS_MANAGE, PERMISSIONS.STAFF_MANAGE), staffController.updateStaffRoleAndPermissions);
router.patch("/staff/:id/status", requireAdminPermission(PERMISSIONS.STAFF_MANAGE), staffController.updateStaffStatus);
router.patch("/staff/:id/demote", requireAdminPermission(PERMISSIONS.STAFF_MANAGE), staffController.demoteStaffToUser);
router.delete("/staff/invitations/:id", requireAdminPermission(PERMISSIONS.STAFF_MANAGE), staffController.cancelInvitation);

// 1. Intelligence & Analytics
router.get(
  "/intelligence",
  requireAdminPermission(PERMISSIONS.FINANCIAL_REPORTS_VIEW, PERMISSIONS.PAYMENTS_VIEW, PERMISSIONS.REPORTS_VIEW),
  adminController.adminGetIntelligence
);

// 2. User Management
router.get(
  "/users",
  requireAdminPermission(PERMISSIONS.USERS_VIEW),
  adminController.adminListUsers
);
router.get(
  "/users/:id/details",
  requireAdminPermission(PERMISSIONS.USERS_VIEW),
  adminController.adminGetUserDetails
);
router.patch(
  "/users/:id/status",
  requireAdminPermission(PERMISSIONS.USERS_MANAGE),
  validateAdminUserStatusPayload,
  adminController.adminUpdateUserStatus
);

// 3. Project Management & Moderation
router.get(
  "/projects",
  requireAdminPermission(PERMISSIONS.PROJECTS_VIEW),
  adminController.adminListProjects
);
router.get(
  "/projects/:id/details",
  requireAdminPermission(PERMISSIONS.PROJECTS_VIEW),
  adminController.adminGetProjectDetails
);
router.patch(
  "/projects/:id/moderate",
  requireAdminPermission(PERMISSIONS.PROJECTS_MODERATE, PERMISSIONS.PROJECTS_MANAGE),
  validateAdminProjectModerationPayload,
  adminController.adminModerateProject
);

// 4. Payments, Escrow & Financials
router.get(
  "/payments",
  requireAdminPermission(PERMISSIONS.PAYMENTS_VIEW, PERMISSIONS.ESCROW_VIEW),
  adminController.adminListPayments
);
router.patch(
  "/payments/:id/review",
  requireAdminPermission(PERMISSIONS.PAYMENTS_MANAGE, PERMISSIONS.ESCROW_MANAGE),
  validateAdminPaymentReviewPayload,
  adminController.adminReviewPayment
);

// 5. Disputes & Resolution
router.post(
  "/disputes",
  requireAdminPermission(PERMISSIONS.DISPUTES_RESOLVE, PERMISSIONS.DISPUTES_VIEW),
  validateAdminDisputeCreatePayload,
  adminController.adminCreateDispute
);
router.get(
  "/disputes",
  requireAdminPermission(PERMISSIONS.DISPUTES_VIEW),
  adminController.adminListDisputes
);
router.patch(
  "/disputes/:id",
  requireAdminPermission(PERMISSIONS.DISPUTES_RESOLVE),
  validateAdminDisputePatchPayload,
  adminController.adminPatchDispute
);

// 6. RBAC Staff & Team Management
router.get(
  "/staff",
  requireAdminPermission(PERMISSIONS.STAFF_VIEW, PERMISSIONS.STAFF_MANAGE),
  staffController.listStaff
);
router.post(
  "/staff/invite",
  requireAdminPermission(PERMISSIONS.STAFF_MANAGE),
  staffController.inviteStaff
);
router.patch(
  "/staff/:id/role-permissions",
  requireAdminPermission(PERMISSIONS.PERMISSIONS_MANAGE, PERMISSIONS.STAFF_MANAGE),
  staffController.updateStaffRoleAndPermissions
);
router.patch(
  "/staff/:id/status",
  requireAdminPermission(PERMISSIONS.STAFF_MANAGE),
  staffController.updateStaffStatus
);
router.patch(
  "/staff/:id/demote",
  requireAdminPermission(PERMISSIONS.STAFF_MANAGE),
  staffController.demoteStaffToUser
);
router.delete(
  "/staff/invitations/:id",
  requireAdminPermission(PERMISSIONS.STAFF_MANAGE),
  staffController.cancelInvitation
);

// 7. Security Center & 2FA / Session Management
router.get("/security/mfa/status", securityController.getMfaStatus);
router.post("/security/mfa/setup", securityController.setupMfa);
router.post("/security/mfa/verify", securityController.verifyAndEnableMfa);
router.post("/security/mfa/disable", securityController.disableMfa);
router.get("/security/sessions", securityController.listSessions);
router.delete("/security/sessions/:sessionId", securityController.revokeSession);
router.delete("/security/sessions", securityController.revokeAllOtherSessions);
router.get(
  "/security/alerts",
  requireAdminPermission(PERMISSIONS.AUDIT_LOGS_VIEW, PERMISSIONS.SYSTEM_HEALTH_VIEW),
  securityController.listSecurityAlerts
);
router.patch(
  "/security/alerts/:alertId/resolve",
  requireAdminPermission(PERMISSIONS.SETTINGS_MANAGE, PERMISSIONS.STAFF_MANAGE),
  securityController.resolveSecurityAlert
);

// 8. Immutable Financial Ledger & Reconciliation
router.get(
  "/ledger",
  requireAdminPermission(PERMISSIONS.FINANCIAL_REPORTS_VIEW, PERMISSIONS.PAYMENTS_VIEW),
  ledgerController.getLedgerEntries
);
router.get(
  "/ledger/reconciliation",
  requireAdminPermission(PERMISSIONS.FINANCIAL_REPORTS_VIEW, PERMISSIONS.PAYMENTS_VIEW),
  ledgerController.getReconciliationReport
);
router.post(
  "/ledger/adjust",
  requireAdminPermission(PERMISSIONS.PAYMENTS_MANAGE),
  ledgerController.createAdjustment
);

// 9. Support Ticket System
router.post(
  "/tickets",
  requireAdminPermission(PERMISSIONS.SUPPORT_TICKETS_MANAGE, PERMISSIONS.USERS_VIEW),
  ticketController.createTicket
);
router.get(
  "/tickets",
  requireAdminPermission(PERMISSIONS.SUPPORT_TICKETS_MANAGE, PERMISSIONS.USERS_VIEW),
  ticketController.listTickets
);
router.get(
  "/tickets/:ticketId",
  requireAdminPermission(PERMISSIONS.SUPPORT_TICKETS_MANAGE, PERMISSIONS.USERS_VIEW),
  ticketController.getTicketDetails
);
router.post(
  "/tickets/:ticketId/messages",
  requireAdminPermission(PERMISSIONS.SUPPORT_TICKETS_MANAGE),
  ticketController.addTicketMessage
);
router.patch(
  "/tickets/:ticketId",
  requireAdminPermission(PERMISSIONS.SUPPORT_TICKETS_MANAGE),
  ticketController.updateTicket
);

// 10. Feature Flags Management
router.get(
  "/feature-flags",
  requireAdminPermission(PERMISSIONS.SETTINGS_MANAGE, PERMISSIONS.SYSTEM_HEALTH_VIEW),
  featureFlagController.listFeatureFlags
);
router.patch(
  "/feature-flags/:flagId",
  requireAdminPermission(PERMISSIONS.SETTINGS_MANAGE),
  featureFlagController.toggleFeatureFlag
);

// 11. Immutable Audit Logs
router.get(
  "/audit-logs",
  requireAdminPermission(PERMISSIONS.AUDIT_LOGS_VIEW),
  staffController.listAuditLogs
);

// 12. System Diagnostics & Health
router.get(
  "/system/health",
  requireAdminPermission(PERMISSIONS.SYSTEM_HEALTH_VIEW),
  staffController.getSystemHealth
);

module.exports = router;
