const { prisma } = require("../config/db");
const { inspectMessage } = require("../services/antiOffPlatformEngine.js");

/**
 * Helper to verify whether a user is authorized to access / message in a conversation.
 * Enforces business rules:
 * - Super Admin can access permitted support/admin chats.
 * - For PROJECT chats between Freelancer & Recruiter/Client, chat unlocks ONLY when:
 *   project.status is confirmed/active (selected, in_progress, completed, paid)
 *   AND required payment/escrow condition is captured/held/released.
 */
async function verifyChatUnlockStatus(conversation, userId, userRole) {
  if (!conversation) {
    return {
      allowed: false,
      statusCode: 404,
      code: "CONVERSATION_NOT_FOUND",
      error: "Conversation not found"
    };
  }

  const isUserAdmin = userRole === "admin" || userId === "admin_user" || userId === "admin" || (conversation.participantIds && conversation.participantIds.includes("admin_user"));

  // Participant check
  if (!isUserAdmin && (!conversation.participantIds || !conversation.participantIds.includes(userId))) {
    return {
      allowed: false,
      statusCode: 403,
      code: "CHAT_NOT_ALLOWED",
      error: "Access denied to conversation"
    };
  }

  // Admin or non-project support chats bypass project lock checks
  if (isUserAdmin || conversation.type === "ADMIN_SUPPORT") {
    return { allowed: true };
  }

const isValidUuid = (id) => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

// Project chat validation
  if (conversation.type === "PROJECT" || conversation.projectId) {
    if (!conversation.projectId || !isValidUuid(conversation.projectId)) {
      return {
        allowed: false,
        statusCode: 403,
        code: "CHAT_NOT_ALLOWED",
        error: "Messaging will become available once the project is confirmed and the required payment/escrow is completed."
      };
    }

    const project = await prisma.project.findUnique({
      where: { id: conversation.projectId },
      select: {
        id: true,
        status: true,
        recruiterId: true,
        selectedFreelancer: true,
        payments: {
          select: { status: true, escrowStatus: true }
        }
      }
    });

    if (!project) {
      return {
        allowed: false,
        statusCode: 404,
        code: "PROJECT_NOT_FOUND",
        error: "Associated project not found"
      };
    }

    const isConfirmedStatus = ["selected", "in_progress", "completed", "paid"].includes(project.status);
    const hasCapturedPayment = project.payments && project.payments.some(p =>
      p.status === "captured" || p.escrowStatus === "held_in_escrow" || p.escrowStatus === "released"
    );

    // Business rule: Unlocked only if project confirmed AND payment/escrow verified
    if (!isConfirmedStatus || (!hasCapturedPayment && project.status === "selected")) {
      return {
        allowed: false,
        statusCode: 403,
        code: "CHAT_NOT_ALLOWED",
        error: "Messaging will become available once the project is confirmed and the required payment/escrow is completed."
      };
    }
  }

  return { allowed: true };
}

/**
 * Automatically creates or activates the project conversation between Client and Freelancer
 * once the project is confirmed and required payment/escrow condition is met.
 */
async function ensureProjectConversation(projectId) {
  try {
    if (!projectId) return null;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        title: true,
        status: true,
        recruiterId: true,
        selectedFreelancer: true,
        payments: {
          select: { status: true, escrowStatus: true }
        }
      }
    });

    if (!project || !project.recruiterId || !project.selectedFreelancer) {
      return null;
    }

    const recruiterId = project.recruiterId;
    const freelancerId = project.selectedFreelancer;
    const normalizedParticipants = [...new Set([recruiterId, freelancerId].filter(Boolean))].sort();
    const convKey = `project_${project.id}_${normalizedParticipants.join("_")}`;

    // Check existing conversation
    let existing = await prisma.conversation.findFirst({
      where: {
        OR: [
          { conversationKey: convKey },
          { projectId: project.id, type: "PROJECT" }
        ]
      }
    });

    if (existing) {
      if (existing.status !== "active" || normalizedParticipants.some(id => !existing.participantIds.includes(id)) || !existing.conversationKey) {
        existing = await prisma.conversation.update({
          where: { id: existing.id },
          data: {
            conversationKey: convKey,
            participantIds: normalizedParticipants,
            status: "active"
          }
        });
      }
      return existing;
    }

    // Create new project conversation automatically
    const newConv = await prisma.conversation.create({
      data: {
        conversationKey: convKey,
        projectId: project.id,
        type: "PROJECT",
        status: "active",
        participantIds: normalizedParticipants,
        metadata: {
          title: `Project — ${project.title}`
        }
      }
    });

    // Create welcome system message
    await prisma.chatMessage.create({
      data: {
        conversationId: newConv.id,
        projectId: project.id,
        senderId: recruiterId,
        content: `🎉 Project "${project.title}" confirmed and payment escrow verified. Direct messaging workspace unlocked!`,
        messageType: "SYSTEM",
        status: "READ"
      }
    });

    return newConv;
  } catch (err) {
    logger.warn("ensureProjectConversation skipped:", err.message);
    return null;
  }
}

exports.verifyChatUnlockStatus = verifyChatUnlockStatus;
exports.ensureProjectConversation = ensureProjectConversation;

/**
 * Get or create a 1-to-1 conversation between current user and target recipient
 */
exports.initiateConversation = async (req, res) => {
  try {
    const { recipientId, projectId, title } = req.body;
    const userId = req.user.id;
    const isUserAdmin = req.user.role === "admin";

    if (!recipientId) {
      return res.status(400).json({ success: false, error: "Recipient ID is required" });
    }

    if (recipientId === userId) {
      return res.status(400).json({ success: false, error: "Cannot create conversation with yourself" });
    }

    // Verify recipient user exists
    const recipientUser = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, name: true, username: true, userCode: true, role: true, adminRole: true }
    });

    if (!recipientUser) {
      return res.status(404).json({ success: false, error: "Recipient user not found" });
    }

    const isRecipientAdmin = recipientUser.role === "admin";

    // If neither participant is admin, check project payment & escrow condition
    if (!isUserAdmin && !isRecipientAdmin) {
      if (!projectId) {
        return res.status(403).json({
          success: false,
          code: "CHAT_NOT_ALLOWED",
          error: "Messaging will become available once the project is confirmed and the required payment/escrow is completed."
        });
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          status: true,
          recruiterId: true,
          selectedFreelancer: true,
          payments: {
            select: { status: true, escrowStatus: true }
          }
        }
      });

      if (!project) {
        return res.status(404).json({ success: false, error: "Project not found" });
      }

      const isConfirmed = ["selected", "in_progress", "completed", "paid"].includes(project.status);
      const hasCapturedPayment = project.payments && project.payments.some(p =>
        p.status === "captured" || p.escrowStatus === "held_in_escrow" || p.escrowStatus === "released"
      );

      if (!isConfirmed || (!hasCapturedPayment && project.status === "selected")) {
        return res.status(403).json({
          success: false,
          code: "CHAT_NOT_ALLOWED",
          error: "Messaging will become available once the project is confirmed and the required payment/escrow is completed."
        });
      }
    }

    const normalizedParticipants = [...new Set([userId, recipientId].filter(Boolean))].sort();
    const convKey = projectId
      ? `project_${projectId}_${normalizedParticipants.join("_")}`
      : `support_${normalizedParticipants.join("_")}`;

    // Check if conversation already exists between these 2 users (optionally for same project)
    let existing;
    if (projectId) {
      existing = await prisma.conversation.findFirst({
        where: {
          OR: [
            { conversationKey: convKey },
            { projectId, participantIds: { hasEvery: normalizedParticipants } }
          ]
        },
        include: {
          project: {
            select: { id: true, title: true, status: true, projectCode: true }
          }
        }
      });
    }

    if (!existing) {
      existing = await prisma.conversation.findFirst({
        where: {
          OR: [
            { conversationKey: convKey },
            { participantIds: { hasEvery: normalizedParticipants }, type: isUserAdmin || isRecipientAdmin ? "ADMIN_SUPPORT" : "PROJECT" }
          ]
        },
        include: {
          project: {
            select: { id: true, title: true, status: true, projectCode: true }
          }
        }
      });
    }

    if (existing) {
      if (!existing.conversationKey) {
        existing = await prisma.conversation.update({
          where: { id: existing.id },
          data: { conversationKey: convKey },
          include: {
            project: {
              select: { id: true, title: true, status: true, projectCode: true }
            }
          }
        });
      }
      return res.json({
        success: true,
        data: { conversation: existing, isNew: false }
      });
    }

    // Create new conversation
    const newConv = await prisma.conversation.create({
      data: {
        conversationKey: convKey,
        projectId: projectId || null,
        type: isUserAdmin || isRecipientAdmin ? "ADMIN_SUPPORT" : "PROJECT",
        status: "active",
        participantIds: normalizedParticipants,
        metadata: { initiatedBy: userId, title: title || "Project Conversation" }
      },
      include: {
        project: {
          select: { id: true, title: true, status: true, projectCode: true }
        }
      }
    });

    // Create initial system greeting message
    await prisma.chatMessage.create({
      data: {
        conversationId: newConv.id,
        projectId: projectId || null,
        senderId: userId,
        content: `Conversation workspace initialized. Project safety rules and anti-off-platform monitoring active.`,
        messageType: "SYSTEM",
        status: "READ"
      }
    });

    return res.status(201).json({
      success: true,
      data: { conversation: newConv, isNew: true }
    });
  } catch (error) {
    console.error("Error in initiateConversation:", error);
    return res.status(500).json({ success: false, error: "Failed to initiate conversation" });
  }
};

/**
 * List all active conversations for the authenticated user
 */
exports.listConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const isUserAdmin = req.user.role === "admin";

    let conversations;

    if (isUserAdmin) {
      // Admins see all project and compliance conversations
      conversations = await prisma.conversation.findMany({
        include: {
          project: {
            select: { id: true, title: true, status: true, projectCode: true }
          },
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" }
          }
        },
        orderBy: { lastMessageAt: "desc" }
      });
    } else {
      conversations = await prisma.conversation.findMany({
        where: {
          participantIds: { has: userId }
        },
        include: {
          project: {
            select: { id: true, title: true, status: true, projectCode: true }
          },
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" }
          }
        },
        orderBy: { lastMessageAt: "desc" }
      });
    }

    // Fetch participant user info for each conversation
    const allParticipantIds = [...new Set(conversations.flatMap(c => c.participantIds))];
    const participants = await prisma.user.findMany({
      where: { id: { in: allParticipantIds } },
      select: { id: true, name: true, username: true, userCode: true, role: true, adminRole: true, lastLoginAt: true }
    });

    const participantMap = new Map(participants.map(p => [p.id, p]));

    const formatted = conversations.map(c => {
      const partyUsers = c.participantIds.map(pid => participantMap.get(pid)).filter(Boolean);
      const otherUser = partyUsers.find(u => u.id !== userId) || partyUsers[0];
      const lastMsg = c.messages[0];

      return {
        id: c.id,
        projectId: c.projectId,
        project: c.project,
        type: c.type,
        status: c.status,
        participants: partyUsers,
        otherUser,
        lastMessage: lastMsg ? {
          id: lastMsg.id,
          content: lastMsg.content,
          messageType: lastMsg.messageType,
          status: lastMsg.status,
          senderId: lastMsg.senderId,
          createdAt: lastMsg.createdAt
        } : null,
        lastMessageAt: c.lastMessageAt,
        createdAt: c.createdAt
      };
    });

    return res.json({ success: true, data: { conversations: formatted } });
  } catch (error) {
    console.error("Error in listConversations:", error);
    return res.status(500).json({ success: false, error: "Failed to load conversations" });
  }
};

/**
 * Get paginated message history for a conversation
 */
exports.getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { cursor, limit = 50 } = req.query;
    const userId = req.user.id;
    const isUserAdmin = req.user.role === "admin";

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, title: true, status: true, recruiterId: true, selectedFreelancer: true }
        }
      }
    });

    const authCheck = await verifyChatUnlockStatus(conversation, userId, req.user.role);
    if (!authCheck.allowed) {
      return res.status(authCheck.statusCode || 403).json({
        success: false,
        code: authCheck.code || "CHAT_NOT_ALLOWED",
        error: authCheck.error
      });
    }

    const takeCount = parseInt(limit, 10);
    const queryOptions = {
      where: {
        conversationId: id,
        deletedAt: isUserAdmin ? undefined : null
      },
      take: takeCount + 1,
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: { id: true, name: true, username: true, userCode: true, role: true, adminRole: true }
        },
        replyToMessage: {
          select: { id: true, content: true, senderId: true, messageType: true }
        }
      }
    };

    if (cursor) {
      queryOptions.cursor = { id: cursor };
      queryOptions.skip = 1;
    }

    const rawMessages = await prisma.chatMessage.findMany(queryOptions);

    let nextCursor = null;
    if (rawMessages.length > takeCount) {
      const nextItem = rawMessages.pop();
      nextCursor = nextItem.id;
    }

    // Mark unread messages as read
    await prisma.chatMessage.updateMany({
      where: {
        conversationId: id,
        senderId: { not: userId },
        status: { not: "READ" }
      },
      data: { status: "READ" }
    });

    return res.json({
      success: true,
      data: {
        messages: rawMessages,
        nextCursor,
        conversation
      }
    });
  } catch (error) {
    console.error("Error in getMessages:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch messages" });
  }
};

/**
 * Send a new chat message with Anti-Off-Platform Engine inspection
 */
exports.sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, clientMessageId, replyToMessageId, messageType = "TEXT", metadata = {} } = req.body;
    const userId = req.user.id;
    const isUserAdmin = req.user.role === "admin";

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: "Message content cannot be empty" });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id }
    });

    const authCheck = await verifyChatUnlockStatus(conversation, userId, req.user.role);
    if (!authCheck.allowed) {
      return res.status(authCheck.statusCode || 403).json({
        success: false,
        code: authCheck.code || "CHAT_NOT_ALLOWED",
        error: authCheck.error
      });
    }

    const senderId = userId;
    const recipientId = conversation.participantIds.find(pid => pid !== senderId) || null;

    if (recipientId && recipientId === senderId) {
      return res.status(400).json({
        success: false,
        error: "Invalid message routing: sender and recipient cannot be the same user"
      });
    }

    // Deduplication check for clientMessageId
    if (clientMessageId) {
      const existingMsg = await prisma.chatMessage.findFirst({
        where: { clientMessageId },
        include: {
          sender: {
            select: { id: true, name: true, username: true, userCode: true, role: true, adminRole: true }
          },
          replyToMessage: {
            select: { id: true, content: true, senderId: true, messageType: true }
          }
        }
      });

      if (existingMsg) {
        return res.json({ success: true, data: { message: existingMsg, isDuplicate: true } });
      }
    }

    // Run AI Chat Safety & Anti-Platform-Bypass Moderation Engine inspection
    const { moderateMessage } = require("../services/moderation.service");
    const modResult = await moderateMessage({
      text: content,
      contentType: messageType,
      senderId: userId,
      receiverId: recipientId,
      conversationId: id
    });

    if (!modResult.allowed) {
      await prisma.chatAuditLog.create({
        data: {
          action: "MESSAGE_BLOCKED",
          actorId: userId,
          conversationId: id,
          reason: modResult.reason,
          metadata: { categories: modResult.categories, riskLevel: modResult.riskLevel }
        }
      }).catch(() => {});

      return res.status(400).json({
        success: false,
        code: "CHAT_MODERATION_BLOCKED",
        error: modResult.reason || "⚠️ Message blocked for security reasons: direct contact or payment information detected.",
        isBlocked: true
      });
    }

    const moderationState = modResult.riskLevel === "HIGH" || modResult.riskLevel === "CRITICAL" ? "FLAGGED" : "SAFE";
    const flagReason = modResult.reason || null;

    const newMessage = await prisma.chatMessage.create({
      data: {
        conversationId: id,
        projectId: conversation.projectId,
        senderId: userId,
        content: content.trim(),
        messageType,
        status: "DELIVERED",
        clientMessageId: clientMessageId || null,
        replyToMessageId: replyToMessageId || null,
        metadata,
        moderationState,
        flagReason
      },
      include: {
        sender: {
          select: { id: true, name: true, username: true, userCode: true, role: true, adminRole: true }
        },
        replyToMessage: {
          select: { id: true, content: true, senderId: true, messageType: true }
        }
      }
    });

    // Update conversation lastMessageAt
    await prisma.conversation.update({
      where: { id },
      data: { lastMessageAt: new Date() }
    });

    // If flagged for moderation, write to audit log
    if (inspectResult.isFlagged) {
      await prisma.chatAuditLog.create({
        data: {
          action: "MESSAGE_FLAGGED",
          actorId: userId,
          conversationId: id,
          reason: inspectResult.reason,
          metadata: { messageId: newMessage.id, violationType: inspectResult.violationType }
        }
      });
    }

    return res.status(201).json({
      success: true,
      data: { message: newMessage }
    });
  } catch (error) {
    console.error("Error in sendMessage:", error);
    return res.status(500).json({ success: false, error: "Failed to send message" });
  }
};

/**
 * Edit an existing message
 */
exports.editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const message = await prisma.chatMessage.findUnique({
      where: { id }
    });

    if (!message) {
      return res.status(404).json({ success: false, error: "Message not found" });
    }

    if (message.senderId !== userId && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Not authorized to edit this message" });
    }

    if (message.messageType === "SYSTEM") {
      return res.status(400).json({ success: false, error: "System messages cannot be edited" });
    }

    // Inspect updated content
    const inspectResult = inspectMessage(content);
    if (!inspectResult.isAllowed) {
      return res.status(400).json({
        success: false,
        error: inspectResult.reason,
        violationType: inspectResult.violationType
      });
    }

    const updated = await prisma.chatMessage.update({
      where: { id },
      data: {
        content: content.trim(),
        editedAt: new Date(),
        moderationState: inspectResult.isFlagged ? "FLAGGED" : message.moderationState,
        flagReason: inspectResult.isFlagged ? inspectResult.reason : message.flagReason
      },
      include: {
        sender: {
          select: { id: true, name: true, username: true, userCode: true, role: true, adminRole: true }
        }
      }
    });

    return res.json({ success: true, data: { message: updated } });
  } catch (error) {
    console.error("Error in editMessage:", error);
    return res.status(500).json({ success: false, error: "Failed to edit message" });
  }
};

/**
 * Soft delete a message
 */
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const message = await prisma.chatMessage.findUnique({
      where: { id }
    });

    if (!message) {
      return res.status(404).json({ success: false, error: "Message not found" });
    }

    if (message.senderId !== userId && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Not authorized to delete this message" });
    }

    const softDeleted = await prisma.chatMessage.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    return res.json({ success: true, data: { message: softDeleted } });
  } catch (error) {
    console.error("Error in deleteMessage:", error);
    return res.status(500).json({ success: false, error: "Failed to delete message" });
  }
};

/**
 * Toggle emoji reaction on a message
 */
exports.toggleReaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    const allowedEmojis = ["👍", "❤️", "✅", "🚀", "👀", "❌"];
    if (!emoji || !allowedEmojis.includes(emoji)) {
      return res.status(400).json({ success: false, error: "Invalid reaction emoji" });
    }

    const message = await prisma.chatMessage.findUnique({
      where: { id }
    });

    if (!message) {
      return res.status(404).json({ success: false, error: "Message not found" });
    }

    const currentMeta = message.metadata || {};
    let reactions = currentMeta.reactions || [];

    const existingIdx = reactions.findIndex(r => r.userId === userId && r.emoji === emoji);

    if (existingIdx >= 0) {
      // Remove reaction
      reactions.splice(existingIdx, 1);
    } else {
      // Add reaction
      reactions.push({ userId, emoji, createdAt: new Date().toISOString() });
    }

    const updated = await prisma.chatMessage.update({
      where: { id },
      data: {
        metadata: { ...currentMeta, reactions }
      }
    });

    return res.json({ success: true, data: { message: updated } });
  } catch (error) {
    console.error("Error in toggleReaction:", error);
    return res.status(500).json({ success: false, error: "Failed to toggle reaction" });
  }
};

/**
 * Create a Project Revision Request from Chat
 */
exports.requestRevision = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const { milestoneId, issue, description, priority = "MEDIUM", messageId } = req.body;
    const userId = req.user.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation || !conversation.projectId) {
      return res.status(400).json({ success: false, error: "Revision requests require an active project conversation" });
    }

    const revision = await prisma.projectRevision.create({
      data: {
        projectId: conversation.projectId,
        milestoneId: milestoneId || null,
        conversationId,
        messageId: messageId || null,
        issue: issue || "Revision Request",
        description: description || "",
        priority,
        status: "OPEN",
        requestedById: userId
      }
    });

    // Create system/revision message in chat
    const sysMsg = await prisma.chatMessage.create({
      data: {
        conversationId,
        projectId: conversation.projectId,
        senderId: userId,
        content: `📋 Revision Request #${revision.id.slice(0, 6)}: "${issue}" (${priority} Priority)`,
        messageType: "REVISION_REQUEST",
        status: "DELIVERED",
        metadata: { revisionId: revision.id, issue, priority, description }
      },
      include: {
        sender: {
          select: { id: true, name: true, username: true, userCode: true, role: true }
        }
      }
    });

    return res.status(201).json({
      success: true,
      data: { revision, message: sysMsg }
    });
  } catch (error) {
    console.error("Error in requestRevision:", error);
    return res.status(500).json({ success: false, error: "Failed to create revision request" });
  }
};

/**
 * Server-side fast message search
 */
exports.searchMessages = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.json({ success: true, data: { results: [] } });
    }

    const results = await prisma.chatMessage.findMany({
      where: {
        conversationId,
        deletedAt: null,
        content: { contains: q.trim(), mode: "insensitive" }
      },
      take: 30,
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          select: { id: true, name: true, username: true, role: true }
        }
      }
    });

    return res.json({ success: true, data: { results } });
  } catch (error) {
    console.error("Error in searchMessages:", error);
    return res.status(500).json({ success: false, error: "Failed to search messages" });
  }
};

/**
 * Export project conversation transcript
 */
exports.exportConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        project: true,
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          include: {
            sender: { select: { id: true, name: true, username: true, role: true } }
          }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: "Conversation not found" });
    }

    const transcript = {
      exportedAt: new Date().toISOString(),
      projectId: conversation.projectId,
      projectTitle: conversation.project ? conversation.project.title : "Direct Communication",
      totalMessages: conversation.messages.length,
      messages: conversation.messages.map(m => ({
        timestamp: m.createdAt,
        sender: m.sender ? m.sender.name : "System",
        role: m.sender ? m.sender.role : "system",
        messageType: m.messageType,
        content: m.content
      }))
    };

    return res.json({ success: true, data: { transcript } });
  } catch (error) {
    console.error("Error in exportConversation:", error);
    return res.status(500).json({ success: false, error: "Failed to export transcript" });
  }
};

/**
 * Fetch AI Chat Safety Moderation Events for Admin
 */
exports.getModerationEvents = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Access denied. Admin access required." });
    }

    const events = await prisma.chatModerationEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 100
    });

    const totalFlagged = events.length;
    const blockedCount = events.filter(e => e.action === "BLOCK").length;
    const criticalCount = events.filter(e => e.riskLevel === "CRITICAL").length;

    return res.json({
      success: true,
      data: {
        events,
        stats: {
          totalFlagged,
          blockedCount,
          criticalCount
        }
      }
    });
  } catch (error) {
    console.error("Error fetching moderation events:", error);
    return res.status(500).json({ success: false, error: "Failed to load moderation events" });
  }
};
