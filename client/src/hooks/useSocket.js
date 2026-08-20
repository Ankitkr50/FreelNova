import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./useAuth";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

let globalSocket = null;

export function useSocket() {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const activeRoomRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem("token") || "";
    const userId = user.role === "admin" ? "admin_user" : user.id;

    if (!globalSocket || globalSocket.disconnected) {
      globalSocket = io(SOCKET_URL, {
        auth: { token },
        query: { userId },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500,
        reconnectionDelayMax: 5000,
        transports: ["websocket", "polling"]
      });
    }

    const socket = globalSocket;
    socketRef.current = socket;
    setIsConnected(socket.connected);

    const onConnect = () => {
      setIsConnected(true);
      setIsReconnecting(false);
      console.log("⚡ Persistent Socket.io connected:", socket.id);
      
      // Auto-rejoin active chat room on reconnect
      if (activeRoomRef.current) {
        socket.emit("join_chat_room", { chatId: activeRoomRef.current });
      }
    };

    const onDisconnect = (reason) => {
      setIsConnected(false);
      setIsReconnecting(true);
      console.log("🔌 Socket.io disconnected:", reason);
    };

    const onReconnectAttempt = () => {
      setIsReconnecting(true);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.io.on("reconnect_attempt", onReconnectAttempt);
    socket.io.on("reconnect", onConnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.io.off("reconnect_attempt", onReconnectAttempt);
      socket.io.off("reconnect", onConnect);
    };
  }, [user]);

  const joinRoom = useCallback((chatId) => {
    if (!chatId) return;
    if (activeRoomRef.current && activeRoomRef.current !== chatId && socketRef.current) {
      socketRef.current.emit("leave_chat_room", { chatId: activeRoomRef.current });
    }
    activeRoomRef.current = chatId;
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("join_chat_room", { chatId });
    }
  }, []);

  const leaveRoom = useCallback((chatId) => {
    if (socketRef.current && chatId) {
      socketRef.current.emit("leave_chat_room", { chatId });
      if (activeRoomRef.current === chatId) activeRoomRef.current = null;
    }
  }, []);

  const emitMessage = useCallback((messageData, timeoutMs = 8000) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !socketRef.current.connected) {
        return reject(new Error("Socket not connected"));
      }

      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        reject(new Error("Socket message ACK timed out"));
      }, timeoutMs);

      socketRef.current.emit("send_chat_message", messageData, (response) => {
        if (timedOut) return;
        clearTimeout(timer);
        if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || "Failed to deliver chat message"));
        }
      });
    });
  }, []);

  const emitDeliveredAck = useCallback((messageId, clientMessageId, chatId) => {
    if (socketRef.current && (messageId || clientMessageId)) {
      socketRef.current.emit("message_delivered_ack", { messageId, clientMessageId, chatId });
    }
  }, []);

  const markRead = useCallback((chatId) => {
    if (socketRef.current && chatId) {
      socketRef.current.emit("mark_messages_read", { chatId });
    }
  }, []);

  const sendTyping = useCallback((chatId, isTyping) => {
    if (socketRef.current && chatId) {
      socketRef.current.emit("typing_indicator", { chatId, isTyping, senderName: user?.name });
    }
  }, [user]);

  const emitTypingStart = useCallback((chatId) => {
    if (socketRef.current && chatId) {
      socketRef.current.emit("typing_start", { chatId, senderName: user?.name });
    }
  }, [user]);

  const emitTypingStop = useCallback((chatId) => {
    if (socketRef.current && chatId) {
      socketRef.current.emit("typing_stop", { chatId, senderName: user?.name });
    }
  }, [user]);

  return {
    socket: socketRef.current,
    isConnected,
    isReconnecting,
    joinRoom,
    leaveRoom,
    emitMessage,
    emitDeliveredAck,
    markRead,
    sendTyping,
    emitTypingStart,
    emitTypingStop
  };
}
