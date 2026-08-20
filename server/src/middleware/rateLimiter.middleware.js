// In-memory rate limiting counters
const requestCountsStore = {};

/**
 * Tiered Rate Limiting Middleware.
 * maxRequests per windowMs.
 */
const createRateLimiter = (maxRequests = 100, windowMs = 60000, label = "GENERAL") => {
  return (req, res, next) => {
    const key = `${label}-${req.ip || "127.0.0.1"}`;
    const now = Date.now();

    if (!requestCountsStore[key]) {
      requestCountsStore[key] = { count: 1, resetAt: now + windowMs };
    } else {
      if (now > requestCountsStore[key].resetAt) {
        requestCountsStore[key] = { count: 1, resetAt: now + windowMs };
      } else {
        requestCountsStore[key].count += 1;
      }
    }

    if (requestCountsStore[key].count > maxRequests) {
      return res.status(429).json({
        success: false,
        message: `Too many requests for ${label} API. Please try again after 60 seconds.`,
      });
    }

    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - requestCountsStore[key].count));
    next();
  };
};

module.exports = {
  createRateLimiter,
  authRateLimiter: createRateLimiter(15, 60000, "AUTH"),
  aiRateLimiter: createRateLimiter(30, 60000, "AI"),
  paymentRateLimiter: createRateLimiter(20, 60000, "PAYMENT"),
  generalRateLimiter: createRateLimiter(120, 60000, "GENERAL"),
};
