const redis = require("./redis");

class LRUCache {
  /**
   * @param {object} options
   * @param {number} options.maxSize   Ignored (Redis manages memory limits)
   * @param {number} options.ttlMs     Time-to-live in milliseconds (default 60s)
   */
  constructor({ maxSize = 500, ttlMs = 60_000 } = {}) {
    this.ttlMs = ttlMs;
  }

  /**
   * Retrieve a value. Returns undefined if missing or expired.
   * @param {string} key
   */
  async get(key) {
    try {
      const data = await redis.get(`cache:${key}`);
      if (!data) return undefined;
      return JSON.parse(data);
    } catch (err) {
      return undefined;
    }
  }

  /**
   * Store a value.
   * @param {string} key
   * @param {any}    value
   * @param {number} [ttlMs]  Override instance TTL for this entry.
   */
  async set(key, value, ttlMs) {
    try {
      const ttlSec = Math.ceil((ttlMs ?? this.ttlMs) / 1000);
      await redis.set(`cache:${key}`, JSON.stringify(value), "EX", ttlSec);
    } catch (err) {
      // Ignore caching errors to ensure business flows continue if Redis is down
    }
  }

  /**
   * Delete a specific key (e.g., on logout or password change).
   * @param {string} key
   */
  async del(key) {
    try {
      await redis.del(`cache:${key}`);
    } catch (err) {
      // Ignore
    }
  }

  /**
   * Clear everything matching this cache prefix.
   */
  async clear() {
    try {
      const keys = await redis.keys("cache:*");
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (err) {
      // Ignore
    }
  }

  purgeExpired() {
    // No-op: Redis handles automatic key expiration via TTL natively
  }
}

module.exports = { LRUCache };
