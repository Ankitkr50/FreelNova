const crypto = require("crypto");
const Razorpay = require("razorpay");
const paymentConfig = require("../config/payment.config");
const ApiError = require("../utils/apiError");

let razorpayClient = null;

const assertRazorpayConfig = () => {
  if (!paymentConfig.razorpay.keyId || !paymentConfig.razorpay.keySecret) {
    throw new ApiError(
      500,
      "Razorpay is not configured. Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET"
    );
  }
};

const getRazorpayClient = () => {
  if (!razorpayClient) {
    assertRazorpayConfig();
    razorpayClient = new Razorpay({
      key_id: paymentConfig.razorpay.keyId,
      key_secret: paymentConfig.razorpay.keySecret,
    });
  }

  return razorpayClient;
};

const verifyRazorpayWebhookSignature = (rawBody, signature) => {
  if (!paymentConfig.razorpay.webhookSecret) {
    throw new ApiError(500, "Razorpay webhook secret is not configured");
  }

  const expectedSignature = crypto
    .createHmac("sha256", paymentConfig.razorpay.webhookSecret)
    .update(rawBody)
    .digest("hex");

  return expectedSignature === signature;
};

/**
 * Verify the Razorpay payment signature sent by the frontend checkout SDK.
 * Razorpay signs: razorpay_order_id + "|
" + razorpay_payment_id
 */
const verifyRazorpayPaymentSignature = (orderId, paymentId, signature) => {
  if (!paymentConfig.razorpay.keySecret) {
    throw new ApiError(500, "Razorpay key secret is not configured");
  }

  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", paymentConfig.razorpay.keySecret)
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
};

const createRazorpayOrder = async ({ amountPaise, currency, receipt, notes = {} }) => {
  const client = getRazorpayClient();
  try {
    return await client.orders.create({
      amount: amountPaise,
      currency,
      receipt,
      notes,
    });
  } catch (err) {
    // Razorpay SDK errors have { statusCode, error: { description } } — no .message
    const description = err?.error?.description || err?.message || "Razorpay order creation failed";
    const status = err?.statusCode || 502;
    throw new ApiError(status, description);
  }
};

/**
 * Issue a refund for a Razorpay payment.
 * @param {string} gatewayPaymentId  - Razorpay payment_id (e.g. pay_XYZ)
 * @param {number} amountPaise       - Amount to refund in paise (full or partial)
 * @param {string} [notes]           - Optional reason note for Razorpay dashboard
 */
const refundRazorpayPayment = async ({ gatewayPaymentId, amountPaise, notes = {} }) => {
  const client = getRazorpayClient();
  return client.payments.refund(gatewayPaymentId, {
    amount: amountPaise,
    notes,
  });
};

module.exports = {
  getRazorpayClient,
  verifyRazorpayWebhookSignature,
  verifyRazorpayPaymentSignature,
  createRazorpayOrder,
  refundRazorpayPayment,
};
