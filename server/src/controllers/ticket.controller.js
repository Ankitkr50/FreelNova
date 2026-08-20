const crypto = require("crypto");
const { prisma } = require("../config/db");
const ApiError = require("../utils/apiError");
const catchAsync = require("../utils/catchAsync");
const { logAdminAction } = require("../services/audit.service");
const { generateNextTicketNumber } = require("../utils/idGenerator");

/**
 * Create a new support ticket
 */
const createTicket = catchAsync(async (req, res) => {
  const { category, priority = "MEDIUM", subject, description } = req.body;
  if (!subject || !description) {
    throw new ApiError(400, "Subject and description are required.");
  }

  const ticketNumber = await generateNextTicketNumber();

  const ticket = await prisma.supportTicket.create({
    data: {
      ticketNumber,
      userId: req.user.id,
      category: category || "OTHER",
      priority,
      status: "OPEN",
      subject: subject.trim(),
      description: description.trim(),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  res.status(201).json({
    success: true,
    message: "Support ticket created successfully.",
    data: { ticket },
  });
});

/**
 * List Support Tickets
 */
const listTickets = catchAsync(async (req, res) => {
  const { page = 1, limit = 25, category, priority, status, search, assignedToId } = req.query;
  const where = {};

  if (category && category !== "all") where.category = category;
  if (priority && priority !== "all") where.priority = priority;
  if (status && status !== "all") where.status = status;
  if (assignedToId) where.assignedToId = assignedToId;

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { ticketNumber: { contains: q, mode: "insensitive" } },
      { subject: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        assignedTo: { select: { id: true, name: true, email: true, adminRole: true } },
        _count: { select: { messages: true } },
      },
    }),
    prisma.supportTicket.count({ where }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      tickets,
      total,
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  });
});

/**
 * Get Ticket Details with message history
 */
const getTicketDetails = catchAsync(async (req, res) => {
  const { ticketId } = req.params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, phone: true } },
      assignedTo: { select: { id: true, name: true, email: true, adminRole: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sender: { select: { id: true, name: true, email: true, role: true, adminRole: true } },
        },
      },
    },
  });

  if (!ticket) throw new ApiError(404, "Support ticket not found.");

  res.status(200).json({
    success: true,
    data: { ticket },
  });
});

/**
 * Add message or Internal Staff Note to ticket
 */
const addTicketMessage = catchAsync(async (req, res) => {
  const { ticketId } = req.params;
  const { message, isInternalNote = false, attachments = [] } = req.body;

  if (!message || !message.trim()) {
    throw new ApiError(400, "Message content is required.");
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
  });
  if (!ticket) throw new ApiError(404, "Ticket not found.");

  const createdMessage = await prisma.ticketMessage.create({
    data: {
      ticketId,
      senderId: req.user.id,
      message: message.trim(),
      isInternalNote: Boolean(isInternalNote),
      attachments,
    },
    include: {
      sender: { select: { id: true, name: true, email: true, role: true, adminRole: true } },
    },
  });

  // Touch ticket updatedAt
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { updatedAt: new Date() },
  });

  res.status(201).json({
    success: true,
    data: { message: createdMessage },
  });
});

/**
 * Update Ticket Status / Priority / Assigned Staff
 */
const updateTicket = catchAsync(async (req, res) => {
  const { ticketId } = req.params;
  const { status, priority, assignedToId } = req.body;

  const data = {};
  if (status) {
    data.status = status;
    if (status === "RESOLVED") data.resolvedAt = new Date();
    if (status === "CLOSED") data.closedAt = new Date();
  }
  if (priority) data.priority = priority;
  if (assignedToId !== undefined) data.assignedToId = assignedToId || null;

  const ticket = await prisma.supportTicket.update({
    where: { id: ticketId },
    data,
    include: {
      user: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });

  await logAdminAction({
    adminUserId: req.user.id,
    action: "TICKET_UPDATED",
    targetType: "SUPPORT_TICKET",
    targetId: ticket.ticketNumber,
    metadata: { status, priority, assignedToId },
    req,
  });

  res.status(200).json({
    success: true,
    message: "Ticket updated successfully.",
    data: { ticket },
  });
});

module.exports = {
  createTicket,
  listTickets,
  getTicketDetails,
  addTicketMessage,
  updateTicket,
};
