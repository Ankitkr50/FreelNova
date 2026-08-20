import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useSocket } from "../hooks/useSocket.js";
import http from "../api/http.js";
import { chatApi } from "../api/chat.api.js";

function getAgentResponse(agentId, userText) {
  const query = userText.toLowerCase();
  
  if (agentId === "agent_codex") {
    if (query.includes("auth") || query.includes("login") || query.includes("signup")) {
      return `[Codex-AI Developer] task: "Implement Auth Middleware"
Status: Sandbox compiled successfully.
Output Code:
\`\`\`javascript
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Access Denied" });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: "Invalid Token" });
  }
};

module.exports = authMiddleware;
\`\`\`
I have verified the route compatibility. Let me know if you want me to link this to the database middleware!`;
    }
    
    if (query.includes("database") || query.includes("prisma") || query.includes("schema")) {
      return `[Codex-AI Developer] task: "Prisma Database Schema Setup"
Status: Migration generated.
Output Code:
\`\`\`prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model AgentTask {
  id          String   @id @default(uuid()) @db.Uuid
  title       String   @db.VarChar(255)
  status      String   @default("pending")
  outputLogs  String   @db.Text
  createdAt   DateTime @default(now())
}
\`\`\`
Database connected and synchronized. Ready to write queries!`;
    }

    return `[Codex-AI Developer] task: "General Code Compiling"
Status: Environment active.
\`\`\`javascript
// Codex-AI autonomous setup
console.log("AI execution sequence complete. Sandbox running cleanly.");
\`\`\`
I am ready for development! Please ask me to:
- "Create user authentication middleware"
- "Define database prisma schema"
- "Generate API controllers"`;
  }

  if (agentId === "agent_pixelcraft") {
    return `[PixelCraft-AI Designer] task: "Tailwind Theme & CSS Configurations"
Status: Design assets generated.
\`\`\`css
/* Custom Glassmorphism Theme */
.glass-panel {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.08);
}
\`\`\`
Recommended Color Palette:
- Primary: #2563eb (Vibrant Blue)
- Secondary: #f59e0b (Gold Accent)
- Background: #0f172a (Sleek Dark)`;
  }

  if (agentId === "agent_scribe") {
    return `[Scribe-AI Copywriter] task: "Sales Pitch Landing Copy"
Status: Content generation delivered.

# Unlocking the Future of Agentic Talent
## Get your work done by elite human freelancers and autonomous AI Agents, side-by-side in a secure, payment-ready workspace.

### Key Value Propositions:
- 10-Second Dispute Resolution (AI Auto-Arbitration)
- 100% Secure Escrow Release Audits
- 1-Click AI Proposal Creator for instant high-conversion applications.`;
  }

  return `[AI Agent] Task received. Processing pipeline active. Let me know what you need me to compile!`;
}

function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role || "freelancer";
  
  const [activeChat, setActiveChat] = useState("");
  const [requests, setRequests] = useState([]);
  const [messages, setMessages] = useState({});
  const [typedMessage, setTypedMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAILoading, setIsAILoading] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const { socket, isConnected, isReconnecting, joinRoom, leaveRoom, emitMessage, emitDeliveredAck, markRead, sendTyping, emitTypingStart, emitTypingStop } = useSocket();
  const [onlineStatusMap, setOnlineStatusMap] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [incomingToast, setIncomingToast] = useState(null);
  const typingTimerRef = useRef(null);

  // Production Project OS State
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [showProjectDrawer, setShowProjectDrawer] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionIssue, setRevisionIssue] = useState("");
  const [revisionDescription, setRevisionDescription] = useState("");
  const [revisionPriority, setRevisionPriority] = useState("MEDIUM");
  const [blockedNotice, setBlockedNotice] = useState(null);
  const [inChatSearch, setInChatSearch] = useState("");
  const [showInChatSearch, setShowInChatSearch] = useState(false);

  // V2 Attachment & Lightbox State
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadErrorNotice, setUploadErrorNotice] = useState(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeLightboxImage, setActiveLightboxImage] = useState(null);
  const fileInputRef = useRef(null);

  const userInitials = user?.name 
    ? user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() 
    : (user?.email ? user.email.slice(0, 2).toUpperCase() : "ME");

  // Join socket room when activeChat changes and leave previous
  useEffect(() => {
    if (activeChat) {
      joinRoom(activeChat);
    }
  }, [activeChat, joinRoom]);

  // Mark chat as read and emit read receipt when activeChat is opened
  useEffect(() => {
    if (activeChat && user) {
      markRead(activeChat);
    }
  }, [activeChat, user, markRead]);

  // Listen for incoming real-time socket messages, presence & typing status updates
  useEffect(() => {
    if (!socket) return;

    const handleIncomingMessage = (msgPayload) => {
      if (!msgPayload || !msgPayload.chatId) return;

      const currentUserId = user?.id || (role === "admin" ? "admin_user" : "user_1");

      if (msgPayload.chatId !== activeChat) {
        setIncomingToast({
          chatId: msgPayload.chatId,
          senderName: msgPayload.senderName || "Contact",
          text: msgPayload.text || "Sent a message",
        });
        setTimeout(() => setIncomingToast(null), 8000);
      }

      // Automatically emit delivery ack if message is from counterpart
      if (msgPayload.senderId !== currentUserId) {
        emitDeliveredAck(msgPayload.id, msgPayload.clientMessageId, msgPayload.chatId);
        if (msgPayload.chatId === activeChat) {
          markRead(activeChat);
        }
      }

      setMessages((prev) => {
        const currentList = prev[msgPayload.chatId] || [];

        // Deduplicate using message id, clientMessageId or tempId
        const existingIdx = currentList.findIndex(
          (m) => (m.id && m.id === msgPayload.id) ||
                 (msgPayload.clientMessageId && m.clientMessageId === msgPayload.clientMessageId) ||
                 (msgPayload.tempId && m.tempId === msgPayload.tempId)
        );

        let updated;
        if (existingIdx >= 0) {
          updated = [...currentList];
          updated[existingIdx] = {
            ...updated[existingIdx],
            ...msgPayload,
            status: msgPayload.status || updated[existingIdx].status || "SENT"
          };
        } else {
          updated = [...currentList, { ...msgPayload, status: msgPayload.senderId === currentUserId ? "SENT" : "DELIVERED" }];
        }

        localStorage.setItem(`sb_chat_msgs_${msgPayload.chatId}`, JSON.stringify(updated));
        return {
          ...prev,
          [msgPayload.chatId]: updated
        };
      });
    };

    const handleStatusUpdate = (update) => {
      if (!update || !update.chatId) return;

      setMessages((prev) => {
        const currentList = prev[update.chatId] || [];
        const updatedList = currentList.map((msg) => {
          if (update.messageId && (msg.id === update.messageId || msg.clientMessageId === update.clientMessageId || msg.tempId === update.messageId)) {
            return { ...msg, status: update.status, deliveredAt: update.deliveredAt || msg.deliveredAt, readAt: update.readAt || msg.readAt };
          } else if (update.status === "READ") {
            if (msg.sender === "me" || msg.senderId === user?.id) {
              return { ...msg, status: "READ", readAt: update.readAt || msg.readAt };
            }
          }
          return msg;
        });

        localStorage.setItem(`sb_chat_msgs_${update.chatId}`, JSON.stringify(updatedList));
        return {
          ...prev,
          [update.chatId]: updatedList
        };
      });
    };

    const handlePresence = (presence) => {
      if (!presence || !presence.userId) return;
      setOnlineStatusMap(prev => ({
        ...prev,
        [presence.userId]: { isOnline: presence.isOnline, lastSeenAt: presence.lastSeenAt }
      }));
    };

    const handleTyping = (typingData) => {
      if (!typingData || !typingData.chatId) return;
      setTypingUsers(prev => ({
        ...prev,
        [typingData.chatId]: typingData.isTyping ? (typingData.senderName || "Contact") : null
      }));
    };

    socket.on("receive_chat_message", handleIncomingMessage);
    socket.on("message_sent", (data) => handleStatusUpdate({ messageId: data.tempId || data.id, clientMessageId: data.clientMessageId, chatId: activeChat, status: "SENT" }));
    socket.on("message_status_updated", handleStatusUpdate);
    socket.on("user_presence_updated", handlePresence);
    socket.on("user_online_status", handlePresence);
    socket.on("user_typing_status", handleTyping);

    return () => {
      socket.off("receive_chat_message", handleIncomingMessage);
      socket.off("message_sent");
      socket.off("message_status_updated", handleStatusUpdate);
      socket.off("user_presence_updated", handlePresence);
      socket.off("user_online_status", handlePresence);
      socket.off("user_typing_status", handleTyping);
    };
  }, [socket, activeChat, user, role, emitDeliveredAck]);

  // Load chat requests and custom messages on mount/update
  useEffect(() => {
    try {
      localStorage.removeItem("sb_chat_requests");

      const frozenState = localStorage.getItem("sb_user_frozen");
      if (frozenState === "true") {
        setIsFrozen(true);
      }

      const currentUserId = user?.id;

      // Hydrate real DB conversations from backend
      chatApi.listConversations().then((res) => {
        if (res && res.success && Array.isArray(res.data?.conversations)) {
          const dbReqs = res.data.conversations.map(c => {
            const targetUser = c.otherUser || c.participants?.find(p => p.id !== currentUserId) || {};
            return {
              id: c.id,
              projectId: c.projectId,
              type: c.type,
              senderId: currentUserId,
              senderName: user?.name,
              receiverId: targetUser.id || c.id,
              receiverName: targetUser.name || (c.type === "ADMIN_SUPPORT" ? "FreelNova Admin" : "User"),
              receiverUsername: targetUser.username || "user",
              receiverRole: targetUser.role || (c.type === "ADMIN_SUPPORT" ? "Admin" : "Freelancer"),
              receiverUserCode: targetUser.userCode || "FID00000001",
              projectTitle: c.project?.title || (c.type === "ADMIN_SUPPORT" ? "Account Compliance & Support" : "Direct Message"),
              status: c.status || "accepted",
              createdAt: c.createdAt
            };
          });
          setRequests(dbReqs);

          const params = new URLSearchParams(window.location.search);
          const activeParam = params.get("chat") || params.get("active");

          if (activeParam && dbReqs.some(r => r.id === activeParam)) {
            setActiveChat(activeParam);
          } else if (dbReqs.length > 0) {
            setActiveChat(dbReqs[0].id);
          }
        }
      }).catch(err => console.warn("List conversations API sync warning:", err.message));
    } catch (e) {
      console.error("Error loading chat state", e);
    }
  }, [user]);

  // Live cross-window real-time chat sync
  useEffect(() => {
    const syncMsgs = () => {
      try {
        const storedReqs = JSON.parse(localStorage.getItem("sb_chat_requests") || "[]");
        setRequests(storedReqs);

        const loadedMsgs = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("sb_chat_msgs_")) {
            const chatId = key.replace("sb_chat_msgs_", "");
            try {
              loadedMsgs[chatId] = JSON.parse(localStorage.getItem(key) || "[]");
            } catch (e) {
              loadedMsgs[chatId] = [];
            }
          }
        }
        setMessages(loadedMsgs);
      } catch (e) {}
    };

    window.addEventListener("storage", syncMsgs);
    return () => window.removeEventListener("storage", syncMsgs);
  }, []);

  // Sync active chat messages with backend DB on conversation open
  useEffect(() => {
    if (!activeChat) return;

    chatApi.getMessages(activeChat).then((res) => {
      if (res && res.success && Array.isArray(res.data?.messages)) {
        const dbMsgs = res.data.messages.map(m => ({
          id: m.id,
          clientMessageId: m.clientMessageId || m.id,
          chatId: activeChat,
          sender: m.senderId === user?.id ? "me" : "other",
          senderId: m.senderId,
          senderName: m.sender?.name || "User",
          senderRole: m.sender?.role || "user",
          text: m.content,
          messageType: m.messageType,
          status: m.status || "SENT",
          attachment: m.metadata?.attachment || (m.messageType === "FILE" || m.messageType === "IMAGE" ? { fileName: m.content, url: m.metadata?.url } : null),
          time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: m.createdAt
        }));

        setMessages(prev => {
          const localList = prev[activeChat] || [];
          const mergedMap = new Map();
          
          localList.forEach(lm => mergedMap.set(lm.id || lm.clientMessageId, lm));
          dbMsgs.forEach(dm => mergedMap.set(dm.id || dm.clientMessageId, dm));

          const mergedList = Array.from(mergedMap.values()).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          localStorage.setItem(`sb_chat_msgs_${activeChat}`, JSON.stringify(mergedList));
          return { ...prev, [activeChat]: mergedList };
        });
      }
    }).catch(err => {
      console.warn("Backend chat message sync warning:", err.message);
    });
  }, [activeChat, user]);

  const currentChat = useMemo(() => {
    if (!activeChat) return null;
    
    if (activeChat.startsWith("agent_")) {
      const agentMap = {
        agent_codex: { id: "agent_codex", name: "Codex-AI Developer", username: "codex_ai", role: "AI Software Engineer" },
        agent_pixelcraft: { id: "agent_pixelcraft", name: "PixelCraft-AI Designer", username: "pixelcraft_ai", role: "AI UI/UX Designer" },
        agent_scribe: { id: "agent_scribe", name: "Scribe-AI Copywriter", username: "scribe_ai", role: "AI Growth Copywriter" },
      };
      return agentMap[activeChat] || { id: activeChat, name: "AI Digital Agent", username: "ai_agent", role: "Autonomous AI Agent" };
    }

    const found = requests.find(r => r.id === activeChat);
    if (found) {
      const isOtherSender = found.senderId !== user?.id;
      const otherName = isOtherSender ? found.senderName : found.receiverName;
      const otherId = isOtherSender ? found.senderId : found.receiverId;
      const otherUsername = isOtherSender ? (found.senderUsername || "user") : (found.receiverUsername || "user");
      const otherRole = isOtherSender ? (found.senderRole || "Freelancer") : (found.receiverRole || "Recruiter");
      const otherUserCode = isOtherSender ? (found.senderUserCode || "FID00000001") : (found.receiverUserCode || "FID00000002");

      return {
        id: found.id,
        receiverId: otherId,
        counterpartId: otherId,
        name: otherName || "User",
        username: otherUsername,
        role: otherRole,
        userCode: otherUserCode,
        projectTitle: found.projectTitle || "Account Compliance & Support",
        status: found.status,
        lastLoginAt: found.lastLoginAt
      };
    }
    return { id: activeChat, receiverId: activeChat, counterpartId: activeChat, name: "FreelNova User", username: "freelnova_user", role: "Member", userCode: "FID00000001", projectTitle: "Direct Communication", status: "accepted" };
  }, [activeChat, requests, user]);

  const activeMsgs = useMemo(() => {
    return messages[activeChat] || [];
  }, [messages, activeChat]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setTypedMessage(val);

    if (activeChat) {
      emitTypingStart(activeChat);

      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        emitTypingStop(activeChat);
      }, 3000);
    }
  };

  const handleSendMessage = async (textOverride = null) => {
    const textToSend = textOverride !== null ? textOverride : typedMessage;
    if (!textToSend.trim() || !activeChat) return;

    const clientMessageId = window.crypto?.randomUUID 
      ? window.crypto.randomUUID() 
      : `cmsg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const currentUserId = user?.id || (role === "admin" ? "admin_user" : "user_1");

    const newMsg = {
      id: clientMessageId,
      clientMessageId,
      tempId: clientMessageId,
      chatId: activeChat,
      sender: "me",
      senderId: currentUserId,
      senderRole: role,
      senderName: user?.name || (role === "admin" ? "Super Admin" : "You"),
      text: textToSend.trim(),
      messageType: "TEXT",
      status: "SENDING",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString()
    };

    if (textOverride === null) setTypedMessage("");
    sendTyping(activeChat, false);

    // Optimistically update UI immediately
    setMessages(prev => {
      const currentList = prev[activeChat] || [];
      const updated = [...currentList, newMsg];
      localStorage.setItem(`sb_chat_msgs_${activeChat}`, JSON.stringify(updated));
      return { ...prev, [activeChat]: updated };
    });

    // 1. Send via Socket.io with ACK timeout
    try {
      const ackRes = await emitMessage({
        chatId: activeChat,
        senderId: currentUserId,
        senderRole: role,
        senderName: user?.name || "User",
        text: textToSend.trim(),
        clientMessageId,
        tempId: clientMessageId,
        messageType: "TEXT",
        createdAt: newMsg.createdAt
      }, 8000);

      if (ackRes && ackRes.success) {
        setMessages(prev => {
          const list = prev[activeChat] || [];
          const updated = list.map(m => (m.clientMessageId === clientMessageId || m.id === clientMessageId) ? { ...m, status: "SENT", id: ackRes.messageId || m.id } : m);
          localStorage.setItem(`sb_chat_msgs_${activeChat}`, JSON.stringify(updated));
          return { ...prev, [activeChat]: updated };
        });
        return;
      }
    } catch (socketErr) {
      console.warn("Socket message send failed or timed out, trying REST fallback:", socketErr.message);
    }

    // 2. Fallback to REST API if Socket ACK failed
    try {
      const apiRes = await chatApi.sendMessage(activeChat, {
        content: textToSend.trim(),
        clientMessageId,
        messageType: "TEXT"
      });

      if (apiRes && apiRes.success && apiRes.data?.message) {
        const savedMsg = apiRes.data.message;
        setMessages(prev => {
          const list = prev[activeChat] || [];
          const updated = list.map(m => (m.clientMessageId === clientMessageId || m.id === clientMessageId) ? { ...m, status: "SENT", id: savedMsg.id } : m);
          localStorage.setItem(`sb_chat_msgs_${activeChat}`, JSON.stringify(updated));
          return { ...prev, [activeChat]: updated };
        });
        return;
      }
    } catch (apiErr) {
      console.error("REST fallback send failed:", apiErr);
      const blockedReason = apiErr.response?.data?.error || apiErr.message;
      if (apiErr.response?.data?.isBlocked) {
        setBlockedNotice({ text: textToSend.trim(), reason: blockedReason });
      }
    }

    // 3. Mark message as FAILED if both socket and REST fail
    setMessages(prev => {
      const list = prev[activeChat] || [];
      const updated = list.map(m => (m.clientMessageId === clientMessageId || m.id === clientMessageId) ? { ...m, status: "FAILED" } : m);
      localStorage.setItem(`sb_chat_msgs_${activeChat}`, JSON.stringify(updated));
      return { ...prev, [activeChat]: updated };
    });
  };

  const handleRetryMessage = async (failedMsg) => {
    if (!failedMsg || !activeChat) return;

    const msgClientKey = failedMsg.clientMessageId || failedMsg.id;

    setMessages(prev => {
      const list = prev[activeChat] || [];
      const updated = list.map(m => (m.clientMessageId === msgClientKey || m.id === msgClientKey) ? { ...m, status: "SENDING" } : m);
      return { ...prev, [activeChat]: updated };
    });

    try {
      const ackRes = await emitMessage({
        chatId: activeChat,
        senderId: failedMsg.senderId || user?.id,
        senderRole: role,
        senderName: failedMsg.senderName || "User",
        text: failedMsg.text,
        attachment: failedMsg.attachment,
        clientMessageId: msgClientKey,
        tempId: msgClientKey,
        messageType: failedMsg.messageType || "TEXT",
        createdAt: failedMsg.createdAt
      }, 8000);

      if (ackRes && ackRes.success) {
        setMessages(prev => {
          const list = prev[activeChat] || [];
          const updated = list.map(m => (m.clientMessageId === msgClientKey || m.id === msgClientKey) ? { ...m, status: "SENT", id: ackRes.messageId || m.id } : m);
          localStorage.setItem(`sb_chat_msgs_${activeChat}`, JSON.stringify(updated));
          return { ...prev, [activeChat]: updated };
        });
        return;
      }
    } catch (e) {
      try {
        const apiRes = await chatApi.sendMessage(activeChat, {
          content: failedMsg.text,
          clientMessageId: msgClientKey,
          messageType: failedMsg.messageType || "TEXT"
        });
        if (apiRes && apiRes.success) {
          setMessages(prev => {
            const list = prev[activeChat] || [];
            const updated = list.map(m => (m.clientMessageId === msgClientKey || m.id === msgClientKey) ? { ...m, status: "SENT", id: apiRes.data.message.id } : m);
            localStorage.setItem(`sb_chat_msgs_${activeChat}`, JSON.stringify(updated));
            return { ...prev, [activeChat]: updated };
          });
          return;
        }
      } catch (err2) {
        setMessages(prev => {
          const list = prev[activeChat] || [];
          const updated = list.map(m => (m.clientMessageId === msgClientKey || m.id === msgClientKey) ? { ...m, status: "FAILED" } : m);
          return { ...prev, [activeChat]: updated };
        });
      }
    }
  };

  const handleToggleReaction = async (msgId, emoji) => {
    try {
      const chatMsgs = messages[activeChat] || [];
      const updated = chatMsgs.map(m => {
        if (m.id === msgId || m.tempId === msgId || m.clientMessageId === msgId) {
          const reactions = m.reactions || [];
          const existingIdx = reactions.findIndex(r => r.userId === user?.id && r.emoji === emoji);
          let newReactions = [...reactions];
          if (existingIdx >= 0) {
            newReactions.splice(existingIdx, 1);
          } else {
            newReactions.push({ userId: user?.id, emoji });
          }
          return { ...m, reactions: newReactions };
        }
        return m;
      });

      localStorage.setItem(`sb_chat_msgs_${activeChat}`, JSON.stringify(updated));
      setMessages(prev => ({ ...prev, [activeChat]: updated }));

      chatApi.toggleReaction(msgId, emoji).catch(() => {});
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveEdit = async (msgId) => {
    if (!editContent.trim()) return;
    try {
      const chatMsgs = messages[activeChat] || [];
      const updated = chatMsgs.map(m => {
        if (m.id === msgId || m.tempId === msgId || m.clientMessageId === msgId) {
          return { ...m, text: editContent.trim(), isEdited: true, editedAt: new Date().toISOString() };
        }
        return m;
      });

      localStorage.setItem(`sb_chat_msgs_${activeChat}`, JSON.stringify(updated));
      setMessages(prev => ({ ...prev, [activeChat]: updated }));
      setEditingMessageId(null);
      setEditContent("");

      chatApi.editMessage(msgId, editContent.trim()).catch(() => {});
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      const chatMsgs = messages[activeChat] || [];
      const updated = chatMsgs.filter(m => m.id !== msgId && m.tempId !== msgId && m.clientMessageId !== msgId);
      localStorage.setItem(`sb_chat_msgs_${activeChat}`, JSON.stringify(updated));
      setMessages(prev => ({ ...prev, [activeChat]: updated }));

      chatApi.deleteMessage(msgId).catch(() => {});
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file || !activeChat) return;

    const ext = "." + file.name.split(".").pop().toLowerCase();
    const dangerousExts = [".exe", ".bat", ".cmd", ".scr", ".ps1", ".sh", ".vbs", ".jar", ".dll", ".msi"];

    if (dangerousExts.includes(ext)) {
      alert(`Security Block: Executable files (${ext}) are prohibited for security protection.`);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("File size limit is 10 MB.");
      return;
    }

    setUploadProgress({ isUploading: true, progressPercent: 15, fileName: file.name });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("conversationId", activeChat);

      let attachmentUrl = null;
      let attachmentId = null;

      try {
        const res = await chatApi.uploadAttachment(formData, (percent) => {
          setUploadProgress({ isUploading: true, progressPercent: Math.max(15, percent), fileName: file.name });
        });
        if (res && res.success && res.data) {
          attachmentUrl = res.data.url;
          attachmentId = res.data.attachmentId || res.data.id;
        } else {
          throw new Error(res?.error || "Attachment upload failed");
        }
      } catch (uploadErr) {
        setUploadProgress(null);
        console.error("Attachment upload API error:", uploadErr);
        const errorMsg = uploadErr.response?.data?.error || uploadErr.message || "File upload failed";
        setUploadErrorNotice({ file, fileName: file.name, errorMsg });
        return; // Abort sending message if upload failed
      }

      setUploadProgress(null);

      const clientMessageId = window.crypto?.randomUUID 
        ? window.crypto.randomUUID() 
        : `file_msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const currentUserId = user?.id || (role === "admin" ? "admin_user" : "user_1");

      const isImg = file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name);

      const newMsg = {
        id: clientMessageId,
        clientMessageId,
        tempId: clientMessageId,
        chatId: activeChat,
        sender: "me",
        senderId: currentUserId,
        senderName: user?.name || (role === "admin" ? "Super Admin" : "You"),
        senderRole: role,
        messageType: isImg ? "IMAGE" : "FILE",
        text: `📎 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
        attachment: {
          id: attachmentId,
          attachmentId,
          url: attachmentUrl,
          fileName: file.name,
          mimeType: file.type,
          size: file.size
        },
        status: "SENDING",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: new Date().toISOString()
      };

      const chatMsgs = messages[activeChat] || [];
      const updatedMsgs = [...chatMsgs, newMsg];
      localStorage.setItem(`sb_chat_msgs_${activeChat}`, JSON.stringify(updatedMsgs));
      setMessages(prev => ({ ...prev, [activeChat]: updatedMsgs }));

      // Emit file message over socket
      try {
        const ackRes = await emitMessage(newMsg, 8000);
        if (ackRes && ackRes.success) {
          setMessages(prev => {
            const list = prev[activeChat] || [];
            const updated = list.map(m => (m.clientMessageId === clientMessageId || m.id === clientMessageId) ? { ...m, status: "SENT", id: ackRes.messageId || m.id } : m);
            localStorage.setItem(`sb_chat_msgs_${activeChat}`, JSON.stringify(updated));
            return { ...prev, [activeChat]: updated };
          });
        }
      } catch (err) {
        setMessages(prev => {
          const list = prev[activeChat] || [];
          const updated = list.map(m => (m.clientMessageId === clientMessageId || m.id === clientMessageId) ? { ...m, status: "SENT" } : m);
          localStorage.setItem(`sb_chat_msgs_${activeChat}`, JSON.stringify(updated));
          return { ...prev, [activeChat]: updated };
        });
      }
    } catch (err) {
      setUploadProgress(null);
      console.error("Attachment upload processing error:", err);
      const errorMsg = err.response?.data?.error || err.message || "File upload failed";
      setUploadErrorNotice({ file, fileName: file.name, errorMsg });
    }
  };

  const handleConvertToTask = (msgText) => {
    alert(`Task Created: "${msgText.slice(0, 50)}..." assigned to project workflow.`);
  };

  const handleCreateRevision = async () => {
    if (!revisionIssue.trim()) {
      alert("Please specify the revision issue.");
      return;
    }
    try {
      const revMsg = {
        id: `rev_${Date.now()}`,
        clientMessageId: `rev_${Date.now()}`,
        chatId: activeChat,
        sender: "me",
        senderId: user?.id,
        senderName: user?.name || "User",
        senderRole: role,
        messageType: "REVISION_REQUEST",
        text: `📋 Revision Request: "${revisionIssue.trim()}" (${revisionPriority} Priority)`,
        revisionDetails: {
          issue: revisionIssue.trim(),
          description: revisionDescription.trim(),
          priority: revisionPriority,
          status: "OPEN"
        },
        status: "SENT",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: new Date().toISOString()
      };

      const chatMsgs = messages[activeChat] || [];
      const updatedMsgs = [...chatMsgs, revMsg];
      localStorage.setItem(`sb_chat_msgs_${activeChat}`, JSON.stringify(updatedMsgs));
      setMessages(prev => ({ ...prev, [activeChat]: updatedMsgs }));
      setShowRevisionModal(false);
      setRevisionIssue("");
      setRevisionDescription("");

      emitMessage(revMsg).catch(() => {});
      chatApi.requestRevision(activeChat, {
        issue: revisionIssue.trim(),
        description: revisionDescription.trim(),
        priority: revisionPriority
      }).catch(() => {});
    } catch (e) {
      console.error("Revision error", e);
    }
  };

  const handleExportTranscript = async () => {
    try {
      const res = await chatApi.exportConversation(activeChat);
      if (res && res.success && res.data?.transcript) {
        const blob = new Blob([JSON.stringify(res.data.transcript, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `transcript_${activeChat}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      alert("Exporting conversation transcript failed.");
    }
  };

  const messagesEndRef = useRef(null);

  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (activeChat) {
      scrollToBottom("auto");
    }
  }, [activeChat]);

  useEffect(() => {
    if (activeChat && messages[activeChat]?.length > 0) {
      scrollToBottom("smooth");
    }
  }, [messages, activeChat]);

  const handleDownloadFile = async (attachment) => {
    if (!attachment) return;
    const fileName = attachment.fileName || attachment.originalName || "attachment";
    const attId = attachment.id || attachment.attachmentId;

    if (attId) {
      try {
        await chatApi.downloadAttachment(attId, fileName);
        return;
      } catch (err) {
        console.warn("API attachment download failed, attempting direct download:", err);
      }
    }

    let fileUrl = attachment.url || attachment.storedUrl;
    if (!fileUrl) {
      alert("Attachment file link not available");
      return;
    }

    if (!fileUrl.startsWith("http") && !fileUrl.startsWith("blob:")) {
      const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";
      const serverHost = apiBase.replace(/\/api\/v1\/?$/, "");
      fileUrl = `${serverHost}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
    }

    try {
      const res = await fetch(fileUrl);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      window.open(fileUrl, "_blank");
    }
  };

  return (
    <section className="h-[calc(100vh-65px)] flex flex-col items-center justify-center bg-[#f0f2f5] font-sans antialiased overflow-hidden select-none p-1 sm:px-3 sm:py-2">
      {/* Network Reconnecting Banner */}
      {isReconnecting && (
        <div className="w-full bg-amber-500 text-white text-[11px] font-bold py-1 px-4 text-center flex items-center justify-center gap-2 shadow-sm z-50 animate-pulse rounded-lg mb-2">
          <span>⚡ Reconnecting to real-time chat server...</span>
        </div>
      )}

      {/* Main WhatsApp Grid Wrapper */}
      <div className="h-full max-h-[calc(100vh-85px)] flex overflow-hidden max-w-[1880px] w-full mx-auto rounded-2xl shadow-xl border border-slate-200/90 bg-white">
        
        {/* Left Sidebar: Conversations & Contacts List */}
        <aside className={`${activeChat ? "hidden md:flex" : "flex"} w-full md:w-[320px] lg:w-[350px] flex-col border-r border-slate-200 bg-white shrink-0`}>
          {/* Header */}
          <div className="p-3 px-4 bg-[#f0f2f5] border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-700 text-white font-extrabold flex items-center justify-center text-sm shadow-sm ring-2 ring-emerald-500/30">
                {userInitials}
              </div>
              <div className="leading-tight">
                <h3 className="font-bold text-slate-900 text-sm truncate max-w-[160px]">{user?.name || "User"}</h3>
                <span className="inline-block px-1.5 py-0.2 rounded text-[9.5px] font-extrabold tracking-wide uppercase bg-emerald-100 text-emerald-800">
                  {role}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-1 text-slate-600">
              <button onClick={() => navigate("/dashboard")} title="Back to Dashboard" className="p-2 hover:bg-slate-200 rounded-full transition cursor-pointer text-base">
                🏠
              </button>
            </div>
          </div>

          {/* Search Contacts Bar */}
          <div className="p-2.5 px-3 bg-white border-b border-slate-100">
            <div className="relative flex items-center bg-[#f0f2f5] rounded-xl px-3 py-1.5 border border-slate-200/60 focus-within:border-emerald-500 transition">
              <img src="https://cdn-icons-png.flaticon.com/128/16799/16799322.png" alt="Search" className="w-3.5 h-3.5 object-contain mr-2 opacity-60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search or start new chat..."
                className="w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-500 font-medium"
              />
            </div>
          </div>

          {/* Contacts & Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80">
            {requests
              .filter(r => {
                if (!searchQuery) return true;
                const name = r.senderName || r.receiverName || "";
                return name.toLowerCase().includes(searchQuery.toLowerCase());
              })
              .map((req) => {
                const isSelected = activeChat === req.id;
                const lastMsgList = messages[req.id] || [];
                const lastMsg = lastMsgList[lastMsgList.length - 1];

                const isOtherSender = req.senderId !== user?.id;
                const isAdminChat = req.type === "ADMIN_SUPPORT" || req.id?.includes("admin") || req.receiverName === "FreelNova Admin";
                
                const displayName = isAdminChat && user?.role !== "admin"
                  ? "FreelNova Admin"
                  : (isOtherSender ? (req.senderName || "User") : (req.receiverName || "User"));
                const displayRole = isAdminChat && user?.role !== "admin"
                  ? "SUPER ADMIN"
                  : (isOtherSender ? (req.senderRole || "Freelancer") : (req.receiverRole || "Recruiter"));
                const displayCode = isAdminChat && user?.role !== "admin"
                  ? "AID00000001"
                  : (isOtherSender ? (req.senderUserCode || "FID00000001") : (req.receiverUserCode || "FID00000002"));

                return (
                  <div
                    key={req.id}
                    onClick={() => setActiveChat(req.id)}
                    className={`p-3.5 px-4 flex items-center gap-3.5 cursor-pointer transition relative ${
                      isSelected ? "bg-[#f0f2f5]" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 text-white font-bold flex items-center justify-center text-sm shadow-xs uppercase">
                        {displayName.slice(0, 2)}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 text-xs truncate max-w-[150px]">{displayName}</h4>
                        <div className="flex items-center gap-1.5">
                          {(() => {
                            const unreadCount = (messages[req.id] || []).filter(m => m.sender !== "me" && m.senderId !== user?.id && m.status !== "READ").length;
                            return unreadCount > 0 ? (
                              <span className="h-4 min-w-4 px-1 rounded-full bg-emerald-600 text-white font-extrabold text-[9.5px] flex items-center justify-center shadow-2xs">
                                {unreadCount}
                              </span>
                            ) : null;
                          })()}
                          <span className="text-[10px] font-semibold text-slate-400">
                            {lastMsg ? (lastMsg.time || "10:00 AM") : "10:00 AM"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 uppercase tracking-tight">
                          {displayCode}
                        </span>
                        <span className="text-[9.5px] font-bold text-emerald-700 uppercase truncate">
                          {displayRole}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 truncate mt-1 leading-tight font-normal">
                        {lastMsg ? (
                          lastMsg.status === "FAILED" ? (
                            <span className="text-rose-600 font-bold">⚠️ Message failed to send</span>
                          ) : lastMsg.attachment ? (
                            `📎 ${lastMsg.attachment.fileName || "File Attachment"}`
                          ) : (
                            lastMsg.text
                          )
                        ) : (
                          "Tap to start direct messaging"
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </aside>

        {/* Right Active Chat Workspace */}
        {activeChat && currentChat ? (
          <div className="flex-1 flex flex-col bg-[#efeae2] relative overflow-hidden">
            {/* Active Chat Header */}
            <div className="p-3 px-4 bg-[#f0f2f5] border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs z-10">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => setActiveChat("")} className="md:hidden text-slate-600 font-bold p-1 mr-1">
                  ←
                </button>
                <div className="h-10 w-10 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center text-sm shrink-0 uppercase shadow-xs">
                  {currentChat.name.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm whitespace-nowrap">{currentChat.name}</h3>
                    <span className="text-[10px] font-bold text-slate-500">@{currentChat.username}</span>
                    {typingUsers[activeChat] && (
                      <span className="text-[11px] font-bold text-emerald-600 animate-pulse ml-2">
                        ✍️ {typingUsers[activeChat]} is typing...
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 leading-tight truncate mt-0.5">
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                      {currentChat.userCode || (currentChat.type === "ADMIN_SUPPORT" ? "AID00000001" : "FID00000001")}
                    </span>
                    <span className="text-[9.5px] font-bold uppercase text-slate-700">
                      {currentChat.type === "ADMIN_SUPPORT" || currentChat.role === "Admin" || currentChat.role === "ADMIN" ? "SUPER ADMIN" : currentChat.role}
                    </span>
                    {currentChat.type !== "ADMIN_SUPPORT" && currentChat.projectTitle && currentChat.projectTitle !== "Account Compliance & Support" && (
                      <>
                        <span>•</span>
                        <span className="truncate text-slate-600">{currentChat.projectTitle}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setShowRevisionModal(true)} className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                  <img src="https://cdn-icons-png.flaticon.com/128/15532/15532160.png" alt="Revision" className="w-4 h-4 object-contain" />
                  <span>Request Revision</span>
                </button>
                <button onClick={() => setShowInChatSearch(prev => !prev)} title="Search In Chat" className="p-2 text-slate-600 hover:bg-slate-200 rounded-full transition cursor-pointer text-sm flex items-center justify-center">
                  <img src="https://cdn-icons-png.flaticon.com/128/16799/16799322.png" alt="Search" className="w-4 h-4 object-contain" />
                </button>
                <button onClick={() => setShowProjectDrawer(prev => !prev)} title="Project Vault Drawer" className="p-2 text-slate-600 hover:bg-slate-200 rounded-full transition cursor-pointer text-sm flex items-center justify-center">
                  <img src="https://cdn-icons-png.flaticon.com/128/5196/5196633.png" alt="Vault" className="w-4 h-4 object-contain" />
                </button>
                <button 
                  onClick={() => setActiveChat("")} 
                  title="Close Chat" 
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer font-bold text-sm border border-slate-200 hover:border-rose-200 flex items-center justify-center ml-1"
                >
                  ✖
                </button>
              </div>
            </div>

            {/* In-Chat Search Bar Dropdown */}
            {showInChatSearch && (
              <div className="bg-white border-b border-slate-200 p-2 px-4 flex items-center gap-2 shadow-sm z-10 animate-fadeIn">
                <img src="https://cdn-icons-png.flaticon.com/128/16799/16799322.png" alt="Search" className="w-3.5 h-3.5 object-contain opacity-60" />
                <input
                  type="text"
                  value={inChatSearch}
                  onChange={(e) => setInChatSearch(e.target.value)}
                  placeholder="Search messages in this conversation..."
                  className="w-full text-xs text-slate-800 outline-none font-medium"
                />
                <button onClick={() => { setInChatSearch(""); setShowInChatSearch(false); }} className="text-xs font-bold text-slate-500 hover:text-slate-800">
                  Cancel
                </button>
              </div>
            )}

            {/* Chat Body & Messages Area */}
            <div className="flex-1 flex overflow-hidden relative">
              <div 
                className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6 relative"
                style={{
                  backgroundColor: "#efeae2",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23b3aba0' fill-opacity='0.08'%3E%3Cpath d='M10 20c-1.1 0-2-.9-2-2v-2c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2h-2zm30 30c-1.1 0-2-.9-2-2v-2c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2h-2zm-20 0c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2h-2c-1.1 0-2-.9-2-2v-2zm40-20c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2h-2c-1.1 0-2-.9-2-2v-2z'/%3E%3C/g%3E%3C/svg%3E")`
                }}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDraggingOver(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
              >
                {/* Drag & Drop Target Overlay */}
                {isDraggingOver && (
                  <div className="absolute inset-0 bg-blue-600/80 backdrop-blur-xs z-40 flex flex-col items-center justify-center text-white border-4 border-dashed border-white m-4 rounded-2xl animate-fadeIn">
                    <div className="text-5xl mb-2">📁</div>
                    <h3 className="text-xl font-bold">Drop files here to upload to Project Workspace</h3>
                    <p className="text-xs text-blue-100 mt-1">Supports Images, PDFs, DOCX, ZIP (Max 10 MB)</p>
                  </div>
                )}

                {/* Date Separator Pill */}
                {activeMsgs.length > 0 && (
                  <div className="flex justify-center my-3 select-none">
                    <span className="bg-white text-slate-500 border border-slate-200/50 text-[11px] font-bold px-3 py-1 rounded shadow-xs uppercase tracking-wider">
                      Today
                    </span>
                  </div>
                )}

                {activeMsgs
                  .filter(m => !inChatSearch || m.text.toLowerCase().includes(inChatSearch.toLowerCase()))
                  .map((msg, idx) => {
                    if (msg.sender === "system") {
                      return (
                        <div key={idx} className="flex justify-center my-2">
                          <span className="bg-[#ffe596]/60 border border-[#e2d5ab]/40 text-[#514317] text-[11px] font-bold py-1.5 px-4 rounded-lg shadow-xs max-w-md text-center">
                            🔒 {msg.text}
                          </span>
                        </div>
                      );
                    }

                    const currentUserId = user?.id || (role === "admin" ? "admin_user" : "user_1");
                    const isMe = role === "admin"
                      ? (msg.senderRole === "admin" || msg.senderId === "admin_user" || msg.senderId === currentUserId)
                      : (msg.senderRole === "freelancer" || msg.senderRole === "recruiter" || (msg.senderId && msg.senderId === currentUserId));

                    const isRevisionMsg = msg.messageType === "REVISION_REQUEST" || msg.revisionDetails;
                    const isFileMsg = msg.messageType === "FILE" || msg.messageType === "IMAGE" || msg.attachment;

                    return (
                      <div key={idx} id={msg.id || msg.clientMessageId || msg.tempId} className={`flex ${isMe ? "justify-end" : "justify-start"} group relative mb-2`}>
                        <div 
                          className={`max-w-[85%] md:max-w-[70%] px-3.5 py-2.5 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] text-sm relative leading-relaxed rounded-xl transition ${
                            isMe 
                              ? "bg-[#d9fdd3] text-[#111b21] rounded-tr-none" 
                              : "bg-white text-[#111b21] rounded-tl-none"
                          }`}
                        >
                          {/* Quoted Reply Box */}
                          {msg.replyTo && (
                            <div 
                              onClick={() => {
                                const targetEl = document.getElementById(msg.replyTo.id);
                                if (targetEl) targetEl.scrollIntoView({ behavior: "smooth" });
                              }}
                              className="bg-black/5 border-l-4 border-emerald-600 rounded p-1.5 mb-1.5 text-xs text-slate-700 cursor-pointer hover:bg-black/10 transition"
                            >
                              <span className="font-bold text-emerald-800 block text-[11px]">{msg.replyTo.senderName || "Replying to"}</span>
                              <span className="italic truncate block">{msg.replyTo.text}</span>
                            </div>
                          )}

                          {/* File Attachment Card */}
                          {isFileMsg && msg.attachment ? (
                            <div className="space-y-1.5 py-0.5">
                              {msg.messageType === "IMAGE" || (msg.attachment && (msg.attachment.mimeType?.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(msg.attachment.fileName || ""))) ? (
                                <div className="rounded-xl overflow-hidden border border-slate-200/80 bg-white max-w-sm shadow-xs">
                                  <div 
                                    className="relative group/img cursor-pointer bg-slate-900/5 overflow-hidden" 
                                    onClick={() => setActiveLightboxImage({ id: msg.attachment.id || msg.attachment.attachmentId, url: msg.attachment.url, fileName: msg.attachment.fileName, size: msg.attachment.size })}
                                  >
                                    <img 
                                      src={msg.attachment.url?.startsWith("http") || msg.attachment.url?.startsWith("blob:") ? msg.attachment.url : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'}`.replace('/api/v1', '') + msg.attachment.url} 
                                      alt={msg.attachment.fileName} 
                                      className="max-h-72 w-full object-cover rounded-t-xl transition duration-200 group-hover/img:scale-[1.02]"
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                                      <span>🔍 Expand Preview</span>
                                    </div>
                                  </div>
                                  <div className="p-2.5 px-3 text-xs font-semibold text-slate-700 flex justify-between items-center bg-white border-t border-slate-100 gap-2">
                                    <div className="min-w-0">
                                      <p className="truncate text-slate-800 font-bold" title={msg.attachment.fileName}>
                                        {msg.attachment.fileName}
                                      </p>
                                      {msg.attachment.size && <p className="text-[10px] text-slate-500 font-normal">{(msg.attachment.size / 1024).toFixed(1)} KB</p>}
                                    </div>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownloadFile(msg.attachment);
                                      }} 
                                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[11px] shrink-0 transition shadow-2xs cursor-pointer"
                                    >
                                      Download
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="border border-slate-200/90 bg-white rounded-xl p-3 flex items-center justify-between gap-3 max-w-xs shadow-xs">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="h-10 w-10 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                                      {msg.attachment.fileName?.split('.').pop() || "FILE"}
                                    </div>
                                    <div className="min-w-0 leading-tight">
                                      <p className="font-bold text-slate-900 text-xs truncate" title={msg.attachment.fileName}>{msg.attachment.fileName}</p>
                                      <p className="text-[10px] text-slate-500">{((msg.attachment.size || 0) / 1024).toFixed(1)} KB</p>
                                    </div>
                                  </div>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadFile(msg.attachment);
                                    }}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[11px] shrink-0 cursor-pointer shadow-2xs transition"
                                  >
                                    Open / Download
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : isRevisionMsg ? (
                            <div className="border border-amber-300 bg-amber-50/80 rounded-xl p-3 text-xs space-y-1.5 my-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-amber-900 text-xs">📋 Project Revision Request</span>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-200 text-amber-800">
                                  {msg.revisionDetails?.priority || "HIGH"} PRIORITY
                                </span>
                              </div>
                              <p className="font-bold text-slate-900 text-xs">{msg.revisionDetails?.issue || msg.text}</p>
                              {msg.revisionDetails?.description && (
                                <p className="text-slate-600 text-[11px] leading-snug">{msg.revisionDetails.description}</p>
                              )}
                              <div className="pt-1 flex gap-2">
                                <button onClick={() => alert("Revision Accepted. Updated in project milestone tracker.")} className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] cursor-pointer">
                                  Accept Revision
                                </button>
                              </div>
                            </div>
                          ) : editingMessageId === (msg.id || msg.clientMessageId || msg.tempId) ? (
                            <div className="space-y-1.5 py-1">
                              <input
                                type="text"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 outline-none"
                              />
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => handleSaveEdit(msg.id || msg.clientMessageId || msg.tempId)} className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold">Save</button>
                                <button onClick={() => setEditingMessageId(null)} className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-bold">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <p 
                              className="whitespace-pre-wrap font-normal text-[13.5px] leading-5 text-[#111b21]" 
                              style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                            >
                              {msg.text}
                            </p>
                          )}

                          {/* Reaction Pills */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {msg.reactions.map((r, ri) => (
                                <span key={ri} className="bg-white/80 border border-slate-200 rounded-full px-1.5 py-0.2 text-[10px] font-bold shadow-2xs">
                                  {r.emoji}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Dedicated Metadata & Status Ticks Row */}
                          <div className="flex items-center justify-end gap-1 text-[9.5px] text-[#667781] select-none mt-1 pt-0.5">
                            {msg.isEdited && <span className="italic text-[9px] text-slate-400">edited</span>}
                            <span>{msg.time || "10:00 AM"}</span>
                            {isMe && (
                              <div className="flex items-center shrink-0 ml-0.5" title={`Status: ${msg.status || "SENT"}`}>
                                {msg.status === "SENDING" ? (
                                  <span className="text-slate-400 text-[10px] animate-pulse">⏳</span>
                                ) : msg.status === "FAILED" ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-rose-600 font-bold text-[10px]">❌</span>
                                    <button 
                                      onClick={() => handleRetryMessage(msg)}
                                      className="text-[9px] font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 px-1.5 py-0.5 rounded cursor-pointer"
                                    >
                                      Retry
                                    </button>
                                  </div>
                                ) : msg.status === "READ" ? (
                                  <svg viewBox="0 0 16 15" width="15" height="15" className="text-[#53bdeb] shrink-0" title="Read (Blue Ticks)">
                                    <path fill="currentColor" d="M15.01 3.3L8.07 11.59l-3.23-2.73l-1.04 1.23l4.27 3.61l7.98-9.4zM18 3.3l-7.98 9.4l-1.04-1.23l7.98-9.4z" />
                                  </svg>
                                ) : msg.status === "DELIVERED" ? (
                                  <svg viewBox="0 0 16 15" width="15" height="15" className="text-slate-500 shrink-0" title="Delivered">
                                    <path fill="currentColor" d="M15.01 3.3L8.07 11.59l-3.23-2.73l-1.04 1.23l4.27 3.61l7.98-9.4zM18 3.3l-7.98 9.4l-1.04-1.23l7.98-9.4z" />
                                  </svg>
                                ) : (
                                  <svg viewBox="0 0 16 15" width="13" height="13" className="text-slate-400 shrink-0" title="Sent">
                                    <path fill="currentColor" d="M15.01 3.3L8.07 11.59l-3.23-2.73l-1.04 1.23l4.27 3.61l7.98-9.4z" />
                                  </svg>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Hover Action Controls Menu */}
                          <div className="hidden group-hover:flex items-center gap-1 absolute -top-3.5 right-2 bg-white border border-slate-200 rounded-full px-2 py-0.5 shadow-md z-10 text-[11px]">
                            <button onClick={() => setReplyToMessage({ id: msg.id || msg.clientMessageId || msg.tempId, text: msg.text, senderName: isMe ? "You" : currentChat.name })} title="Reply" className="hover:text-blue-600 font-bold p-0.5">💬</button>
                            <button onClick={() => handleToggleReaction(msg.id || msg.clientMessageId || msg.tempId, "👍")} title="React 👍" className="hover:scale-125 transition p-0.5">👍</button>
                            <button onClick={() => handleToggleReaction(msg.id || msg.clientMessageId || msg.tempId, "❤️")} title="React ❤️" className="hover:scale-125 transition p-0.5">❤️</button>
                            <button onClick={() => handleToggleReaction(msg.id || msg.clientMessageId || msg.tempId, "🚀")} title="React 🚀" className="hover:scale-125 transition p-0.5">🚀</button>
                            <button onClick={() => handleConvertToTask(msg.text)} title="Convert to Task" className="hover:text-emerald-600 font-bold p-0.5">📌</button>
                            {isMe && (
                              <>
                                <button onClick={() => { setEditingMessageId(msg.id || msg.clientMessageId || msg.tempId); setEditContent(msg.text); }} title="Edit Message" className="hover:text-blue-600 font-bold p-0.5">📝</button>
                                <button onClick={() => handleDeleteMessage(msg.id || msg.clientMessageId || msg.tempId)} title="Delete Message" className="hover:text-rose-600 font-bold p-0.5">🗑️</button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {/* Live AI Agent / User Typing Indicator */}
                {isAILoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[70%] rounded-lg rounded-tl-none bg-white p-3.5 shadow-xs border-l-4 border-indigo-500">
                      <div className="flex items-center gap-2.5 text-xs font-bold text-indigo-700 animate-pulse">
                        <div className="h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
                        <span>
                          {(() => {
                            const req = requests.find(r => r.id === currentChat.id);
                            const isAgent = currentChat.id.startsWith("agent_") || (req && req.receiverId.startsWith("agent_"));
                            return isAgent 
                              ? `🤖 ${currentChat.name} is running autonomous task sandbox...` 
                              : `${currentChat.name} is typing...`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Project Context Right Drawer */}
              {showProjectDrawer && (
                <div className="w-80 bg-white border-l border-slate-200 p-4 overflow-y-auto space-y-4 shadow-xl z-20 shrink-0">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h3 className="text-sm font-bold text-slate-900">📁 Project Workspace</h3>
                    <button onClick={() => setShowProjectDrawer(false)} className="text-slate-400 hover:text-slate-700 font-bold text-xs">✕</button>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Contract</p>
                    <p className="font-bold text-slate-800 text-xs">{currentChat.projectTitle || "Account Compliance & Support"}</p>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600 pt-1">
                      <span>Status:</span>
                      <span className="text-emerald-700 font-bold uppercase">{currentChat.status || "ACCEPTED"}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Workspace Quick Actions</h4>
                    <button onClick={handleExportTranscript} className="w-full text-left px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-800 transition">
                      📑 Export Conversation Transcript
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Upload Error Notice Toast */}
            {uploadErrorNotice && (
              <div className="bg-rose-50 border-t border-rose-300 p-2.5 px-4 flex items-center justify-between text-xs text-rose-900 font-semibold shadow-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-base">⚠️</span>
                  <span className="truncate">Upload failed: {uploadErrorNotice.fileName} ({uploadErrorNotice.errorMsg})</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <button 
                    onClick={() => {
                      const retryFile = uploadErrorNotice.file;
                      setUploadErrorNotice(null);
                      handleFileUpload(retryFile);
                    }} 
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs cursor-pointer"
                  >
                    Retry
                  </button>
                  <button 
                    onClick={() => setUploadErrorNotice(null)} 
                    className="px-2 py-1 text-slate-500 hover:text-slate-800 font-bold text-xs cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            {/* Upload Progress Indicator Card */}
            {uploadProgress && (
              <div className="bg-blue-50 border-t border-blue-200 p-2.5 px-4 flex items-center justify-between text-xs text-blue-900 font-semibold shadow-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-bold text-blue-700 animate-spin">⏳</span>
                  <span className="truncate">Uploading {uploadProgress.fileName} ({uploadProgress.progressPercent}%)</span>
                </div>
                <div className="w-28 bg-blue-200 h-2 rounded-full overflow-hidden shrink-0 ml-2">
                  <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${uploadProgress.progressPercent}%` }} />
                </div>
              </div>
            )}

            {/* Project Quick Actions Bar above Composer */}
            <div className="bg-[#f0f2f5] border-t border-slate-200/60 px-4 py-1.5 flex items-center gap-2 overflow-x-auto text-[11px] font-semibold text-slate-700 shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Quick Tools:</span>
              <button 
                onClick={() => fileInputRef.current && fileInputRef.current.click()} 
                className="bg-white hover:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 flex items-center gap-1.5 cursor-pointer transition shrink-0 font-medium"
              >
                <img src="https://cdn-icons-png.flaticon.com/128/17777/17777801.png" alt="Attach" className="w-4 h-4 object-contain" />
                <span>Attach</span>
              </button>
              <button 
                onClick={() => alert("Share Deliverable: Selected milestone deliverable posted.")} 
                className="bg-white hover:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 flex items-center gap-1.5 cursor-pointer transition shrink-0 font-medium"
              >
                <img src="https://cdn-icons-png.flaticon.com/128/16995/16995463.png" alt="Deliverable" className="w-4 h-4 object-contain" />
                <span>Deliverable</span>
              </button>
              <button 
                onClick={() => setShowProjectDrawer(true)} 
                className="bg-white hover:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 flex items-center gap-1.5 cursor-pointer transition shrink-0 font-medium"
              >
                <img src="https://cdn-icons-png.flaticon.com/128/5196/5196633.png" alt="Vault Files" className="w-4 h-4 object-contain" />
                <span>Vault Files</span>
              </button>
              <button 
                onClick={() => setShowRevisionModal(true)} 
                className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg px-2.5 py-1 flex items-center gap-1.5 cursor-pointer transition shrink-0 font-bold"
              >
                <img src="https://cdn-icons-png.flaticon.com/128/15532/15532160.png" alt="Request Revision" className="w-4 h-4 object-contain" />
                <span>Request Revision</span>
              </button>
            </div>

            {/* Non-destructive Anti-Off-Platform Alert Toast */}
            {blockedNotice && (
              <div className="bg-rose-50 border-t border-rose-300 p-3 px-4 flex items-center justify-between text-xs text-rose-800 font-semibold shadow-md">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  <span>{blockedNotice.reason}</span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setBlockedNotice(null)} className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs cursor-pointer">
                    Edit Message
                  </button>
                  <button onClick={() => setBlockedNotice(null)} className="px-2 py-1 text-slate-500 hover:text-slate-800 font-bold text-xs cursor-pointer">
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Replying to Bar */}
            {replyToMessage && (
              <div className="bg-slate-200 border-t border-slate-300 p-2 px-4 flex items-center justify-between text-xs text-slate-700">
                <div className="truncate">
                  <span className="font-bold text-emerald-800">Replying to {replyToMessage.senderName}: </span>
                  <span className="italic truncate">{replyToMessage.text}</span>
                </div>
                <button onClick={() => setReplyToMessage(null)} className="text-slate-500 hover:text-slate-800 font-bold text-xs ml-2">✕</button>
              </div>
            )}

            {/* Hidden File Input Picker */}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                  e.target.value = "";
                }
              }} 
            />

            {/* Emoji Picker Popover */}
            {showEmojiPicker && (
              <div className="bg-white border border-slate-300 rounded-xl p-2.5 shadow-xl flex gap-2 text-lg max-w-xs mx-4 mb-1 z-30">
                {["👍", "❤️", "😂", "🎉", "😮", "😢", "🔥", "🚀", "💡", "✅", "❌", "📋", "📁"].map((emoji, ei) => (
                  <button
                    key={ei}
                    onClick={() => {
                      setTypedMessage(prev => prev + emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="hover:scale-125 transition cursor-pointer p-1"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className="border-t border-slate-200 bg-[#f0f2f5] px-4 py-3 shrink-0">
              {currentChat.status === "pending" ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-center text-xs text-amber-800 font-semibold shadow-xs">
                  🔒 Chat is locked. Waiting for recruiter to confirm selection and complete escrow payment.
                </div>
              ) : currentChat.status === "completed" ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-center text-xs text-rose-800 font-semibold shadow-xs">
                  🔒 Project Completed. Chat workspace has been disabled.
                </div>
              ) : (
                <div className="flex items-center gap-2 max-w-6xl mx-auto">
                  {/* Paperclip Attach File Button */}
                  <button
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    title="Attach File (Images, PDF, Documents)"
                    className="p-2 hover:bg-slate-200 rounded-full transition cursor-pointer flex items-center justify-center shrink-0"
                  >
                    <img src="https://cdn-icons-png.flaticon.com/128/17777/17777801.png" alt="Attach" className="w-5 h-5 object-contain" />
                  </button>

                  {/* Emoji Picker Toggle Button */}
                  <button
                    onClick={() => setShowEmojiPicker(prev => !prev)}
                    title="Insert Emoji"
                    className="p-2 text-slate-500 hover:bg-slate-200 rounded-full transition cursor-pointer text-base"
                  >
                    😊
                  </button>

                  {/* Message Input field */}
                  <input
                    type="text"
                    value={typedMessage}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendMessage();
                    }}
                    placeholder={(() => {
                      const req = requests.find(r => r.id === currentChat.id);
                      const isAgent = currentChat.id.startsWith("agent_") || (req && req.receiverId.startsWith("agent_"));
                      return isAgent 
                        ? `Assign task to ${currentChat.name} (e.g. 'write auth middleware')...` 
                        : "Type a message...";
                    })()}
                    className="w-full rounded-lg border-none bg-white px-4 py-2.5 text-[#111b21] outline-none placeholder:text-slate-500 flex-grow text-[14.5px] font-medium shadow-xs"
                  />

                  {/* Send Button */}
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={typedMessage.trim().length === 0}
                    className={`rounded-full h-10 w-10 flex items-center justify-center text-white shadow-sm transition hover:scale-105 active:scale-95 shrink-0 ${
                      typedMessage.trim().length > 0 
                        ? "bg-emerald-600 hover:bg-emerald-700 cursor-pointer" 
                        : "bg-slate-300 opacity-40 cursor-not-allowed"
                    }`}
                  >
                    <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Revision Request Modal */}
            {showRevisionModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      📋 Request Project Revision
                    </h3>
                    <button onClick={() => setShowRevisionModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Issue / Revision Title *</label>
                      <input
                        type="text"
                        value={revisionIssue}
                        onChange={(e) => setRevisionIssue(e.target.value)}
                        placeholder="e.g. Mobile Navbar overlaps header on mobile screen"
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Priority</label>
                      <select
                        value={revisionPriority}
                        onChange={(e) => setRevisionPriority(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 outline-none bg-white font-semibold"
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="CRITICAL">CRITICAL</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Detailed Description</label>
                      <textarea
                        value={revisionDescription}
                        onChange={(e) => setRevisionDescription(e.target.value)}
                        rows={3}
                        placeholder="Describe the exact changes or fixes needed..."
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={handleCreateRevision} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer">
                      Submit Revision Request
                    </button>
                    <button onClick={() => setShowRevisionModal(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Image Lightbox Modal */}
            {activeLightboxImage && (
              <div 
                className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 animate-fadeIn select-none"
                onClick={() => setActiveLightboxImage(null)}
              >
                <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadFile(activeLightboxImage);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-md flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <span>📥 Download</span>
                  </button>
                  <button 
                    onClick={() => setActiveLightboxImage(null)} 
                    className="bg-white/20 hover:bg-white/30 text-white font-bold text-sm h-8 w-8 rounded-full flex items-center justify-center cursor-pointer transition"
                  >
                    ✕
                  </button>
                </div>

                <div className="max-w-4xl max-h-[85vh] p-2 relative" onClick={(e) => e.stopPropagation()}>
                  <img 
                    src={activeLightboxImage.url} 
                    alt={activeLightboxImage.fileName} 
                    className="max-h-[80vh] w-auto object-contain rounded-lg shadow-2xl mx-auto"
                  />
                  <div className="mt-2 text-center text-white text-xs font-medium">
                    <p className="font-bold text-sm">{activeLightboxImage.fileName}</p>
                    {activeLightboxImage.size && <p className="text-[10px] text-slate-300">{(activeLightboxImage.size / 1024).toFixed(1)} KB</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Empty Chat Area State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#f8f9fa] border-l border-slate-200">
            <div className="max-w-[460px] flex flex-col items-center">
              <div className="text-slate-300 mb-6">
                <svg viewBox="0 0 400 200" width="300" height="150" className="opacity-95">
                  <circle cx="200" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6,6" />
                  <rect x="150" y="70" width="100" height="60" rx="6" fill="#f0f2f5" stroke="#e1e3e6" strokeWidth="3" />
                  <path d="M190 100h20m-10-10v20" stroke="#00a884" strokeWidth="4" strokeLinecap="round" />
                  <circle cx="120" cy="80" r="16" fill="#00a884" className="opacity-80" />
                  <circle cx="280" cy="120" r="20" fill="#3b82f6" className="opacity-80" />
                  <path d="M120 76v8m-4-4h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className="text-[32px] font-light text-slate-800 tracking-tight mb-2">FreelNova Web</h2>
              <p className="text-sm text-[#667781] leading-relaxed mb-6 font-medium">
                Send and receive messages with your clients, hiring managers, and autonomous Digital AI Agents. Connect, prototype, and build side-by-side in secure workspaces.
              </p>
              <div className="w-full h-px bg-slate-200/80 mb-6" />
              <div className="flex items-center justify-center gap-1.5 text-xs text-[#8696a0] font-semibold">
                <svg viewBox="0 0 24 24" height="14" width="14" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
                <span>End-to-end encrypted contract workspaces.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default Messages;
