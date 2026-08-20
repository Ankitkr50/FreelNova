const express = require("express");
const { prisma } = require("../config/db");
const redis = require("../utils/redis");
const authRoutes = require("./auth.routes");
const rbacRoutes = require("./rbac.routes");
const userRoutes = require("./users.routes");
const projectRoutes = require("./projects.routes");
const reviewRoutes = require("./reviews.routes");
const paymentRoutes = require("./payments.routes");
const subscriptionRoutes = require("./subscriptions.routes");
const notificationRoutes = require("./notifications.routes");
const adminRoutes = require("./admin.routes");
const { createRateLimiter } = require("../middleware/rate-limit.middleware");
const logger = require("../utils/logger");
const multer = require("multer");
const path = require("path");
const cloudinary = require("cloudinary").v2;
const env = require("../config/env");

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret,
});

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/i;
    const extname = allowedTypes.test(path.extname(file.originalname));
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only images or PDF files are allowed"));
  },
});

const uploadToCloudinary = (fileBuffer, originalName) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "freelnova_documents",
        resource_type: "auto",
        public_id: path.parse(originalName).name + "-" + Date.now(),
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result.secure_url);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

const router = express.Router();

const authRateLimit = createRateLimiter({
  key: "route_auth",
  windowMs: 15 * 60 * 1000,
  maxRequests: 120,
  getIdentifier: (req) => String(req.headers["x-forwarded-for"] || req.ip || "unknown"),
});

const paymentRouteRateLimit = createRateLimiter({
  key: "route_payments",
  windowMs: 5 * 60 * 1000,
  maxRequests: 150,
  getIdentifier: (req) =>
    String(req.user?._id || req.headers["x-forwarded-for"] || req.ip || "unknown"),
});

const adminRateLimit = createRateLimiter({
  key: "route_admin",
  windowMs: 5 * 60 * 1000,
  maxRequests: 100,
  getIdentifier: (req) =>
    String(req.user?._id || req.headers["x-forwarded-for"] || req.ip || "unknown"),
});

router.get("/health", (req, res) => {
  logger.reqInfo(req, "health_check", {
    uptimeSec: Number(process.uptime().toFixed(2)),
  });

  res.status(200).json({
    success: true,
    message: "FreelNova API is running",
    data: {
      uptimeSec: Number(process.uptime().toFixed(2)),
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV || "development",
    },
  });
});

router.get("/ready", async (req, res) => {
  try {
    const { getEmailQueueStats } = require("../queues/emailQueue");
    const { getHeavyQueueStats } = require("../queues/heavyTaskQueue");

    // Check PostgreSQL connection
    await prisma.$queryRaw`SELECT 1`;
    // Check Redis connection
    await redis.ping();

    const emailStats = await getEmailQueueStats();
    const heavyStats = await getHeavyQueueStats();

    logger.reqInfo(req, "readiness_ok", { db: "connected", redis: "connected" });
    return res.status(200).json({
      success: true,
      message: "Service ready",
      data: {
        db: "connected",
        redis: "connected",
        queues: {
          email: emailStats,
          heavy: heavyStats,
        },
      },
    });
  } catch (error) {
    logger.reqWarn(req, "readiness_failed", { error: error.message });
    return res.status(503).json({
      success: false,
      message: "Service not ready",
      data: { error: error.message },
    });
  }
});

const chatRoutes = require("./chat.routes");
const enterpriseRoutes = require("./enterprise.routes");
const growthRoutes = require("./growth.routes");

router.use("/auth", authRateLimit, authRoutes);
router.use("/rbac", rbacRoutes);
router.use("/users", userRoutes);
router.use("/projects", projectRoutes);
router.use("/reviews", reviewRoutes);
router.use("/payments", paymentRouteRateLimit, paymentRoutes);
router.use("/subscriptions", paymentRouteRateLimit, subscriptionRoutes);
router.use("/notifications", notificationRoutes);
router.use("/chat", chatRoutes);
router.use("/admin", adminRateLimit, adminRoutes);
router.use("/enterprise", adminRateLimit, enterpriseRoutes);
router.use("/growth", growthRoutes);

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const referenceName = req.body.fileName || req.file.originalname;
    const secureUrl = await uploadToCloudinary(req.file.buffer, referenceName);
    res.status(200).json({
      success: true,
      url: secureUrl,
    });
  } catch (error) {
    logger.error("cloudinary_upload_error", { message: error.message });
    res.status(500).json({
      success: false,
      message: "Failed to upload file to Cloudinary",
      error: error.message,
    });
  }
});

module.exports = router;
