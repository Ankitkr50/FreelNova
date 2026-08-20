const express = require("express");
const paymentController = require("../controllers/payment.controller");
const { protect, authorize } = require("../middleware/auth.middleware");
const { createRateLimiter } = require("../middleware/rate-limit.middleware");
const {
  validatePaymentCreatePayload,
  validatePaymentReleasePayload,
  validatePaymentRefundPayload,
  validatePaymentVerifyPayload,
} = require("../middleware/validate.middleware");

const router = express.Router();

const webhookRateLimit = createRateLimiter({
  key: "payment_webhook",
  windowMs: 60 * 1000,
  maxRequests: 180,
  getIdentifier: (req) =>
    String(req.headers["x-razorpay-event-id"] || req.headers["x-forwarded-for"] || req.ip || "unknown"),
});

const paymentCreateRateLimit = createRateLimiter({
  key: "payment_create",
  windowMs: 60 * 1000,
  maxRequests: 20,
  getIdentifier: (req) =>
    String(
      req.user?._id ||
        req.headers["x-idempotency-key"] ||
        req.headers["x-forwarded-for"] ||
        req.ip ||
        "unknown"
    ),
});

const paymentReleaseRateLimit = createRateLimiter({
  key: "payment_release",
  windowMs: 60 * 1000,
  maxRequests: 30,
  getIdentifier: (req) => String(req.user?._id || req.ip || "unknown"),
});

const paymentVerifyRateLimit = createRateLimiter({
  key: "payment_verify",
  windowMs: 60 * 1000,
  maxRequests: 30,
  getIdentifier: (req) => String(req.user?._id || req.ip || "unknown"),
});

const paymentRefundRateLimit = createRateLimiter({
  key: "payment_refund",
  windowMs: 60 * 1000,
  maxRequests: 10,
  getIdentifier: (req) => String(req.user?._id || req.ip || "unknown"),
});

router.post("/webhook", webhookRateLimit, paymentController.handleRazorpayWebhook);
router.post(
  "/create",
  protect,
  authorize("recruiter"),
  paymentCreateRateLimit,
  validatePaymentCreatePayload,
  paymentController.createPaymentOrder
);
router.post(
  "/release",
  protect,
  authorize("recruiter", "admin"),
  paymentReleaseRateLimit,
  validatePaymentReleasePayload,
  paymentController.releaseEscrowPayment
);

// Verify Razorpay checkout signature from frontend after payment modal closes
router.post(
  "/verify",
  protect,
  authorize("recruiter"),
  paymentVerifyRateLimit,
  validatePaymentVerifyPayload,
  paymentController.verifyPayment
);

// Refund a payment (full or partial) — recruiter for own payments, admin for any
router.post(
  "/refund",
  protect,
  authorize("recruiter", "admin"),
  paymentRefundRateLimit,
  validatePaymentRefundPayload,
  paymentController.refundPayment
);

router.get("/stats", protect, paymentController.getPaymentStats);

// Sourcing fee Razorpay order creation and verification
router.post(
  "/sourcing-order",
  protect,
  authorize("recruiter"),
  paymentController.createSourcingOrder
);

router.post(
  "/sourcing-verify",
  protect,
  authorize("recruiter"),
  paymentController.verifySourcingPayment
);

// Account fine order creation & verification
router.post(
  "/fine-order",
  protect,
  paymentController.createFineOrder
);

router.post(
  "/fine-verify",
  protect,
  paymentController.verifyFinePayment
);

module.exports = router;
