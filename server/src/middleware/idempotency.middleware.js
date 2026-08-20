// In-memory store for idempotency key responses
const idempotencyStore = {};

/**
 * Idempotency Middleware: Ensures repeated requests with the same x-idempotency-key return cached results.
 */
const validateIdempotencyKey = (req, res, next) => {
  const key = req.headers["x-idempotency-key"];

  if (!key) {
    return next(); // Key optional for standard read operations
  }

  if (idempotencyStore[key]) {
    const cached = idempotencyStore[key];
    return res.status(cached.status).json(cached.body);
  }

  // Intercept json response to cache
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    idempotencyStore[key] = {
      status: res.statusCode,
      body,
      timestamp: new Date().toISOString(),
    };
    return originalJson(body);
  };

  next();
};

module.exports = {
  validateIdempotencyKey,
};
