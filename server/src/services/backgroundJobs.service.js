// In-memory background jobs queue
const jobsQueueStore = [];

/**
 * Enqueues an async background job (e.g. Email notification, AI processing, Financial Reconciliation).
 */
const enqueueBackgroundJob = async (type, payload = {}) => {
  const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const job = {
    id: jobId,
    type, // ASYNC_EMAIL | AI_SUMMARY_GENERATION | RECONCILIATION_RUN | METRICS_AGGREGATION
    payload,
    status: "PROCESSING",
    attempts: 1,
    createdAt: new Date().toISOString(),
  };

  jobsQueueStore.unshift(job);

  // Simulate immediate background completion
  setTimeout(() => {
    job.status = "COMPLETED";
    job.completedAt = new Date().toISOString();
  }, 100);

  return job;
};

const getBackgroundJobsStatus = async () => {
  return {
    totalEnqueued: jobsQueueStore.length,
    activeProcessing: jobsQueueStore.filter((j) => j.status === "PROCESSING").length,
    completed: jobsQueueStore.filter((j) => j.status === "COMPLETED").length,
    failed: jobsQueueStore.filter((j) => j.status === "FAILED").length,
  };
};

module.exports = {
  enqueueBackgroundJob,
  getBackgroundJobsStatus,
};
