import http from "./http";

export const enterpriseApi = {
  // 1. Support Ticket + SLA
  listTickets: (params = {}) => http.get("/enterprise/tickets", { params }),
  createTicket: (payload) => http.post("/enterprise/tickets", payload),
  assignTicket: (id, assignedToId) => http.patch(`/enterprise/tickets/${id}/assign`, { assignedToId }),
  updateTicketStatus: (id, status) => http.patch(`/enterprise/tickets/${id}/status`, { status }),
  addTicketMessage: (id, payload) => http.post(`/enterprise/tickets/${id}/messages`, payload),

  // 2. Dispute Resolution
  getDisputeDetails: (id) => http.get(`/enterprise/disputes/${id}/details`),
  updateDisputeState: (id, payload) => http.patch(`/enterprise/disputes/${id}/state`, payload),

  // 3. Finance Approvals
  listFinanceApprovals: (params = {}) => http.get("/enterprise/finance-approvals", { params }),
  createFinanceApprovalRequest: (payload) => http.post("/enterprise/finance-approvals", payload),
  processFinanceApproval: (id, action, payload = {}) =>
    http.post(`/enterprise/finance-approvals/${id}/process`, { action, ...payload }),

  // 4. Security & Fraud Center
  getSecuritySignals: () => http.get("/enterprise/security-signals"),
  resolveSecurityAlert: (id) => http.patch(`/enterprise/security-alerts/${id}/resolve`),

  // 5. Company Analytics
  getCompanyAnalytics: () => http.get("/enterprise/analytics"),

  // 6. Knowledge Base
  listKnowledgeArticles: (params = {}) => http.get("/enterprise/knowledge", { params }),
  createKnowledgeArticle: (payload) => http.post("/enterprise/knowledge", payload),

  // 7. Employee Handover
  listHandovers: () => http.get("/enterprise/handover"),
  executeHandover: (payload) => http.post("/enterprise/handover", payload),

  // 8. Internal Notes
  listInternalNotes: (entityType, entityId) => http.get(`/enterprise/notes/${entityType}/${entityId}`),
  createInternalNote: (payload) => http.post("/enterprise/notes", payload),

  // 9. Notification Center 2.0
  sendTargetedNotification: (payload) => http.post("/enterprise/notifications/targeted", payload),

  // 10. Command Center
  getCommandCenter: () => http.get("/enterprise/command-center"),

  // 11. Sensitive Action Center
  requestSensitiveAction: (payload) => http.post("/enterprise/sensitive-actions/request", payload),
  approveSensitiveAction: (id, decision, payload = {}) =>
    http.post(`/enterprise/sensitive-actions/${id}/approve`, { decision, ...payload }),

  // 12. Case Management
  listCases: (params = {}) => http.get("/enterprise/cases", { params }),
  createCase: (payload) => http.post("/enterprise/cases", payload),

  // 13. Policy & Compliance
  listPolicies: () => http.get("/enterprise/policies"),
  savePolicy: (payload) => http.post("/enterprise/policies", payload),
};
