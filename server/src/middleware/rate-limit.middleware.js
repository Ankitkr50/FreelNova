const redis = require("../utils/redis");
const ApiError = require("../utils/apiError");

/**
 * Distributed sliding-window rate limiter backed by Redis.
 *
 * Implements cluster-safe rate limiting using Redis Sorted Sets (ZSET):
 *  1. ZREMRANGEBYSCORE removes timestamps older than the sliding window.
 *  2. ZCARD gets the count of requests within the window.
 *  3. ZRANGE retrieves the oldest request in the window to calculate retry headers.
 *  4. ZADD adds the current request timestamp with a unique member string.
 *  5. EXPIRE sets TTL on the key so it cleans up when idle.
 *
 * Fails open (allows request) if Redis is unreachable to avoid service disruption.
 */
const createRateLimiter = ({ key, windowMs, maxRequests, getIdentifier }) => {
  return async (req, res, next) => {
    const identifier =
      (getIdentifier && getIdentifier(req)) ||
      req.headers["x-forwarded-for"] ||
      req.ip ||
      "unknown";

    const redisKey = `rl:${key}:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Pipeline operations to optimize network round-trips
      const multi = redis.multi();
      multi.zremrangebyscore(redisKey, 0, windowStart);
      multi.zcard(redisKey);
      multi.zrange(redisKey, 0, 0, "WITHSCORES");

      const results = await multi.exec();
      
      // Multi results format: [[err, val], [err, val], ...]
      const card = results[1][1];
      const oldestRange = results[2][1];

      if (card >= maxRequests) {
        let oldestTimestamp = windowStart;
        if (oldestRange && oldestRange.length > 1) {
          // ioredis returns WITHSCORES as [member, score, member, score...]
          oldestTimestamp = Number(oldestRange[1]);
        }
        const retryAfterSec = Math.max(
          Math.ceil((oldestTimestamp + windowMs - now) / 1000),
          1
        );
        res.set("Retry-After", String(retryAfterSec));
        return next(
          new ApiError(429, "Too many requests. Please retry later.", {
            limit: maxRequests,
            windowMs,
            retryAfterSec,
          })
        );
      }

      // Add current request and renew TTL
      const addMulti = redis.multi();
      // Add a unique member string using timestamp + random float to avoid collisions
      addMulti.zadd(redisKey, now, `${now}-${Math.random()}`);
      addMulti.expire(redisKey, Math.ceil(windowMs / 1000) + 1);
      await addMulti.exec();

      return next();
    } catch (err) {
      // Degrade gracefully: fail open if Redis has connection issues
      return next();
    }
  };
};

module.exports = {
  createRateLimiter,
};
