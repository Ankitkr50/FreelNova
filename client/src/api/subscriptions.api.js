import http from "./http";

export const subscriptionsApi = {
  createOrder: (payload) => http.post("/subscriptions/create-order", payload),
  verifyPayment: (payload) => http.post("/subscriptions/verify", payload),
  getMySubscription: () => http.get("/subscriptions/me"),
};
