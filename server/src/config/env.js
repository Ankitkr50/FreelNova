const dotenv = require("dotenv");

dotenv.config({ quiet: true });

const requireEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  corsOrigins: process.env.CORS_ORIGINS || process.env.CLIENT_URL || "http://localhost:5173",
  corsMethods:
    process.env.CORS_METHODS || "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  databaseUrl: requireEnv("DATABASE_URL"),
  redisUrl: requireEnv("REDIS_URL"),
  jwtAccessSecret: requireEnv("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: requireEnv("JWT_REFRESH_SECRET"),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  emailFrom: process.env.EMAIL_FROM || "FreelNova <freelnova07@gmail.com>",
  smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
  smtpPort: Number(process.env.SMTP_PORT || 465),
  smtpUser: process.env.SMTP_USER || "freelnova07@gmail.com",
  smtpPass: process.env.SMTP_PASS || "llzicgisyslrrncd",
  smtpSecure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : true,
  devAutoVerifyEmail: process.env.DEV_AUTO_VERIFY_EMAIL !== "false",
  notificationsEmailEnabled: process.env.NOTIFICATIONS_EMAIL_ENABLED === "true",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",

  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
  adminEmails: (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map(email => email.trim().toLowerCase())
    .filter(Boolean),
};

module.exports = env;
