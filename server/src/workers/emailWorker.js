const env = require("../config/env");
const logger = require("../utils/logger");
const { sendEmail } = require("../services/email.service");

let Worker = null;
try {
  const bullmq = require("bullmq");
  Worker = bullmq.Worker;
} catch (e) {}

let emailWorker = null;

const startEmailWorker = () => {
  if (emailWorker) return emailWorker;

  try {
    if (Worker && env.redisUrl && process.env.NODE_ENV !== "test") {
      emailWorker = new Worker(
        "emailQueue",
        async (job) => {
          logger.info("email_worker_processing_job", { jobId: job.id, to: job.data.to, category: job.data.category });
          await sendEmail(job.data);
          return { status: "sent", sentAt: new Date().toISOString() };
        },
        {
          connection: { url: env.redisUrl },
          concurrency: 5,
        }
      );

      emailWorker.on("completed", (job) => {
        logger.info("email_worker_job_completed", { jobId: job.id });
      });

      emailWorker.on("failed", (job, err) => {
        logger.error("email_worker_job_failed", { jobId: job?.id, message: err.message });
      });

      logger.info("email_worker_started", { type: "bullmq", concurrency: 5 });
      return emailWorker;
    }
  } catch (err) {
    logger.warn("email_worker_init_failed", { message: err.message });
  }

  return null;
};

const stopEmailWorker = async () => {
  if (emailWorker) {
    try {
      await emailWorker.close();
      logger.info("email_worker_stopped", {});
    } catch (err) {
      logger.error("email_worker_stop_error", { message: err.message });
    }
  }
};

module.exports = {
  startEmailWorker,
  stopEmailWorker,
};
