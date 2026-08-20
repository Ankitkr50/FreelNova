const SENSITIVE_KEYS = [
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "cookie",
  "secret",
  "apiKey",
  "key",
  "signature",
  "smtpPass",
  "jwtAccessSecret",
  "jwtRefreshSecret",
  "razorpayKeySecret",
  "razorpayWebhookSecret",
];

const isSensitiveKey = (key) => {
  const normalized = String(key || "").toLowerCase();
  return SENSITIVE_KEYS.some((sensitive) => normalized.includes(sensitive.toLowerCase()));
};

const redact = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }

  if (!value || typeof value !== "object" || value instanceof Date || Buffer.isBuffer(value)) {
    return value;
  }

  const output = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (isSensitiveKey(key)) {
      output[key] = "[REDACTED]";
      continue;
    }
    output[key] = redact(nestedValue);
  }
  return output;
};

const baseLog = (level, event, meta = {}) => {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...redact(meta),
  };

  const serialized = JSON.stringify(payload);
  if (level === "error") {
    console.error(serialized);
    return;
  }
  if (level === "warn") {
    console.warn(serialized);
    return;
  }
  console.log(serialized);
};

const withRequestMeta = (req, meta = {}) => ({
  requestId: req?.requestId || null,
  method: req?.method || null,
  path: req?.originalUrl || req?.url || null,
  userId: req?.user?._id ? String(req.user._id) : null,
  role: req?.user?.role || null,
  ...meta,
});

module.exports = {
  redact,
  info: (event, meta) => baseLog("info", event, meta),
  warn: (event, meta) => baseLog("warn", event, meta),
  error: (event, meta) => baseLog("error", event, meta),
  reqInfo: (req, event, meta) => baseLog("info", event, withRequestMeta(req, meta)),
  reqWarn: (req, event, meta) => baseLog("warn", event, withRequestMeta(req, meta)),
  reqError: (req, event, meta) => baseLog("error", event, withRequestMeta(req, meta)),
};

