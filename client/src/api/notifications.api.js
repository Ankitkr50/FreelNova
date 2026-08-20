import http from "./http";

export const notificationsApi = {
  list: (params = {}) => http.get("/notifications", { params }),
  markAsRead: (id) => http.patch(`/notifications/${id}/read`),
  markAllAsRead: () => http.patch("/notifications/read-all"),
  broadcast: (payload) => http.post("/notifications/broadcast", payload),
  searchRecipients: (params = {}) => http.get("/notifications/recipients", { params }),
};


