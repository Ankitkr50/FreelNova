import http from "./http";

export const paymentsApi = {
  createOrder: (payload) => http.post("/payments/create", payload),
  releaseEscrow: (payload) => http.post("/payments/release", payload),
  verifyPayment: (payload) => http.post("/payments/verify", payload),
  refundPayment: (payload) => http.post("/payments/refund", payload),
  getStats: () => http.get("/payments/stats"),
  createSourcingOrder: () => http.post("/payments/sourcing-order"),
  verifySourcingPayment: (payload) => http.post("/payments/sourcing-verify", payload),
  createFineOrder: () => http.post("/payments/fine-order"),
  verifyFinePayment: (payload) => http.post("/payments/fine-verify", payload),
};
