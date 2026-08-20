const ApiError = require("../utils/apiError");

const MAX_OBJECT_DEPTH = 20;

const sanitizeString = (value) => value.replace(/\u0000/g, "").trim();

const sanitizeObject = (input, depth = 0) => {
  if (depth > MAX_OBJECT_DEPTH) {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeObject(item, depth + 1));
  }

  if (!input || typeof input !== "object" || input instanceof Date || Buffer.isBuffer(input)) {
    return input;
  }

  const sanitized = {};
  for (const [rawKey, rawValue] of Object.entries(input)) {
    const key = String(rawKey || "");
    if (!key || key.startsWith("$") || key.includes(".")) {
      continue;
    }

    if (typeof rawValue === "string") {
      sanitized[key] = sanitizeString(rawValue);
      continue;
    }

    sanitized[key] = sanitizeObject(rawValue, depth + 1);
  }

  return sanitized;
};

// Mutate an object in-place with sanitized values.
// We CANNOT reassign req.query or req.params — Express defines them as
// getter-only properties. Instead we delete dangerous keys and update values
// directly on the existing object.
const sanitizeInPlace = (obj) => {
  if (!obj || typeof obj !== "object") return;
  const sanitized = sanitizeObject(obj);
  // Remove keys not present in sanitized output ($ keys, dot keys).
  for (const key of Object.keys(obj)) {
    if (!(key in sanitized)) delete obj[key];
  }
  // Apply sanitized values back onto the original object reference.
  for (const [key, value] of Object.entries(sanitized)) {
    obj[key] = value;
  }
};

const sanitizeRequestBody = (req, res, next) => {
  if (req.originalUrl.startsWith("/api/payments/webhook")) {
    return next();
  }

  // req.body CAN be reassigned (Express does not restrict it).
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }

  // req.query and req.params are getter-only — mutate in-place only.
  if (req.query && typeof req.query === "object") {
    sanitizeInPlace(req.query);
  }

  if (req.params && typeof req.params === "object") {
    sanitizeInPlace(req.params);
  }

  return next();
};

const enforceJsonBodySize = (req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("application/json")) {
    const contentLength = Number(req.headers["content-length"] || 0);
    if (contentLength > 1024 * 1024) {
      return next(new ApiError(413, "Payload too large"));
    }
  }
  return next();
};

module.exports = {
  sanitizeRequestBody,
  enforceJsonBodySize,
};

