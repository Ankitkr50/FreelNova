const env = require("../config/env");
const logger = require("../utils/logger");
const { sendEmail } = require("../services/email.service");

let Queue = null;
try {
  const bullmq = require("bullmq");
  Queue = bullmq.Queue;
} catch (e) {}

let emailQueue = null;
const inMemoryEmailJobs = [];

const getEmailQueue = () => {
  if (emailQueue) return emailQueue;

  try {
    if (Queue && env.redisUrl && process.env.NODE_ENV !== "test") {
      emailQueue = new Queue("emailQueue", {
        connection: { url: env.redisUrl },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 5000,
          },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      });
      logger.info("email_queue_initialized", { type: "bullmq" });
      return emailQueue;
    }
  } catch (err) {
    logger.warn("email_queue_redis_fallback", { message: err.message });
  }

  return null;
};

const enqueueEmail = async ({ to, subject, html, text, category = "general" }) => {
  const targetEmail = String(to || "").trim().toLowerCase();
  const isTestEmail =
    process.env.NODE_ENV === "test" ||
    /\.test$|\.example$|@freelnova\.test|@skillbridge\.test|@test\.com|@example\.com/i.test(targetEmail);

  if (isTestEmail) {
    logger.info("sandbox_email_suppressed", { to });
    return { id: `mock_${Date.now()}`, status: "suppressed" };
  }

  const queue = getEmailQueue();

  if (queue) {
    try {
      const job = await queue.add("sendEmail", { to, subject, html, text, category });
      logger.info("email_job_enqueued", { jobId: job.id, to, category });
      return { id: job.id, status: "enqueued" };
    } catch (err) {
      logger.warn("email_queue_enqueue_error", { message: err.message });
    }
  }

  // Fallback: Non-blocking in-memory async dispatch
  const jobId = `mem_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  inMemoryEmailJobs.push({ jobId, to, subject, html, text, category, timestamp: new Date() });

  setImmediate(async () => {
    try {
      await sendEmail({ to, subject, html, text });
      logger.info("inmemory_email_dispatched", { jobId, to });
    } catch (err) {
      logger.error("inmemory_email_failed", { jobId, to, message: err.message });
    }
  });

  return { id: jobId, status: "enqueued_inmemory" };
};

const getEmailQueueStats = async () => {
  const queue = getEmailQueue();
  if (queue) {
    try {
      const counts = await queue.getJobCounts("waiting", "active", "completed", "failed", "delayed");
      return { type: "bullmq", ...counts };
    } catch (e) {}
  }
  return {
    type: "inmemory",
    waiting: inMemoryEmailJobs.length,
    active: 0,
    completed: 0,
    failed: 0,
  };
};

module.exports = {
  enqueueEmail,
  getEmailQueueStats,
};
