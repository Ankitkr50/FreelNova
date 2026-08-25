const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const env = require("./env");
const logger = require("../utils/logger");

// Setup the standard Node-Postgres connection pool with cloud resilience
const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.databaseUrl?.includes("sslmode=") || env.nodeEnv === "production"
    ? { rejectUnauthorized: false }
    : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Prevent unhandled ECONNRESET drops from killing nodemon/server process
pool.on("error", (err) => {
  logger.warn("pg_pool_idle_connection_error", { error: err.message });
});

const adapter = new PrismaPg(pool);

// Initialize Prisma Client with Driver Adapter for direct TCP connections in Prisma 7
const prisma = new PrismaClient({
  adapter,
  log: [
    { level: "query", emit: "event" },
    { level: "info", emit: "stdout" },
    { level: "warn", emit: "stdout" },
    { level: "error", emit: "stdout" },
  ],
});

// Log Prisma queries in development for debugging
if (env.nodeEnv === "development") {
  prisma.$on("query", (e) => {
    logger.info("prisma_query", {
      query: e.query,
      params: e.params,
      durationMs: e.duration,
    });
  });
}

const connectDatabase = async (retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query("SELECT 1");
      logger.info("database_connected", { provider: "postgresql" });
      return;
    } catch (error) {
      logger.warn(`database_connection_attempt_${attempt}_failed`, { message: error.message });
      if (attempt === retries) {
        logger.error("database_connection_failed", {
          message: error.message,
          stack: error.stack,
        });
        throw error;
      }
      await new Promise((res) => setTimeout(res, 1500));
    }
  }
};

module.exports = {
  prisma,
  connectDatabase,
  pool,
};
