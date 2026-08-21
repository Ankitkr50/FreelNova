const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const routes = require("./routes");
const { notFoundHandler, errorHandler } = require("./middleware/error.middleware");
const {
  sanitizeRequestBody,
  enforceJsonBodySize,
} = require("./middleware/security.middleware");
const {
  requestIdMiddleware,
  requestLoggerMiddleware,
} = require("./middleware/request.middleware");
const ApiError = require("./utils/apiError");
const env = require("./config/env");

const app = express();
const allowedOrigins = env.corsOrigins
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedMethods = env.corsMethods
  .split(",")
  .map((method) => method.trim().toUpperCase())
  .filter(Boolean);

// ── Security headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// ── Gzip compression ──────────────────────────────────────────────────────────
// Compresses JSON responses by 70-80%. Critical at high concurrency —
// smaller payloads mean faster transfers and less bandwidth cost.
// Threshold 1 KB — don't bother compressing tiny responses.
app.use(compression({ threshold: 1024 }));

app.use(requestIdMiddleware);

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        origin.endsWith(".onrender.com") ||
        origin.endsWith(".trycloudflare.com")
      ) {
        return callback(null, true);
      }

      return callback(new ApiError(403, "CORS origin blocked"));
    },
    methods: allowedMethods,
    credentials: true,
    allowedHeaders: ["Authorization", "Content-Type", "x-idempotency-key"],
  })
);

// ── Body parsing ──────────────────────────────────────────────────────────────
// Razorpay signature verification requires raw body bytes.
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(enforceJsonBodySize);

// ── NoSQL injection protection ────────────────────────────────────────────────
// Strips MongoDB operators ($ prefix keys and dots) from req.body, req.params,
// and req.query IN PLACE. We cannot reassign req.query — Express defines it
// as a getter-only property — so we mutate the existing object recursively.
const stripMongoOperators = (obj) => {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
  Object.keys(obj).forEach((key) => {
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
    } else {
      stripMongoOperators(obj[key]);
    }
  });
};
app.use((req, res, next) => {
  stripMongoOperators(req.body);
  stripMongoOperators(req.params);
  stripMongoOperators(req.query); // mutated in-place — never reassigned
  next();
});

app.use(sanitizeRequestBody);
app.use(requestLoggerMiddleware);

// ── Prevent stale API response caching ───────────────────────────────────────
// Ensures browsers / CDNs never serve cached auth or payment responses.
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

