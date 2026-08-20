const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const env = require("./env");
const logger = require("../utils/logger");

// Setup the standard Node-Postgres connection pool
const pool = new Pool({
  connectionString: env.databaseUrl,
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

const connectDatabase = async () => {
  try {
    // Ping the database using the pool to check connectivity
    await pool.query("SELECT 1");
    logger.info("database_connected", { provider: "postgresql" });
  } catch (error) {
    logger.error("database_connection_failed", {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

module.exports = {
  prisma,
  connectDatabase,
  pool,
};
