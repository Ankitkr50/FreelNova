export const PERMISSIONS = Object.freeze({
  // Users
  USERS_VIEW: "users_view",
  USERS_MANAGE: "users_manage",

  // Projects
  PROJECTS_VIEW: "projects_view",
  PROJECTS_MANAGE: "projects_manage",
  PROJECTS_MODERATE: "projects_moderate",

  // Payments & Finance
  PAYMENTS_VIEW: "payments_view",
  PAYMENTS_MANAGE: "payments_manage",
  ESCROW_VIEW: "escrow_view",
  ESCROW_MANAGE: "escrow_manage",
  WITHDRAWALS_VIEW: "withdrawals_view",
  WITHDRAWALS_APPROVE: "withdrawals_approve",
  REFUNDS_VIEW: "refunds_view",
  REFUNDS_MANAGE: "refunds_manage",
  FINANCIAL_REPORTS_VIEW: "financial_reports_view",

  // Disputes & Support
  DISPUTES_VIEW: "disputes_view",
  DISPUTES_RESOLVE: "disputes_resolve",
  CHAT_VIEW: "chat_view",
  CHAT_MANAGE: "chat_manage",
  SUPPORT_TICKETS_MANAGE: "support_tickets_manage",

  // Reports & Reviews
  REPORTS_VIEW: "reports_view",
  REPORTS_MANAGE: "reports_manage",
  REVIEWS_MODERATE: "reviews_moderate",

  // Staff & RBAC
  STAFF_VIEW: "staff_view",
  STAFF_MANAGE: "staff_manage",
  PERMISSIONS_MANAGE: "permissions_manage",

  // System & Audit
  AUDIT_LOGS_VIEW: "audit_logs_view",
  SYSTEM_HEALTH_VIEW: "system_health_view",
  SYSTEM_LOGS_VIEW: "system_logs_view",
  SETTINGS_MANAGE: "settings_manage",

  // Enterprise Operations & Governance System (Additive)
  TICKETS_VIEW: "tickets_view",
  TICKETS_MANAGE: "tickets_manage",
  TICKETS_ASSIGN: "tickets_assign",
  TICKETS_ESCALATE: "tickets_escalate",
  DISPUTES_MANAGE: "disputes_manage",
  FINANCE_VIEW: "finance_view",
  FINANCE_APPROVE: "finance_approve",
  REFUND_APPROVE: "refund_approve",
  ESCROW_APPROVE: "escrow_approve",
  SECURITY_VIEW: "security_view",
  SECURITY_INVESTIGATE: "security_investigate",
  SECURITY_RESTRICT: "security_restrict",
  ANALYTICS_VIEW: "analytics_view",
  ANALYTICS_FINANCE_VIEW: "analytics_finance_view",
  KNOWLEDGE_VIEW: "knowledge_view",
  KNOWLEDGE_MANAGE: "knowledge_manage",
  HANDOVER_VIEW: "handover_view",
  HANDOVER_MANAGE: "handover_manage",
  INTERNAL_NOTES_VIEW: "internal_notes_view",
  INTERNAL_NOTES_CREATE: "internal_notes_create",
  NOTIFICATIONS_SEND: "notifications_send",
  NOTIFICATIONS_MANAGE: "notifications_manage",
  CASES_VIEW: "cases_view",
  CASES_MANAGE: "cases_manage",
  POLICIES_VIEW: "policies_view",
  POLICIES_MANAGE: "policies_manage",
  SENSITIVE_ACTIONS_REQUEST: "sensitive_actions_request",
  SENSITIVE_ACTIONS_APPROVE: "sensitive_actions_approve",
});

export const ADMIN_ROLES = Object.freeze({
  SUPER_ADMIN: "SUPER_ADMIN",
  FINANCE_ADMIN: "FINANCE_ADMIN",
  SUPPORT_STAFF: "SUPPORT_STAFF",
  MODERATOR: "MODERATOR",
  DEVELOPER: "DEVELOPER",
  CUSTOM: "CUSTOM",
});

export const ROLE_LABELS = {
  [ADMIN_ROLES.SUPER_ADMIN]: "Super Administrator (Full Access)",
  [ADMIN_ROLES.FINANCE_ADMIN]: "Finance & Escrow Administrator",
  [ADMIN_ROLES.SUPPORT_STAFF]: "Customer Support & Disputes Specialist",
  [ADMIN_ROLES.MODERATOR]: "Content & Project Moderator",
  [ADMIN_ROLES.DEVELOPER]: "Platform Engineer / Developer",
  [ADMIN_ROLES.CUSTOM]: "Custom Role (Granular Permissions)",
};

export const ROLE_COLORS = {
  [ADMIN_ROLES.SUPER_ADMIN]: "border-rose-300 bg-rose-50 text-rose-700",
  [ADMIN_ROLES.FINANCE_ADMIN]: "border-emerald-300 bg-emerald-50 text-emerald-700",
  [ADMIN_ROLES.SUPPORT_STAFF]: "border-blue-300 bg-blue-50 text-blue-700",
  [ADMIN_ROLES.MODERATOR]: "border-purple-300 bg-purple-50 text-purple-700",
  [ADMIN_ROLES.DEVELOPER]: "border-amber-300 bg-amber-50 text-amber-700",
  [ADMIN_ROLES.CUSTOM]: "border-slate-300 bg-slate-100 text-slate-700",
};

export const ROLE_ICONS = {
  [ADMIN_ROLES.SUPER_ADMIN]: "https://cdn-icons-png.flaticon.com/128/12724/12724695.png",
  [ADMIN_ROLES.FINANCE_ADMIN]: "https://cdn-icons-png.flaticon.com/128/3594/3594449.png",
  [ADMIN_ROLES.SUPPORT_STAFF]: "https://cdn-icons-png.flaticon.com/128/3203/3203492.png",
  [ADMIN_ROLES.MODERATOR]: "https://cdn-icons-png.flaticon.com/128/14529/14529333.png",
  [ADMIN_ROLES.DEVELOPER]: "https://cdn-icons-png.flaticon.com/128/3242/3242244.png",
  [ADMIN_ROLES.CUSTOM]: "https://cdn-icons-png.flaticon.com/128/18450/18450783.png",
};


export const PERMISSION_GROUPS = [
  {
    name: "User Management",
    permissions: [
      { key: PERMISSIONS.USERS_VIEW, label: "View Users", description: "View all freelancers, clients, and user profiles" },
      { key: PERMISSIONS.USERS_MANAGE, label: "Manage Users", description: "Verify, block, unblock, and suspend user accounts" },
    ],
  },
  {
    name: "Projects & Content",
    permissions: [
      { key: PERMISSIONS.PROJECTS_VIEW, label: "View Projects", description: "View all posted marketplace projects and bids" },
      { key: PERMISSIONS.PROJECTS_MANAGE, label: "Manage Projects", description: "Edit, update project status or details" },
      { key: PERMISSIONS.PROJECTS_MODERATE, label: "Moderate Projects", description: "Approve, flag, or remove policy-violating projects" },
      { key: PERMISSIONS.REVIEWS_MODERATE, label: "Moderate Reviews", description: "Inspect and moderate user reviews and ratings" },
    ],
  },
  {
    name: "Payments & Escrow Finance",
    permissions: [
      { key: PERMISSIONS.PAYMENTS_VIEW, label: "View Payments", description: "View all transactions and payment records" },
      { key: PERMISSIONS.PAYMENTS_MANAGE, label: "Manage Payments", description: "Approve or flag payment transactions" },
      { key: PERMISSIONS.ESCROW_VIEW, label: "View Escrow", description: "Inspect funds held in platform escrow" },
      { key: PERMISSIONS.ESCROW_MANAGE, label: "Manage Escrow", description: "Authorize escrow releases or holds" },
      { key: PERMISSIONS.WITHDRAWALS_VIEW, label: "View Payouts", description: "View freelancer withdrawal and payout requests" },
      { key: PERMISSIONS.WITHDRAWALS_APPROVE, label: "Approve Payouts", description: "Authorize manual or automated payout disbursements" },
      { key: PERMISSIONS.REFUNDS_VIEW, label: "View Refunds", description: "View refund requests and histories" },
      { key: PERMISSIONS.REFUNDS_MANAGE, label: "Process Refunds", description: "Issue and process client refund requests" },
      { key: PERMISSIONS.FINANCIAL_REPORTS_VIEW, label: "View Financial Intelligence", description: "Access platform turnover, GMV, and revenue metrics" },
    ],
  },
  {
    name: "Disputes & Support",
    permissions: [
      { key: PERMISSIONS.DISPUTES_VIEW, label: "View Disputes", description: "View open and resolved project disputes" },
      { key: PERMISSIONS.DISPUTES_RESOLVE, label: "Resolve Disputes", description: "Issue binding dispute verdicts and arbitration" },
      { key: PERMISSIONS.CHAT_VIEW, label: "View Chat Logs", description: "Inspect workspace chat transcripts for policy compliance" },
      { key: PERMISSIONS.CHAT_MANAGE, label: "Manage Chats", description: "Mute or intervene in project message threads" },
      { key: PERMISSIONS.SUPPORT_TICKETS_MANAGE, label: "Manage Support Tickets", description: "Respond to and resolve incoming help requests" },
    ],
  },
  {
    name: "Staff & RBAC Administration",
    permissions: [
      { key: PERMISSIONS.STAFF_VIEW, label: "View Staff Team", description: "View company staff members and pending invitations" },
      { key: PERMISSIONS.STAFF_MANAGE, label: "Manage Staff", description: "Invite new staff, suspend, reactivate, or revoke staff" },
      { key: PERMISSIONS.PERMISSIONS_MANAGE, label: "Manage Permissions", description: "Assign and modify staff role permissions" },
    ],
  },
  {
    name: "System, Logs & Diagnostics",
    permissions: [
      { key: PERMISSIONS.AUDIT_LOGS_VIEW, label: "View Audit Logs", description: "Inspect immutable audit trails of all staff operations" },
      { key: PERMISSIONS.SYSTEM_HEALTH_VIEW, label: "View System Health", description: "Inspect server uptime, memory, and database status" },
      { key: PERMISSIONS.SYSTEM_LOGS_VIEW, label: "View System Logs", description: "Access application server event logs" },
      { key: PERMISSIONS.SETTINGS_MANAGE, label: "Manage Settings", description: "Configure system-wide platform settings and policies" },
    ],
  },
];
