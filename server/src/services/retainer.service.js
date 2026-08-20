const { prisma } = require("../config/db");

// In-memory retainer store
const retainerContractsStore = {};

/**
 * Creates a recurring long-term retainer contract.
 */
const createRetainerContract = async (userId, payload) => {
  const { freelancerId, projectId, monthlyAmount, weeklyHours, billingCycle = "monthly", terminationNoticeDays = 14 } = payload;

  if (!freelancerId || !monthlyAmount) {
    throw new Error("freelancerId and monthlyAmount are required");
  }

  const [client, freelancer] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    prisma.user.findUnique({ where: { id: freelancerId }, select: { name: true, email: true } }),
  ]);

  if (!client || !freelancer) {
    throw new Error("Client or Freelancer not found");
  }

  const contractId = `ret-${Date.now()}`;
  const now = new Date();
  const nextBillingDate = new Date();
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

  const retainer = {
    id: contractId,
    client: { id: userId, name: client.name, email: client.email },
    freelancer: { id: freelancerId, name: freelancer.name, email: freelancer.email },
    projectId: projectId || null,
    monthlyAmount: Number(monthlyAmount),
    weeklyHours: Number(weeklyHours || 20),
    billingCycle,
    status: "ACTIVE", // ACTIVE | TERMINATED | PAUSED
    terminationNoticeDays: Number(terminationNoticeDays),
    startDate: now.toISOString(),
    nextBillingDate: nextBillingDate.toISOString(),
    milestones: [
      { month: "Month 1", amount: Number(monthlyAmount), status: "PAID_ESCROW" },
      { month: "Month 2", amount: Number(monthlyAmount), status: "SCHEDULED" },
    ],
  };

  if (!retainerContractsStore[userId]) {
    retainerContractsStore[userId] = [];
  }
  retainerContractsStore[userId].unshift(retainer);

  return retainer;
};

/**
 * Lists active retainer contracts for a user.
 */
const listRetainerContracts = async (userId) => {
  const contracts = retainerContractsStore[userId] || [];
  return contracts;
};

/**
 * Terminates a retainer contract.
 */
const terminateRetainerContract = async (userId, contractId, reason) => {
  const userContracts = retainerContractsStore[userId] || [];
  const contract = userContracts.find((c) => c.id === contractId);

  if (!contract) {
    throw new Error("Retainer contract not found");
  }

  contract.status = "TERMINATED";
  contract.terminatedAt = new Date().toISOString();
  contract.terminationReason = String(reason || "Terminated per contract notice period").trim();

  return contract;
};

module.exports = {
  createRetainerContract,
  listRetainerContracts,
  terminateRetainerContract,
};
