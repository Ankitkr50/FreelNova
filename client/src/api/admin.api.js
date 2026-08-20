import http from "./http";

const getRows = (response) => response?.data?.data || [];

export const adminApi = {
  getIntelligence: (date, range) => http.get("/admin/intelligence", { params: { date, range } }),
  listUsers: (params = {}) => http.get("/admin/users", { params }),
  getUserDetails: (id) => http.get(`/admin/users/${id}/details`),
  updateUserStatus: (id, payload) => http.patch(`/admin/users/${id}/status`, payload),

  listProjects: (params = {}) => http.get("/admin/projects", { params }),
  getProjectDetails: (id) => http.get(`/admin/projects/${id}/details`),
  moderateProject: (id, payload) => http.patch(`/admin/projects/${id}/moderate`, payload),

  listPayments: (params = {}) => http.get("/admin/payments", { params }),
  reviewPayment: (id, payload) => http.patch(`/admin/payments/${id}/review`, payload),

  listDisputes: (params = {}) => http.get("/admin/disputes", { params }),
  createDispute: (payload) => http.post("/admin/disputes", payload),
  patchDispute: (id, payload) => http.patch(`/admin/disputes/${id}`, payload),

  // RBAC Staff & Team Management
  listStaff: () => http.get("/admin/staff"),
  inviteStaff: (payload) => http.post("/admin/staff/invite", payload),
  getInvitationDetails: (token) => http.get(`/admin/staff/invitations/${token}`),
  acceptInvitation: (token, payload) => http.post(`/admin/staff/invitations/${token}/accept`, payload),
  updateStaffRoleAndPermissions: (id, payload) => http.patch(`/admin/staff/${id}/role-permissions`, payload),
  updateStaffStatus: (id, payload) => http.patch(`/admin/staff/${id}/status`, payload),
  demoteStaffToUser: (id) => http.patch(`/admin/staff/${id}/demote`),
  cancelInvitation: (id) => http.delete(`/admin/staff/invitations/${id}`),

  // Audit Logs & System Health
  listAuditLogs: (params = {}) => http.get("/admin/audit-logs", { params }),
  getSystemHealth: () => http.get("/admin/system/health"),

  // Security Center & 2FA / Session Management
  getMfaStatus: () => http.get("/admin/security/mfa/status"),
  setupMfa: () => http.post("/admin/security/mfa/setup"),
  verifyAndEnableMfa: (payload) => http.post("/admin/security/mfa/verify", payload),
  disableMfa: () => http.post("/admin/security/mfa/disable"),
  listSessions: () => http.get("/admin/security/sessions"),
  revokeSession: (sessionId) => http.delete(`/admin/security/sessions/${sessionId}`),
  revokeAllOtherSessions: () => http.delete("/admin/security/sessions"),
  listSecurityAlerts: (params = {}) => http.get("/admin/security/alerts", { params }),
  resolveSecurityAlert: (alertId) => http.patch(`/admin/security/alerts/${alertId}/resolve`),

  // Financial Ledger & Reconciliation
  getLedgerEntries: (params = {}) => http.get("/admin/ledger", { params }),
  getReconciliationReport: () => http.get("/admin/ledger/reconciliation"),
  createAdjustment: (payload) => http.post("/admin/ledger/adjust", payload),

  // Support Tickets
  listTickets: (params = {}) => http.get("/admin/tickets", { params }),
  getTicketDetails: (ticketId) => http.get(`/admin/tickets/${ticketId}`),
  addTicketMessage: (ticketId, payload) => http.post(`/admin/tickets/${ticketId}/messages`, payload),
  updateTicket: (ticketId, payload) => http.patch(`/admin/tickets/${ticketId}`, payload),

  // Feature Flags
  listFeatureFlags: () => http.get("/admin/feature-flags"),
  toggleFeatureFlag: (flagId, payload) => http.patch(`/admin/feature-flags/${flagId}`, payload),

  listByTab: async (tab, params = {}) => {
    if (tab === "users") {
      const response = await adminApi.listUsers(params);
      return { rows: getRows(response), meta: response?.data?.meta || {} };
    }
    if (tab === "projects") {
      const response = await adminApi.listProjects(params);
      return { rows: getRows(response), meta: response?.data?.meta || {} };
    }
    if (tab === "payments") {
      const response = await adminApi.listPayments(params);
      return { rows: getRows(response), meta: response?.data?.meta || {} };
    }
    if (tab === "disputes") {
      const response = await adminApi.listDisputes(params);
      return { rows: getRows(response), meta: response?.data?.meta || {} };
    }
    return { rows: [], meta: {} };
  },
};
