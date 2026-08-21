const cluster = require("cluster");
const os = require("os");
const app = require("./app");
const env = require("./config/env");
const { connectDatabase, prisma } = require("./config/db");
// Triggering nodemon reload to load updated Prisma client with username field
// Triggering reload for hourlyRate, workExperience, and portfolioItems
// Triggering reload for ID Card links
const logger = require("./utils/logger");
const { setupChatSupport } = require("./websocket/chatSupport");
const { setupSocketIO } = require("./socket/socketServer");

// ── Cluster mode ──────────────────────────────────────────────────────────────
// Node.js is single-threaded; cluster forks one worker per CPU core so all
// cores handle requests in parallel. A 4-core machine handles ~4× more load.
//
// In development, skip clustering for easier debugging (single process).
// On Railway/Render, NODE_ENV=production, so clustering kicks in automatically.
const maxWorkers = parseInt(process.env.WEB_CONCURRENCY || "1", 10);
const NUM_WORKERS = env.nodeEnv === "production" ? Math.min(os.cpus().length, maxWorkers) : 1;

if (cluster.isPrimary && NUM_WORKERS > 1) {
  logger.info("cluster_primary_start", {
    pid: process.pid,
    workers: NUM_WORKERS,
  });

  // Fork one worker per CPU core.
  for (let i = 0; i < NUM_WORKERS; i++) {
    cluster.fork();
  }

  // Restart a worker if it crashes — keeps the server alive under any failure.
  cluster.on("exit", (worker, code, signal) => {
    logger.warn("cluster_worker_died", {
      pid: worker.process.pid,
      code,
      signal,
    });
    cluster.fork(); // Replace the dead worker immediately.
  });

  cluster.on("online", (worker) => {
    logger.info("cluster_worker_online", { pid: worker.process.pid });
  });
} else {
  // ── Worker process (or single dev process) ────────────────────────────────
  const start = async () => {
    try {
      if (env.nodeEnv === "production") {
        logger.info("startup_diagnostics", {
          nodeEnv: env.nodeEnv,
          port: env.port,
          clientUrl: env.clientUrl,
          corsOrigins: env.corsOrigins,
          corsMethods: env.corsMethods,
          pid: process.pid,
          nodeVersion: process.version,
        });
      }

      if (env.nodeEnv === "production") {
        try {
          const { execSync } = require("child_process");
          logger.info("syncing_prisma_schema_to_db");
          execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });
        } catch (syncErr) {
          logger.warn("schema_sync_warn", { message: syncErr.message });
        }
      }

      await connectDatabase();

      // Ensure primary Super Admin account exists in production database
      try {
        const adminEmail = "fn.freelnova@gmail.com";
        const existingAdmin = await prisma.user.findUnique({
          where: { email: adminEmail },
        });
        if (!existingAdmin) {
          const bcrypt = require("bcryptjs");
          const hashedPassword = await bcrypt.hash("Admin@123456", 10);
          await prisma.user.create({
            data: {
              name: "Super Admin",
              email: adminEmail,
              userCode: "AID00000001",
              username: "fn.freelnova@gmail.com",
              password: hashedPassword,
              role: "admin",
              adminRole: "SUPER_ADMIN",
              isEmailVerified: true,
              profileCompleted: true,
              moderationStatus: "active",
            },
          });
          logger.info("super_admin_auto_seeded", { email: adminEmail });
        }
      } catch (seedErr) {
        logger.warn("super_admin_seed_warning", { message: seedErr.message });
      }

      const server = app.listen(env.port, () => {
        if (env.nodeEnv === "production") {
          logger.info("server_listening", {
            port: env.port,
            nodeEnv: env.nodeEnv,
          });
          return;
        }
        console.log(`Server running on port ${env.port} (pid ${process.pid})`);
      });

      // Initialize support chat websocket server & real-time Socket.io server
      setupChatSupport(server);
      setupSocketIO(server);

      // ── Connection timeout tuning ───────────────────────────────────────────
      // keepAliveTimeout must be > the load balancer's idle timeout (usually 60s).
      // headersTimeout must be > keepAliveTimeout to avoid race conditions.
      server.keepAliveTimeout = 65_000; // 65 seconds
      server.headersTimeout = 66_000;   // 1 second more than keepAlive

      // ── Graceful shutdown ───────────────────────────────────────────────────
      // On SIGTERM (Docker/Railway stop) or SIGINT (Ctrl+C):
      //  1. Stop accepting new connections.
      //  2. Wait for in-flight requests to finish (up to 10 seconds).
      //  3. Close DB connection.
      //  4. Exit cleanly.
      const shutdown = (signal) => {
        logger.info("graceful_shutdown_start", { signal, pid: process.pid });

        server.close(async () => {
          logger.info("graceful_shutdown_complete", { pid: process.pid });
          try {
            const { pool } = require("./config/db");
            await prisma.$disconnect();
            await pool.end();
            logger.info("database_connection_closed", {});
          } catch (err) {
            logger.error("database_close_error", { message: err.message });
          }
          process.exit(0);
        });

        // Force exit if drain takes too long (e.g., hung websocket).
        setTimeout(() => {
          logger.error("graceful_shutdown_timeout", { pid: process.pid });
          process.exit(1);
        }, 10_000).unref();
      };

      process.on("SIGTERM", () => shutdown("SIGTERM"));
      process.on("SIGINT", () => shutdown("SIGINT"));

      // Catch unhandled promise rejections — log and exit so the cluster
      // primary can restart a fresh worker rather than serving in a bad state.
      process.on("unhandledRejection", (reason) => {
        logger.error("unhandled_rejection", {
          reason: String(reason),
          pid: process.pid,
        });
        shutdown("unhandledRejection");
      });
    } catch (error) {
      logger.error("startup_failed", {
        message: error.message,
        stack: error.stack,
      });
      process.exit(1);
    }
  };

  start();
}

