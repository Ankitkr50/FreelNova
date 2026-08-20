const Redis = require("ioredis");
const env = require("../config/env");
const logger = require("./logger");

// Create Redis Client
const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  enableOfflineQueue: false,
  retryStrategy(times) {
    if (process.env.NODE_ENV === "test" || times > 2) {
      return null;
    }
    const delay = Math.min(times * 100, 2000);
    return delay;
  },
});

const memoryCounter = new Map();

// Resilient proxy wrapper so Redis operations fail open / fail soft if Redis is down or offline
const safeRedis = new Proxy(redis, {
  get(target, prop, receiver) {
    const orig = Reflect.get(target, prop, receiver);

    if (typeof orig === "function") {
      return function (...args) {
        // If target is not in 'ready' status, return safe fallbacks immediately
        if (target.status !== "ready") {
          if (prop === "get" || prop === "set" || prop === "del" || prop === "expire") return Promise.resolve(null);
          if (prop === "incr") {
            const key = args[0] || "default";
            const val = (memoryCounter.get(key) || 0) + 1;
            memoryCounter.set(key, val);
            return Promise.resolve(val);
          }
          if (prop === "ping") return Promise.resolve("PONG");
          if (prop === "keys") return Promise.resolve([]);
          if (prop === "multi") {
            return {
              zremrangebyscore() { return this; },
              zcard() { return this; },
              zrange() { return this; },
              zadd() { return this; },
              expire() { return this; },
              exec() { return Promise.resolve([[null, 0], [null, 0], [null, []]]); }
            };
          }
        }

        try {
          const res = orig.apply(target, args);
          if (res && typeof res.catch === "function") {
            return res.catch((err) => {
              logger.warn(`redis_${String(prop)}_error`, { message: err.message });
              if (prop === "get" || prop === "set" || prop === "del" || prop === "expire") return null;
              if (prop === "incr") return 0;
              if (prop === "ping") return "PONG";
              if (prop === "keys") return [];
              return null;
            });
          }
          return res;
        } catch (err) {
          logger.warn(`redis_${String(prop)}_sync_error`, { message: err.message });
          if (prop === "get" || prop === "set" || prop === "del" || prop === "expire") return Promise.resolve(null);
          if (prop === "incr") return Promise.resolve(0);
          if (prop === "ping") return Promise.resolve("PONG");
          if (prop === "keys") return Promise.resolve([]);
          return Promise.resolve(null);
        }
      };
    }
    return orig;
  }
});

module.exports = safeRedis;
