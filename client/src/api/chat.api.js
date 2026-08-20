import http from "./http.js";

export const chatApi = {
  initiateConversation: async (recipientId, projectId = null, title = null) => {
    const res = await http.post("/chat/conversations/initiate", { recipientId, projectId, title });
    return res.data;
  },

  listConversations: async () => {
    const res = await http.get("/chat/conversations");
    return res.data;
  },

  getMessages: async (conversationId, cursor = null) => {
    const url = cursor 
      ? `/chat/conversations/${conversationId}/messages?cursor=${cursor}`
      : `/chat/conversations/${conversationId}/messages`;
    const res = await http.get(url);
    return res.data;
  },

  sendMessage: async (conversationId, payload) => {
    const res = await http.post(`/chat/conversations/${conversationId}/messages`, payload);
    return res.data;
  },

  editMessage: async (messageId, content) => {
    const res = await http.put(`/chat/messages/${messageId}`, { content });
    return res.data;
  },

  deleteMessage: async (messageId) => {
    const res = await http.delete(`/chat/messages/${messageId}`);
    return res.data;
  },

  toggleReaction: async (messageId, emoji) => {
    const res = await http.post(`/chat/messages/${messageId}/reaction`, { emoji });
    return res.data;
  },

  requestRevision: async (conversationId, payload) => {
    const res = await http.post(`/chat/conversations/${conversationId}/revisions`, payload);
    return res.data;
  },

  searchMessages: async (conversationId, query) => {
    const res = await http.get(`/chat/conversations/${conversationId}/search?q=${encodeURIComponent(query)}`);
    return res.data;
  },

  exportConversation: async (conversationId) => {
    const res = await http.get(`/chat/conversations/${conversationId}/export`);
    return res.data;
  },

  uploadAttachment: async (formData, onProgress) => {
    const res = await http.post("/chat/attachments/upload", formData, {
      timeout: 60000,
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    });
    return res.data;
  },

  getAttachmentDownloadUrl: (attachmentId) => {
    return `${import.meta.env.VITE_API_BASE_URL || ''}/chat/attachments/${attachmentId}/download`;
  },

  downloadAttachment: async (attachmentId, fileName) => {
    const res = await http.get(`/chat/attachments/${attachmentId}/download`, {
      responseType: "blob"
    });
    const blob = new Blob([res.data], { type: res.headers["content-type"] });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName || "attachment";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
  }
};
