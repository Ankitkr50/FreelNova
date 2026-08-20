const catchAsync = require("../utils/catchAsync");
const enterpriseService = require("../services/enterprise.service");

// ── 1. Support Ticket + SLA Controller ────────────────────────────────────────

const getTickets = catchAsync(async (req, res) => {
  const result = await enterpriseService.getTickets(req.query);
  res.status(200).json({ success: true, data: result });
});

const createTicket = catchAsync(async (req, res) => {
  const ticket = await enterpriseService.createTicket(req.user, req.body);
  res.status(201).json({ success: true, data: ticket });
});

const assignTicket = catchAsync(async (req, res) => {
  const ticket = await enterpriseService.assignTicket(req.params.id, req.body.assignedToId, req.user, req);
  res.status(200).json({ success: true, data: ticket });
});

const updateTicketStatus = catchAsync(async (req, res) => {
  const ticket = await enterpriseService.updateTicketStatus(req.params.id, req.body.status, req.user, req);
  res.status(200).json({ success: true, data: ticket });
});

const addTicketMessage = catchAsync(async (req, res) => {
  const message = await enterpriseService.addTicketMessage(req.params.id, req.user, req.body);
  res.status(201).json({ success: true, data: message });
});

// ── 2. Dispute Resolution Controller ──────────────────────────────────────────

const getDisputeDetails = catchAsync(async (req, res) => {
  const dispute = await enterpriseService.getDisputeDetails(req.params.id);
  res.status(200).json({ success: true, data: dispute });
});

const updateDisputeState = catchAsync(async (req, res) => {
  const updated = await enterpriseService.updateDisputeState(req.params.id, req.body, req.user, req);
  res.status(200).json({ success: true, data: updated });
});

// ── 3. Finance Approval Controller ────────────────────────────────────────────

const getFinanceApprovals = catchAsync(async (req, res) => {
  const result = await enterpriseService.getFinanceApprovals(req.query);
  res.status(200).json({ success: true, data: result });
});

const createFinanceApprovalRequest = catchAsync(async (req, res) => {
  const approval = await enterpriseService.createFinanceApprovalRequest(req.user, req.body, req);
  res.status(201).json({ success: true, data: approval });
});

const processFinanceApproval = catchAsync(async (req, res) => {
  const updated = await enterpriseService.processFinanceApproval(req.params.id, req.body.action, req.body, req.user, req);
  res.status(200).json({ success: true, data: updated });
});

// ── 4. Security & Fraud Controller ───────────────────────────────────────────

const getSecurityDashboardSignals = catchAsync(async (req, res) => {
  const data = await enterpriseService.getSecurityDashboardSignals();
  res.status(200).json({ success: true, data });
});

const resolveSecurityAlert = catchAsync(async (req, res) => {
  const updated = await enterpriseService.resolveSecurityAlert(req.params.id, req.user, req);
  res.status(200).json({ success: true, data: updated });
});

// ── 5. Company Analytics Controller ───────────────────────────────────────────

const getCompanyAnalyticsData = catchAsync(async (req, res) => {
  const data = await enterpriseService.getCompanyAnalyticsData(req.user);
  res.status(200).json({ success: true, data });
});

// ── 6. Knowledge Base Controller ──────────────────────────────────────────────

const getKnowledgeArticles = catchAsync(async (req, res) => {
  const result = await enterpriseService.getKnowledgeArticles(req.query, req.user);
  res.status(200).json({ success: true, data: result });
});

const createKnowledgeArticle = catchAsync(async (req, res) => {
  const article = await enterpriseService.createKnowledgeArticle(req.user, req.body);
  res.status(201).json({ success: true, data: article });
});

// ── 7. Handover Controller ───────────────────────────────────────────────────

const executeEmployeeHandover = catchAsync(async (req, res) => {
  const handover = await enterpriseService.executeEmployeeHandover(req.user, req.body, req);
  res.status(201).json({ success: true, data: handover });
});

const getHandovers = catchAsync(async (req, res) => {
  const handovers = await enterpriseService.getHandovers();
  res.status(200).json({ success: true, data: handovers });
});

// ── 8. Internal Notes Controller ──────────────────────────────────────────────

const getInternalNotes = catchAsync(async (req, res) => {
  const { entityType, entityId } = req.params;
  const notes = await enterpriseService.getInternalNotes(entityType, entityId);
  res.status(200).json({ success: true, data: notes });
});

const createInternalNote = catchAsync(async (req, res) => {
  const note = await enterpriseService.createInternalNote(req.user, req.body, req);
  res.status(201).json({ success: true, data: note });
});

// ── 9. Notifications 2.0 Controller ───────────────────────────────────────────

const sendTargetedNotification = catchAsync(async (req, res) => {
  const result = await enterpriseService.sendTargetedNotification(req.user, req.body);
  res.status(200).json({ success: true, data: result });
});

// ── 10. Command Center Controller ────────────────────────────────────────────

const getCommandCenterData = catchAsync(async (req, res) => {
  const data = await enterpriseService.getCommandCenterData();
  res.status(200).json({ success: true, data });
});

// ── 11. Sensitive Action Controller ─────────────────────────────────────────

const requestSensitiveAction = catchAsync(async (req, res) => {
  const action = await enterpriseService.requestSensitiveAction(req.user, req.body, req);
  res.status(201).json({ success: true, data: action });
});

const approveSensitiveAction = catchAsync(async (req, res) => {
  const updated = await enterpriseService.approveSensitiveAction(req.params.id, req.body.decision, req.body, req.user, req);
  res.status(200).json({ success: true, data: updated });
});

// ── 12. Case Management Controller ───────────────────────────────────────────

const getCases = catchAsync(async (req, res) => {
  const result = await enterpriseService.getCases(req.query);
  res.status(200).json({ success: true, data: result });
});

const createCase = catchAsync(async (req, res) => {
  const enterpriseCase = await enterpriseService.createCase(req.user, req.body, req);
  res.status(201).json({ success: true, data: enterpriseCase });
});

// ── 13. Policy & Compliance Controller ───────────────────────────────────────

const getPolicies = catchAsync(async (req, res) => {
  const policies = await enterpriseService.getPolicies();
  res.status(200).json({ success: true, data: policies });
});

const createOrUpdatePolicy = catchAsync(async (req, res) => {
  const policy = await enterpriseService.createOrUpdatePolicy(req.user, req.body);
  res.status(200).json({ success: true, data: policy });
});

module.exports = {
  getTickets,
  createTicket,
  assignTicket,
  updateTicketStatus,
  addTicketMessage,
  getDisputeDetails,
  updateDisputeState,
  getFinanceApprovals,
  createFinanceApprovalRequest,
  processFinanceApproval,
  getSecurityDashboardSignals,
  resolveSecurityAlert,
  getCompanyAnalyticsData,
  getKnowledgeArticles,
  createKnowledgeArticle,
  executeEmployeeHandover,
  getHandovers,
  getInternalNotes,
  createInternalNote,
  sendTargetedNotification,
  getCommandCenterData,
  requestSensitiveAction,
  approveSensitiveAction,
  getCases,
  createCase,
  getPolicies,
  createOrUpdatePolicy,
};
