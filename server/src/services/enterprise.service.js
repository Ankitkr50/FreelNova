const { prisma } = require("../config/db");
const ApiError = require("../utils/apiError");
const { AUDIT_ACTIONS } = require("../constants/permissions");

/**
 * Enterprise Service handling all 13 Enterprise Operations & Governance Modules
 */

// Helper to log admin audit trail
async function createAuditLog({ adminUserId, action, targetType, targetId, metadata, req }) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: adminUserId || null,
        action,
        targetType: targetType || null,
        targetId: targetId ? String(targetId) : null,
        metadata: metadata || {},
        ipAddress: req ? (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null) : null,
        userAgent: req ? (req.headers["user-agent"] || null) : null,
      },
    });
  } catch (err) {
    console.error("Failed to create audit log:", err.message);
  }
}

// SLA Calculation Target Hours by Priority
const SLA_TARGET_HOURS = {
  CRITICAL: 2,
  URGENT: 4,
  HIGH: 8,
  MEDIUM: 24,
  LOW: 48,
};

// ── 1. Support Ticket + SLA Service ──────────────────────────────────────────

async function getTickets({ status, priority, category, assignedToId, search, page = 1, limit = 20 }) {
  const where = {};
  if (status && status !== "all") where.status = status;
  if (priority && priority !== "all") where.priority = priority;
  if (category && category !== "all") where.category = category;
  if (assignedToId) where.assignedToId = assignedToId;
  if (search) {
    where.OR = [
      { ticketNumber: { contains: search, mode: "insensitive" } },
      { subject: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * limit;
  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        assignedTo: { select: { id: true, name: true, email: true, adminRole: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          include: { sender: { select: { id: true, name: true, role: true } } },
        },
      },
    }),
    prisma.supportTicket.count({ where }),
  ]);

  // Check SLA status for each ticket
  const now = new Date();
  const processedTickets = tickets.map((t) => {
    const targetHours = SLA_TARGET_HOURS[t.priority] || 24;
    const slaDeadline = t.slaDeadline || new Date(new Date(t.createdAt).getTime() + targetHours * 60 * 60 * 1000);
    const isSlaBreached = !["RESOLVED", "CLOSED"].includes(t.status) && now > new Date(slaDeadline);
    return {
      ...t,
      slaDeadline,
      isSlaBreached,
    };
  });

  return { tickets: processedTickets, total, page: Number(page), totalPages: Math.ceil(total / limit) };
}

async function createTicket(user, ticketData) {
  const { category, priority = "MEDIUM", subject, description } = ticketData;
  const count = await prisma.supportTicket.count();
  const ticketNumber = `TKT-FN-${String(count + 1).padStart(6, "0")}`;

  const targetHours = SLA_TARGET_HOURS[priority] || 24;
  const slaDeadline = new Date(Date.now() + targetHours * 60 * 60 * 1000);

  const ticket = await prisma.supportTicket.create({
    data: {
      ticketNumber,
      userId: user.id,
      category,
      priority,
      status: "OPEN",
      subject,
      description,
      slaDeadline,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return ticket;
}

async function assignTicket(ticketId, assignedToId, staffUser, req) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new ApiError(404, "Ticket not found");

  const updated = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      assignedToId,
      status: ticket.status === "OPEN" ? "ASSIGNED" : ticket.status,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });

  await createAuditLog({
    adminUserId: staffUser.id,
    action: AUDIT_ACTIONS.EMPLOYEE_ASSIGNED_TICKET,
    targetType: "SupportTicket",
    targetId: ticketId,
    metadata: { assignedToId, ticketNumber: ticket.ticketNumber },
    req,
  });

  return updated;
}

async function updateTicketStatus(ticketId, status, staffUser, req) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new ApiError(404, "Ticket not found");

  const updateData = { status };
  if (status === "RESOLVED") {
    updateData.resolvedAt = new Date();
    if (ticket.createdAt) {
      updateData.slaResolutionTime = Math.round((Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60));
    }
  } else if (status === "CLOSED") {
    updateData.closedAt = new Date();
  }

  const updated = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: updateData,
  });

  await createAuditLog({
    adminUserId: staffUser.id,
    action: AUDIT_ACTIONS.TICKET_STATUS_CHANGED,
    targetType: "SupportTicket",
    targetId: ticketId,
    metadata: { oldStatus: ticket.status, newStatus: status },
    req,
  });

  return updated;
}

async function addTicketMessage(ticketId, senderUser, { message, isInternalNote = false, attachments = [] }) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new ApiError(404, "Ticket not found");

  const newMsg = await prisma.ticketMessage.create({
    data: {
      ticketId,
      senderId: senderUser.id,
      message,
      isInternalNote: senderUser.role === "admin" ? Boolean(isInternalNote) : false,
      attachments,
    },
    include: {
      sender: { select: { id: true, name: true, role: true } },
    },
  });

  return newMsg;
}

// ── 2. Dispute Resolution Center Service ────────────────────────────────────

async function getDisputeDetails(disputeId) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      project: {
        include: {
          recruiter: { select: { id: true, name: true, email: true, role: true } },
          freelancer: { select: { id: true, name: true, email: true, role: true } },
          payments: true,
        },
      },
      payment: true,
      raiser: { select: { id: true, name: true, email: true, role: true } },
      againstUser: { select: { id: true, name: true, email: true, role: true } },
      admin: { select: { id: true, name: true, email: true } },
      timeline: {
        orderBy: { createdAt: "asc" },
        include: { actor: { select: { id: true, name: true, role: true } } },
      },
    },
  });
  if (!dispute) throw new ApiError(404, "Dispute not found");

  // Also fetch internal notes for this dispute
  const internalNotes = await prisma.internalNote.findMany({
    where: { entityType: "DISPUTE", entityId: disputeId },
    orderBy: { createdAt: "desc" },
  });

  return { ...dispute, internalNotes };
}

async function updateDisputeState(disputeId, { status, resolutionNote, assignedAdminId }, staffUser, req) {
  const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } });
  if (!dispute) throw new ApiError(404, "Dispute not found");

  const updateData = {};
  if (status) updateData.status = status;
  if (resolutionNote) updateData.resolutionNote = resolutionNote;
  if (assignedAdminId) updateData.assignedAdminId = assignedAdminId;
  if (status === "resolved") updateData.resolvedAt = new Date();

  const updated = await prisma.dispute.update({
    where: { id: disputeId },
    data: updateData,
  });

  await prisma.disputeTimeline.create({
    data: {
      disputeId,
      event: `Dispute status updated to ${status || dispute.status}`,
      note: resolutionNote || "Dispute managed by staff",
      actorId: staffUser.id,
    },
  });

  await createAuditLog({
    adminUserId: staffUser.id,
    action: AUDIT_ACTIONS.DISPUTE_RESOLVED,
    targetType: "Dispute",
    targetId: disputeId,
    metadata: { oldStatus: dispute.status, newStatus: status || dispute.status },
    req,
  });

  return updated;
}

// ── 3. Finance Approval Workflow Service ────────────────────────────────────

async function getFinanceApprovals({ status, requestType, page = 1, limit = 20 }) {
  const where = {};
  if (status && status !== "all") where.status = status;
  if (requestType && requestType !== "all") where.requestType = requestType;

  const skip = (page - 1) * limit;
  const [approvals, total] = await Promise.all([
    prisma.financeApproval.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    }),
    prisma.financeApproval.count({ where }),
  ]);

  return { approvals, total, page: Number(page), totalPages: Math.ceil(total / limit) };
}

async function createFinanceApprovalRequest(staffUser, data, req) {
  const { requestType, amount, targetType, targetId, reason } = data;
  const count = await prisma.financeApproval.count();
  const requestId = `FIN-APP-${String(count + 1).padStart(6, "0")}`;

  // High-value threshold: e.g. amount > 50,000 INR requires Super Admin approval
  const requiresSuperAdmin = Number(amount) > 50000;

  const approval = await prisma.financeApproval.create({
    data: {
      requestId,
      requestType,
      amount: Number(amount),
      targetType,
      targetId: String(targetId),
      requesterId: staffUser.id,
      status: "PENDING",
      requiresSuperAdmin,
      reason,
    },
  });

  await createAuditLog({
    adminUserId: staffUser.id,
    action: AUDIT_ACTIONS.FINANCE_APPROVAL_CREATED,
    targetType: "FinanceApproval",
    targetId: approval.id,
    metadata: { requestId, requestType, amount, requiresSuperAdmin },
    req,
  });

  return approval;
}

async function processFinanceApproval(approvalId, action, { rejectionReason }, staffUser, req) {
  const approval = await prisma.financeApproval.findUnique({ where: { id: approvalId } });
  if (!approval) throw new ApiError(404, "Finance approval request not found");
  if (approval.status !== "PENDING" && approval.status !== "REVIEWING") {
    throw new ApiError(400, `Approval request is already in status: ${approval.status}`);
  }

  // Check if Super Admin is required and staff isn't Super Admin
  const isSuperAdmin = staffUser.adminRole === "SUPER_ADMIN" || staffUser.email === "fn.freelnova@gmail.com";
  if (approval.requiresSuperAdmin && !isSuperAdmin && action === "APPROVE") {
    throw new ApiError(403, "High-value financial approval requires Super Admin authorization");
  }

  let newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
  const updateData = {
    status: newStatus,
    reviewerId: staffUser.id,
    approverId: action === "APPROVE" ? staffUser.id : null,
    rejectionReason: action === "REJECT" ? rejectionReason : null,
  };

  const updated = await prisma.financeApproval.update({
    where: { id: approvalId },
    data: updateData,
  });

  await createAuditLog({
    adminUserId: staffUser.id,
    action: AUDIT_ACTIONS.FINANCE_APPROVAL_EXECUTED,
    targetType: "FinanceApproval",
    targetId: approvalId,
    metadata: { requestId: approval.requestId, action, newStatus },
    req,
  });

  return updated;
}

// ── 4. Security & Fraud Center Service ──────────────────────────────────────

async function getSecurityDashboardSignals() {
  const [alerts, flaggedUsers, chatReports, recentAudits] = await Promise.all([
    prisma.securityAlert.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        targetUser: { select: { id: true, name: true, email: true, role: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.user.findMany({
      where: { moderationStatus: { in: ["suspended", "blocked"] } },
      take: 20,
      select: { id: true, name: true, email: true, role: true, moderationStatus: true, moderationNote: true },
    }),
    prisma.chatReport.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        reporter: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const riskCounts = {
    CRITICAL: alerts.filter((a) => a.severity === "CRITICAL" && !a.isResolved).length,
    HIGH: alerts.filter((a) => a.severity === "HIGH" && !a.isResolved).length,
    MEDIUM: alerts.filter((a) => a.severity === "MEDIUM" && !a.isResolved).length,
    LOW: alerts.filter((a) => a.severity === "LOW" && !a.isResolved).length,
  };

  return { alerts, flaggedUsers, chatReports, recentAudits, riskCounts };
}

async function resolveSecurityAlert(alertId, staffUser, req) {
  const alert = await prisma.securityAlert.findUnique({ where: { id: alertId } });
  if (!alert) throw new ApiError(404, "Security alert not found");

  const updated = await prisma.securityAlert.update({
    where: { id: alertId },
    data: {
      isResolved: true,
      resolvedById: staffUser.id,
      resolvedAt: new Date(),
    },
  });

  await createAuditLog({
    adminUserId: staffUser.id,
    action: AUDIT_ACTIONS.SECURITY_INCIDENT_RESOLVED,
    targetType: "SecurityAlert",
    targetId: alertId,
    req,
  });

  return updated;
}

// ── 5. Company Analytics Service ────────────────────────────────────────────

async function getCompanyAnalyticsData(staffUser) {
  const isFinanceAuthorized =
    staffUser.adminRole === "SUPER_ADMIN" ||
    (staffUser.adminPermissions &&
      (staffUser.adminPermissions.includes("analytics_finance_view") ||
        staffUser.adminPermissions.includes("financial_reports_view")));

  const [
    totalUsers,
    freelancersCount,
    recruitersCount,
    totalProjects,
    completedProjects,
    inProgressProjects,
    totalPayments,
    totalDisputes,
    openTickets,
    resolvedTickets,
    ledgers,
  ] = await Promise.all([
    prisma.user.count({ where: { role: { in: ["freelancer", "recruiter"] } } }),
    prisma.user.count({ where: { role: "freelancer" } }),
    prisma.user.count({ where: { role: "recruiter" } }),
    prisma.project.count(),
    prisma.project.count({ where: { status: "completed" } }),
    prisma.project.count({ where: { status: "in_progress" } }),
    prisma.payment.findMany({ select: { amount: true, status: true, escrowStatus: true } }),
    prisma.dispute.count(),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] } } }),
    prisma.supportTicket.count({ where: { status: "RESOLVED" } }),
    isFinanceAuthorized
      ? prisma.financialLedger.findMany({ select: { grossAmount: true, feeAmount: true, transactionType: true } })
      : [],
  ]);

  let totalGMV = 0;
  let platformRevenue = 0;
  let escrowHeld = 0;

  if (isFinanceAuthorized) {
    totalPayments.forEach((p) => {
      if (p.status === "captured") totalGMV += p.amount;
      if (p.escrowStatus === "held_in_escrow") escrowHeld += p.amount;
    });

    ledgers.forEach((l) => {
      platformRevenue += l.feeAmount || 0;
    });
  }

  const projectCompletionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;
  const disputeRate = totalProjects > 0 ? ((totalDisputes / totalProjects) * 100).toFixed(1) : "0.0";

  return {
    overview: {
      totalUsers,
      freelancersCount,
      recruitersCount,
      totalProjects,
      completedProjects,
      inProgressProjects,
      projectCompletionRate,
      totalDisputes,
      disputeRate,
      openTickets,
      resolvedTickets,
    },
    financial: isFinanceAuthorized
      ? {
          totalGMV,
          platformRevenue,
          escrowHeld,
        }
      : null,
  };
}

// ── 6. Internal Knowledge Base Service ──────────────────────────────────────

async function getKnowledgeArticles({ category, search, page = 1, limit = 20 }, staffUser) {
  const where = {};
  if (category && category !== "all") where.category = category;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
      { tags: { has: search } },
    ];
  }

  const skip = (page - 1) * limit;
  const [articles, total] = await Promise.all([
    prisma.knowledgeArticle.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { updatedAt: "desc" },
    }),
    prisma.knowledgeArticle.count({ where }),
  ]);

  return { articles, total, page: Number(page), totalPages: Math.ceil(total / limit) };
}

async function createKnowledgeArticle(staffUser, data) {
  const { title, category, content, allowedRoles = [], tags = [] } = data;
  const count = await prisma.knowledgeArticle.count();
  const articleId = `KNB-${String(count + 1).padStart(4, "0")}`;

  const article = await prisma.knowledgeArticle.create({
    data: {
      articleId,
      title,
      category,
      content,
      authorId: staffUser.id,
      allowedRoles,
      tags,
    },
  });

  return article;
}

// ── 7. Employee Handover System Service ─────────────────────────────────────

async function executeEmployeeHandover(staffUser, { fromEmployeeId, toEmployeeId, reason, notes }, req) {
  const [fromUser, toUser] = await Promise.all([
    prisma.user.findUnique({ where: { id: fromEmployeeId } }),
    prisma.user.findUnique({ where: { id: toEmployeeId } }),
  ]);

  if (!fromUser || !toUser) throw new ApiError(404, "Target employee accounts not found");

  // Re-assign active tickets
  const ticketsResult = await prisma.supportTicket.updateMany({
    where: { assignedToId: fromEmployeeId, status: { notIn: ["RESOLVED", "CLOSED"] } },
    data: { assignedToId: toEmployeeId },
  });

  // Re-assign active disputes
  const disputesResult = await prisma.dispute.updateMany({
    where: { assignedAdminId: fromEmployeeId, status: { notIn: ["resolved", "closed"] } },
    data: { assignedAdminId: toEmployeeId },
  });

  // Re-assign active cases
  const casesResult = await prisma.enterpriseCase.updateMany({
    where: { assignedEmployeeId: fromEmployeeId, status: { notIn: ["RESOLVED", "CLOSED"] } },
    data: { assignedEmployeeId: toEmployeeId },
  });

  const count = await prisma.employeeHandover.count();
  const handoverId = `HDO-${String(count + 1).padStart(5, "0")}`;

  const handover = await prisma.employeeHandover.create({
    data: {
      handoverId,
      fromEmployeeId,
      toEmployeeId,
      transferredById: staffUser.id,
      reason,
      notes: notes || "",
      itemsSummary: {
        ticketsTransferred: ticketsResult.count,
        disputesTransferred: disputesResult.count,
        casesTransferred: casesResult.count,
      },
    },
  });

  await createAuditLog({
    adminUserId: staffUser.id,
    action: AUDIT_ACTIONS.HANDOVER_EXECUTED,
    targetType: "EmployeeHandover",
    targetId: handover.id,
    metadata: { handoverId, fromEmployeeId, toEmployeeId },
    req,
  });

  return handover;
}

async function getHandovers() {
  const handovers = await prisma.employeeHandover.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Hydrate user info
  const userIds = [
    ...new Set(handovers.flatMap((h) => [h.fromEmployeeId, h.toEmployeeId, h.transferredById])),
  ];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return handovers.map((h) => ({
    ...h,
    fromEmployee: userMap[h.fromEmployeeId] || null,
    toEmployee: userMap[h.toEmployeeId] || null,
    transferredBy: userMap[h.transferredById] || null,
  }));
}

// ── 8. Internal Notes Service ───────────────────────────────────────────────

async function getInternalNotes(entityType, entityId) {
  const notes = await prisma.internalNote.findMany({
    where: { entityType, entityId: String(entityId) },
    orderBy: { createdAt: "desc" },
  });

  const authorIds = [...new Set(notes.map((n) => n.authorId))];
  const authors = await prisma.user.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, name: true, email: true },
  });
  const authorMap = Object.fromEntries(authors.map((u) => [u.id, u]));

  return notes.map((n) => ({
    ...n,
    author: authorMap[n.authorId] || null,
  }));
}

async function createInternalNote(staffUser, { entityType, entityId, noteText, priority = "NORMAL", isConfidential = false }, req) {
  const note = await prisma.internalNote.create({
    data: {
      entityType,
      entityId: String(entityId),
      authorId: staffUser.id,
      noteText,
      priority,
      isConfidential,
    },
  });

  await createAuditLog({
    adminUserId: staffUser.id,
    action: AUDIT_ACTIONS.INTERNAL_NOTE_CREATED,
    targetType: entityType,
    targetId: String(entityId),
    req,
  });

  return note;
}

// ── 9. Notification Center 2.0 Service ──────────────────────────────────────

async function sendTargetedNotification(staffUser, { targetType, targetValue, priority = "INFORMATION", title, message, entityType, entityId, deepLink }) {
  let recipients = [];

  if (targetType === "USER") {
    recipients = await prisma.user.findMany({ where: { id: targetValue }, select: { id: true } });
  } else if (targetType === "ROLE") {
    recipients = await prisma.user.findMany({ where: { adminRole: targetValue, role: "admin" }, select: { id: true } });
  } else if (targetType === "ALL_STAFF") {
    recipients = await prisma.user.findMany({ where: { role: "admin" }, select: { id: true } });
  }

  const notificationsData = recipients.map((r) => ({
    recipientId: r.id,
    type: priority,
    title,
    message,
    entityType: entityType || "ENTERPRISE",
    entityId: entityId ? String(entityId) : null,
    metadata: { priority, deepLink: deepLink || "", sentBy: staffUser.name },
  }));

  if (notificationsData.length > 0) {
    await prisma.notification.createMany({ data: notificationsData });
  }

  return { count: notificationsData.length };
}

// ── 10. Super Admin Command Center Service ──────────────────────────────────

async function getCommandCenterData() {
  const now = new Date();
  const [
    openTickets,
    slaBreachedTicketsCount,
    pendingDisputes,
    pendingFinanceApprovals,
    criticalSecurityAlerts,
    activeStaffCount,
    activeEscrowPayments,
  ] = await Promise.all([
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] } } }),
    prisma.supportTicket.count({
      where: {
        status: { notIn: ["RESOLVED", "CLOSED"] },
        slaDeadline: { lt: now },
      },
    }),
    prisma.dispute.count({ where: { status: { in: ["open", "in_review"] } } }),
    prisma.financeApproval.count({ where: { status: "PENDING" } }),
    prisma.securityAlert.count({ where: { severity: "CRITICAL", isResolved: false } }),
    prisma.user.count({ where: { role: "admin", staffStatus: "ACTIVE" } }),
    prisma.payment.findMany({
      where: { escrowStatus: "held_in_escrow" },
      select: { amount: true },
    }),
  ]);

  const pendingEscrowAmount = activeEscrowPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

  return {
    kpi: {
      criticalSecurityAlerts,
      pendingDisputes,
      pendingFinanceApprovals,
      openTickets,
      slaBreachedTickets: slaBreachedTicketsCount,
      activeStaffCount,
      pendingEscrowAmount,
    },
  };
}

// ── 11. Security Approval / Sensitive Action Center Service ──────────────────

async function requestSensitiveAction(staffUser, { actionCode, targetType, targetId, beforeState, afterState, reason }, req) {
  const sensitiveAction = await prisma.sensitiveActionApproval.create({
    data: {
      actionCode,
      requestedById: staffUser.id,
      targetType,
      targetId: String(targetId),
      status: "PENDING",
      beforeState: beforeState || {},
      afterState: afterState || {},
      reason,
    },
  });

  await createAuditLog({
    adminUserId: staffUser.id,
    action: AUDIT_ACTIONS.SENSITIVE_ACTION_REQUESTED,
    targetType: "SensitiveActionApproval",
    targetId: sensitiveAction.id,
    metadata: { actionCode, targetType, targetId },
    req,
  });

  return sensitiveAction;
}

async function approveSensitiveAction(actionId, decision, { rejectionReason }, staffUser, req) {
  const sensitiveAction = await prisma.sensitiveActionApproval.findUnique({ where: { id: actionId } });
  if (!sensitiveAction) throw new ApiError(404, "Sensitive action request not found");
  if (sensitiveAction.status !== "PENDING") {
    throw new ApiError(400, `Action is already in status: ${sensitiveAction.status}`);
  }

  const isSuperAdmin = staffUser.adminRole === "SUPER_ADMIN" || staffUser.email === "fn.freelnova@gmail.com";
  if (!isSuperAdmin) {
    throw new ApiError(403, "Only Super Administrator can approve sensitive operational actions");
  }

  const updateData = {
    status: decision === "APPROVE" ? "APPROVED" : "REJECTED",
    approvedById: decision === "APPROVE" ? staffUser.id : null,
    rejectedById: decision === "REJECT" ? staffUser.id : null,
    rejectionReason: decision === "REJECT" ? rejectionReason : null,
    executedAt: decision === "APPROVE" ? new Date() : null,
  };

  const updated = await prisma.sensitiveActionApproval.update({
    where: { id: actionId },
    data: updateData,
  });

  await createAuditLog({
    adminUserId: staffUser.id,
    action: AUDIT_ACTIONS.SENSITIVE_ACTION_APPROVED,
    targetType: "SensitiveActionApproval",
    targetId: actionId,
    metadata: { actionCode: sensitiveAction.actionCode, decision },
    req,
  });

  return updated;
}

// ── 12. Case Management System Service ──────────────────────────────────────

async function getCases({ status, priority, originType, search, page = 1, limit = 20 }) {
  const where = {};
  if (status && status !== "all") where.status = status;
  if (priority && priority !== "all") where.priority = priority;
  if (originType && originType !== "all") where.originType = originType;
  if (search) {
    where.OR = [
      { caseNumber: { contains: search, mode: "insensitive" } },
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * limit;
  const [cases, total] = await Promise.all([
    prisma.enterpriseCase.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    }),
    prisma.enterpriseCase.count({ where }),
  ]);

  return { cases, total, page: Number(page), totalPages: Math.ceil(total / limit) };
}

async function createCase(staffUser, data, req) {
  const { originType, originId, title, description, priority = "MEDIUM", projectId, paymentId, ticketId, disputeId, securityAlertId } = data;
  const count = await prisma.enterpriseCase.count();
  const caseNumber = `CASE-FN-${String(count + 1).padStart(6, "0")}`;

  const initialTimeline = [
    {
      timestamp: new Date().toISOString(),
      actorName: staffUser.name,
      event: "Case opened",
      note: "Case container created",
    },
  ];

  const enterpriseCase = await prisma.enterpriseCase.create({
    data: {
      caseNumber,
      originType,
      originId: originId ? String(originId) : null,
      title,
      description,
      priority,
      status: "OPEN",
      assignedEmployeeId: staffUser.id,
      timeline: initialTimeline,
      projectId: projectId || null,
      paymentId: paymentId || null,
      ticketId: ticketId || null,
      disputeId: disputeId || null,
      securityAlertId: securityAlertId || null,
    },
  });

  await createAuditLog({
    adminUserId: staffUser.id,
    action: AUDIT_ACTIONS.CASE_CREATED,
    targetType: "EnterpriseCase",
    targetId: enterpriseCase.id,
    metadata: { caseNumber, originType },
    req,
  });

  return enterpriseCase;
}

// ── 13. Policy & Compliance Center Service ──────────────────────────────────

async function getPolicies() {
  return prisma.policy.findMany({
    orderBy: { category: "asc" },
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });
}

async function createOrUpdatePolicy(staffUser, { policyCode, name, category, content, changeSummary }) {
  let policy = await prisma.policy.findUnique({ where: { policyCode } });

  if (!policy) {
    policy = await prisma.policy.create({
      data: {
        policyCode,
        name,
        category,
        content,
        currentVersion: "1.0",
        createdById: staffUser.id,
        updatedById: staffUser.id,
        versions: {
          create: {
            version: "1.0",
            content,
            authorId: staffUser.id,
            changeSummary: changeSummary || "Initial policy release",
          },
        },
      },
      include: { versions: true },
    });
  } else {
    const parts = policy.currentVersion.split(".");
    const nextVer = `${parts[0]}.${Number(parts[1] || 0) + 1}`;

    policy = await prisma.policy.update({
      where: { policyCode },
      data: {
        name,
        category,
        content,
        currentVersion: nextVer,
        updatedById: staffUser.id,
        versions: {
          create: {
            version: nextVer,
            content,
            authorId: staffUser.id,
            changeSummary: changeSummary || "Policy updated",
          },
        },
      },
      include: { versions: true },
    });
  }

  return policy;
}

module.exports = {
  // Tickets
  getTickets,
  createTicket,
  assignTicket,
  updateTicketStatus,
  addTicketMessage,
  // Disputes
  getDisputeDetails,
  updateDisputeState,
  // Finance Approvals
  getFinanceApprovals,
  createFinanceApprovalRequest,
  processFinanceApproval,
  // Security Center
  getSecurityDashboardSignals,
  resolveSecurityAlert,
  // Analytics
  getCompanyAnalyticsData,
  // Knowledge Base
  getKnowledgeArticles,
  createKnowledgeArticle,
  // Handover
  executeEmployeeHandover,
  getHandovers,
  // Internal Notes
  getInternalNotes,
  createInternalNote,
  // Notifications 2.0
  sendTargetedNotification,
  // Command Center
  getCommandCenterData,
  // Sensitive Action
  requestSensitiveAction,
  approveSensitiveAction,
  // Cases
  getCases,
  createCase,
  // Policies
  getPolicies,
  createOrUpdatePolicy,
};
