const crypto = require("crypto");
const logger = require("../utils/logger");

const requestIdMiddleware = (req, res, next) => {
  const incoming = String(req.headers["x-request-id"] || "").trim();
  req.requestId = incoming || crypto.randomUUID();
  res.setHeader("x-request-id", req.requestId);
  next();
};

const requestLoggerMiddleware = (req, res, next) => {
  if (process.env.NODE_ENV !== "production") {
    next();
    return;
  }

  const startedAt = Date.now();

  logger.reqInfo(req, "http_request_started", {
    query: req.query,
    bodyKeys: req.body && typeof req.body === "object" ? Object.keys(req.body) : [],
  });

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    const event = res.statusCode >= 500 ? "http_request_failed" : "http_request_completed";
    logger.reqInfo(req, event, {
      statusCode: res.statusCode,
      durationMs,
      contentLength: res.getHeader("content-length") || null,
    });
  });

  next();
};

module.exports = {
  requestIdMiddleware,
  requestLoggerMiddleware,
};
