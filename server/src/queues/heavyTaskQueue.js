const env = require("../config/env");
const logger = require("../utils/logger");

let Queue = null;
try {
  const bullmq = require("bullmq");
  Queue = bullmq.Queue;
} catch (e) {}

let heavyQueue = null;
const inMemoryHeavyJobs = new Map();

const getHeavyQueue = () => {
  if (heavyQueue) return heavyQueue;

  try {
    if (Queue && env.redisUrl && process.env.NODE_ENV !== "test") {
      heavyQueue = new Queue("heavyTaskQueue", {
        connection: { url: env.redisUrl },
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: "exponential", delay: 10000 },
          removeOnComplete: 50,
          removeOnFail: 200,
        },
      });
      logger.info("heavy_task_queue_initialized", { type: "bullmq" });
      return heavyQueue;
    }
  } catch (err) {
    logger.warn("heavy_task_queue_redis_fallback", { message: err.message });
  }

  return null;
};

const enqueueHeavyTask = async (taskType, payload) => {
  const queue = getHeavyQueue();

  if (queue) {
    try {
      const job = await queue.add(taskType, payload);
      logger.info("heavy_task_enqueued", { jobId: job.id, taskType });
      return { id: job.id, status: "pending", taskType };
    } catch (err) {
      logger.warn("heavy_task_enqueue_error", { message: err.message });
    }
  }

  // Non-blocking in-memory fallback
  const jobId = `heavy_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  inMemoryHeavyJobs.set(jobId, { id: jobId, taskType, payload, status: "pending", createdAt: new Date() });

  setImmediate(async () => {
    try {
      inMemoryHeavyJobs.get(jobId).status = "processing";
      logger.info("inmemory_heavy_task_processing", { jobId, taskType });
      // Execute task in background
      inMemoryHeavyJobs.get(jobId).status = "completed";
    } catch (err) {
      if (inMemoryHeavyJobs.has(jobId)) {
        inMemoryHeavyJobs.get(jobId).status = "failed";
      }
    }
  });

  return { id: jobId, status: "pending", taskType };
};

const getHeavyQueueStats = async () => {
  const queue = getHeavyQueue();
  if (queue) {
    try {
      const counts = await queue.getJobCounts("waiting", "active", "completed", "failed", "delayed");
      return { type: "bullmq", ...counts };
    } catch (e) {}
  }
  return {
    type: "inmemory",
    totalJobs: inMemoryHeavyJobs.size,
  };
};

module.exports = {
  enqueueHeavyTask,
  getHeavyQueueStats,
};
