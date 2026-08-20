const env = require("./env");

const paymentConfig = {
  razorpay: {
    keyId: env.razorpayKeyId,
    keySecret: env.razorpayKeySecret,
    webhookSecret: env.razorpayWebhookSecret,
  },
};

module.exports = paymentConfig;
