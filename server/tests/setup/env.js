require("dotenv").config();

process.env.NODE_ENV = "test";
process.env.PORT = process.env.PORT || "5001";
process.env.CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test_access_secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test_refresh_secret";
process.env.JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_key";
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "rzp_test_secret";
process.env.RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "rzp_test_webhook_secret";
process.env.NOTIFICATIONS_EMAIL_ENABLED = "false";

// Default test connections
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/freelnova_test";
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = "redis://127.0.0.1:6379";
}

// Mock otplib for Jest CJS environment
jest.mock("otplib", () => ({
  generateSecret: () => "TESTMFASECRET123456",
  generateURI: () => "otpauth://totp/test@freelnova.test?secret=TESTMFASECRET123456&issuer=FreelNova",
  verifySync: () => ({ valid: true }),
  generateSync: () => "123456",
}), { virtual: true });