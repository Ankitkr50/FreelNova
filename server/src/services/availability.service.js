const { prisma } = require("../config/db");

// In-memory capacity config store
const availabilityStore = {};

/**
 * Retrieves or updates Smart Capacity & Workload settings for a freelancer.
 */
const getOrUpdateAvailability = async (freelancerId, payload = null) => {
  const user = await prisma.user.findUnique({
    where: { id: freelancerId },
    select: { id: true, name: true },
  });

  if (!user) throw new Error("Freelancer not found");

  if (payload) {
    availabilityStore[freelancerId] = {
      freelancerId,
      currentWorkloadPercentage: Number(payload.currentWorkloadPercentage || 72),
      availableCapacityHoursPerWeek: Number(payload.availableCapacityHoursPerWeek || 15),
      availableFromDate: payload.availableFromDate || new Date().toISOString(),
      preferredContractType: payload.preferredContractType || "Long-term projects",
      timezone: "IST (+5:30)",
      averageResponseWindow: "< 6 Hours",
    };
  }

  return availabilityStore[freelancerId] || {
    freelancerId,
    currentWorkloadPercentage: 72,
    availableCapacityHoursPerWeek: 15,
    availableFromDate: new Date().toISOString(),
    preferredContractType: "Long-term projects",
    timezone: "IST (+5:30)",
    averageResponseWindow: "< 6 Hours",
  };
};

module.exports = {
  getOrUpdateAvailability,
};
