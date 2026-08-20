const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { prisma } = require("../config/db");
const logger = require("../utils/logger");
const { inspectMessage } = require("../services/antiOffPlatformEngine");
const env = require("../config/env");

// Multi-socket presence tracking: userId -> Set(socketId)
const userSocketsMap = new Map();
const onlineUsers = new Map();

function setupSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    pingInterval: 10000,
    pingTimeout: 5000
  });

  // Enable Redis Pub/Sub adapter for multi-instance load balancer scaling
  try {
    if (env.redisUrl && process.env.NODE_ENV !== "test") {
      const { createAdapter } = require("@socket.io/redis-adapter");
      const Redis = require("ioredis");
      const pubClient = new Redis(env.redisUrl, { lazyConnect: true });
      const subClient = pubClient.duplicate();
      Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        logger.info("socket_redis_adapter_enabled", { type: "multi-server" });
      }).catch((e) => {
        logger.warn("socket_redis_adapter_fallback", { message: e.message });
      });
    }
  } catch (err) {
    logger.warn("socket_redis_adapter_init_warning", { message: err.message });
  }

  // JWT Middleware for Socket.io
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        socket.user = { id: socket.handshake.query?.userId || "guest_user", role: "user" };
        return next();
      }
      const secret = process.env.JWT_SECRET || "supersecretkey";
      const decoded = jwt.verify(token, secret);
      socket.user = {
        id: decoded.id || decoded.userId || "user_1",
        role: decoded.role || "user",
        email: decoded.email
      };
      next();
    } catch (err) {
      logger.warn("socket_auth_fallback", { message: err.message });
      socket.user = { id: socket.handshake.query?.userId || "guest_user", role: "user" };
      next();
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.id;

    // Multi-socket Set tracking
    let socketsSet = userSocketsMap.get(userId);
    if (!socketsSet) {
      socketsSet = new Set();
      userSocketsMap.set(userId, socketsSet);
    }
    socketsSet.add(socket.id);
    onlineUsers.set(userId, socket.id);

    // Join personal user room
    socket.join(`user:${userId}`);
    logger.info("socket_user_connected", { userId, socketId: socket.id, activeSockets: socketsSet.size });

    // Broadcast online presence if this is user's first active socket
    if (socketsSet.size === 1) {
      io.emit("user_presence_updated", { userId, isOnline: true, lastSeenAt: null });
      io.emit("user_online_status", { userId, isOnline: true });
    } else {
      // Send current state to newly connected socket
      socket.emit("user_presence_updated", { userId, isOnline: true, lastSeenAt: null });
    }

    // Handle joining chat rooms with authorization check
    socket.on("join_chat_room", async (data) => {
      const { chatId } = typeof data === "string" ? { chatId: data } : data || {};
      if (chatId) {
        try {
          const { verifyChatUnlockStatus } = require("../controllers/chat.controller");
          const conversation = await prisma.conversation.findUnique({ where: { id: chatId } });
          const authCheck = await verifyChatUnlockStatus(conversation, userId, socket.user.role);
          if (authCheck.allowed) {
            socket.join(`room:${chatId}`);
            logger.info("socket_joined_room", { userId, chatId });
          } else {
            logger.warn("socket_join_room_denied", { userId, chatId, reason: authCheck.error });
          }
        } catch (err) {
          socket.join(`room:${chatId}`);
        }
      }
    });

    // Handle leaving chat rooms
    socket.on("leave_chat_room", (data) => {
      const { chatId } = typeof data === "string" ? { chatId: data } : data || {};
      if (chatId) {
        socket.leave(`room:${chatId}`);
        logger.info("socket_left_room", { userId, chatId });
      }
    });

    // Handle sending real-time messages with ACK & Deduplication
    socket.on("send_chat_message", async (messageData, callback) => {
      const { chatId, senderId, senderRole, senderName, text, tempId, clientMessageId, attachment, messageType, createdAt } = messageData || {};
      if (!chatId || (!text && !attachment)) {
        if (typeof callback === "function") callback({ success: false, error: "Missing conversationId or message payload" });
        return;
      }

      const finalSenderId = senderId || userId;
      const cMsgId = clientMessageId || tempId || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      // 0. Authorization & Lock Check
      try {
        const { verifyChatUnlockStatus } = require("../controllers/chat.controller");
        const conversation = await prisma.conversation.findUnique({ where: { id: chatId } });
        const authCheck = await verifyChatUnlockStatus(conversation, finalSenderId, socket.user.role);

        if (!authCheck.allowed) {
          if (typeof callback === "function") {
            callback({
              success: false,
              code: authCheck.code || "CHAT_NOT_ALLOWED",
              error: authCheck.error
            });
          }
          return;
        }
      } catch (authErr) {
        logger.warn("socket_auth_check_error", { error: authErr.message });
      }

      // 1. AI Chat Safety & Anti-Platform-Bypass Moderation Inspection
      try {
        const { moderateMessage } = require("../services/moderation.service");
        const modResult = await moderateMessage({
          text: text || "",
          contentType: attachment ? "IMAGE" : (messageType || "TEXT"),
          attachment,
          senderId: finalSenderId,
          conversationId: chatId
        });

        if (!modResult.allowed) {
          if (typeof callback === "function") {
            callback({
              success: false,
              isBlocked: true,
              code: "CHAT_MODERATION_BLOCKED",
              error: modResult.reason || "⚠️ Message blocked for security reasons: direct contact or payment information detected."
            });
          }
          return;
        }
      } catch (modErr) {
        logger.warn("socket_moderation_error", { error: modErr.message });
      }

      // 2. Deduplication check
      try {
        const existing = await prisma.chatMessage.findFirst({
          where: {
            OR: [
              { clientMessageId: cMsgId },
              { id: cMsgId }
            ]
          }
        });

        if (existing) {
          if (typeof callback === "function") {
            callback({ success: true, clientMessageId: cMsgId, messageId: existing.id, isDuplicate: true });
          }
          return;
        }
      } catch (dedupErr) {
        // Continue if DB check fails transiently
      }

      // 3. Persist message to database
      let dbSavedMsg = null;
      try {
        const conversation = await prisma.conversation.findUnique({ where: { id: chatId } });
        if (conversation) {
          const recipientId = conversation.participantIds.find(p => p !== finalSenderId) || null;
          if (recipientId && recipientId === finalSenderId) {
            if (typeof callback === "function") {
              callback({ success: false, error: "Invalid message routing: sender and recipient cannot be the same user" });
            }
            return;
          }

          dbSavedMsg = await prisma.chatMessage.create({
            data: {
              conversationId: chatId,
              projectId: conversation.projectId,
              senderId: finalSenderId,
              content: text || (attachment?.fileName ? `📎 ${attachment.fileName}` : "Attachment"),
              messageType: messageType || (attachment?.mimeType?.startsWith("image/") ? "IMAGE" : attachment ? "FILE" : "TEXT"),
              status: "SENT",
              clientMessageId: cMsgId,
              metadata: { recipientId, ...(attachment ? { attachment } : {}) }
            }
          });

          await prisma.conversation.update({
            where: { id: chatId },
            data: { lastMessageAt: new Date() }
          });
        }
      } catch (dbErr) {
        logger.warn("socket_message_db_persist_warning", { message: dbErr.message });
      }

      const finalMsgId = dbSavedMsg ? dbSavedMsg.id : cMsgId;

      const payload = {
        id: finalMsgId,
        clientMessageId: cMsgId,
        tempId: cMsgId,
        chatId,
        senderId: finalSenderId,
        senderRole: senderRole || socket.user.role,
        senderName: senderName || "User",
        text: text || "",
        attachment: attachment || null,
        messageType: messageType || (attachment ? "FILE" : "TEXT"),
        status: "SENT",
        deliveredAt: null,
        readAt: null,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: createdAt || new Date().toISOString()
      };

      // 4. Confirm ACK back to sender
      if (typeof callback === "function") {
        callback({ success: true, clientMessageId: cMsgId, messageId: finalMsgId });
      }
      socket.emit("message_sent", { tempId: cMsgId, clientMessageId: cMsgId, id: finalMsgId, status: "SENT" });

      // 5. Broadcast to room (including recipient socket)
      io.to(`room:${chatId}`).emit("receive_chat_message", payload);
    });

    // Handle recipient Delivery Acknowledgement (`✓✓ Delivered`)
    socket.on("message_delivered_ack", async (data) => {
      const { messageId, clientMessageId, chatId } = data || {};
      if (!messageId && !clientMessageId) return;

      const now = new Date();

      try {
        await prisma.chatMessage.updateMany({
          where: {
            OR: [
              { id: messageId || "" },
              { clientMessageId: clientMessageId || "" }
            ]
          },
          data: { status: "DELIVERED", deliveredAt: now }
        });
      } catch (err) {
        // Ignore if transient
      }

      io.to(`room:${chatId}`).emit("message_status_updated", {
        messageId,
        clientMessageId,
        chatId,
        status: "DELIVERED",
        deliveredAt: now.toISOString()
      });
    });

    // Handle recipient Read Confirmation (`✓✓ Blue Read`)
    socket.on("mark_messages_read", async (data) => {
      const { chatId } = data || {};
      if (!chatId) return;

      const now = new Date();

      try {
        const updateResult = await prisma.chatMessage.updateMany({
          where: {
            conversationId: chatId,
            senderId: { not: userId },
            status: { in: ["SENT", "DELIVERED"] }
          },
          data: { status: "READ", readAt: now }
        });

        if (updateResult && updateResult.count > 0) {
          io.to(`room:${chatId}`).emit("message_status_updated", {
            chatId,
            readerId: userId,
            status: "READ",
            readAt: now.toISOString()
          });
        }
      } catch (err) {
        // Ignore if transient
      }
    });

    // Handle typing events (typing_start, typing_stop, typing_indicator)
    socket.on("typing_start", (data) => {
      const { chatId, senderName } = data || {};
      if (chatId) {
        socket.to(`room:${chatId}`).emit("user_typing_status", {
          chatId,
          userId,
          senderName: senderName || "Contact",
          isTyping: true
        });
      }
    });

    socket.on("typing_stop", (data) => {
      const { chatId, senderName } = data || {};
      if (chatId) {
        socket.to(`room:${chatId}`).emit("user_typing_status", {
          chatId,
          userId,
          senderName: senderName || "Contact",
          isTyping: false
        });
      }
    });

    socket.on("typing_indicator", (data) => {
      const { chatId, isTyping, senderName } = data || {};
      if (chatId) {
        socket.to(`room:${chatId}`).emit("user_typing_status", {
          chatId,
          userId,
          senderName: senderName || "Contact",
          isTyping: !!isTyping
        });
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      const socketsSet = userSocketsMap.get(userId);
      if (socketsSet) {
        socketsSet.delete(socket.id);
        if (socketsSet.size === 0) {
          userSocketsMap.delete(userId);
          onlineUsers.delete(userId);
          const lastSeenAt = new Date().toISOString();
          
          logger.info("socket_user_all_disconnected", { userId });
          io.emit("user_presence_updated", { userId, isOnline: false, lastSeenAt });
          io.emit("user_online_status", { userId, isOnline: false, lastSeenAt });

          prisma.user.update({
            where: { id: userId },
            data: { lastLoginAt: new Date() }
          }).catch(() => {});
        } else {
          logger.info("socket_user_tab_closed", { userId, remainingSockets: socketsSet.size });
        }
      }
    });
  });

  return io;
}

module.exports = { setupSocketIO, onlineUsers, userSocketsMap };
