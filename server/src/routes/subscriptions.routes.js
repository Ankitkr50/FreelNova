const express = require("express");
const { protect, authorize } = require("../middleware/auth.middleware");
const { createRateLimiter } = require("../middleware/rate-limit.middleware");
const ApiError = require("../utils/apiError");
const {
  createSubscriptionOrder,
  verifySubscriptionPayment,
  getMySubscription,
} = require("../controllers/subscription.controller");

const router = express.Router();

// ── Validators ────────────────────────────────────────────────────────────────

const VALID_PLANS = ["pro_monthly", "pro_yearly"];

const validateCreateOrderPayload = (req, res, next) => {
  const plan = String(req.body.plan || "").trim();
  const currency = String(req.body.currency || "INR").trim().toUpperCase();
  const idempotencyKey = String(req.headers["x-idempotency-key"] || req.body.idempotencyKey || "").trim();

  if (!VALID_PLANS.includes(plan)) {
    return next(new ApiError(400, `plan must be one of: ${VALID_PLANS.join(", ")}`));
  }

  const validCurrencies = ["INR", "USD"];
  if (!validCurrencies.includes(currency)) {
    return next(new ApiError(400, "Currency must be INR or USD"));
  }

  req.validatedBody = { plan, currency, idempotencyKey: idempotencyKey || null };
  return next();
};

const validateVerifyPayload = (req, res, next) => {
  const errors = [];
  const razorpayOrderId   = String(req.body.razorpayOrderId   || "").trim();
  const razorpayPaymentId = String(req.body.razorpayPaymentId || "").trim();
  const razorpaySignature = String(req.body.razorpaySignature || "").trim();
  const subscriptionId    = String(req.body.subscriptionId    || "").trim();

  if (!razorpayOrderId)   errors.push("razorpayOrderId is required");
  if (!razorpayPaymentId) errors.push("razorpayPaymentId is required");
  if (!razorpaySignature) errors.push("razorpaySignature is required");
  if (!subscriptionId)    errors.push("subscriptionId is required");

  if (errors.length) {
    return next(new ApiError(400, errors.join(". ")));
  }

  req.validatedBody = { razorpayOrderId, razorpayPaymentId, razorpaySignature, subscriptionId };
  return next();
};

// ── Rate limiters ─────────────────────────────────────────────────────────────

const createOrderLimit = createRateLimiter({
  key: "sub_create",
  windowMs: 60 * 1000,
  maxRequests: 10,
  getIdentifier: (req) => String(req.user?._id || req.ip || "unknown"),
});

const verifyLimit = createRateLimiter({
  key: "sub_verify",
  windowMs: 60 * 1000,
  maxRequests: 15,
  getIdentifier: (req) => String(req.user?._id || req.ip || "unknown"),
});

// ── Routes ────────────────────────────────────────────────────────────────────

// Create a Razorpay order for a Pro plan
router.post(
  "/create-order",
  protect,
  authorize("freelancer", "recruiter"),
  createOrderLimit,
  validateCreateOrderPayload,
  createSubscriptionOrder
);

// Verify payment signature after checkout → activate subscription
router.post(
  "/verify",
  protect,
  authorize("freelancer", "recruiter"),
  verifyLimit,
  validateVerifyPayload,
  verifySubscriptionPayment
);

// Get current user's active subscription status
router.get("/me", protect, getMySubscription);

module.exports = router;
