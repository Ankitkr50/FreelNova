const { prisma } = require("../config/db");

// In-memory store for trial projects & deliverable escrow
const trialContractsStore = {};

/**
 * Creates a micro-trial project before committing to full contract.
 */
const createTrialProject = async (projectId, userId, payload) => {
  const { trialBudget, trialDurationDays = 2, trialDeliverable } = payload;

  if (!trialBudget || !trialDeliverable) {
    throw new Error("trialBudget and trialDeliverable are required");
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { title: true, recruiterId: true, selectedFreelancer: true },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const trialId = `trial-${Date.now()}`;
  const trialContract = {
    id: trialId,
    projectId,
    projectTitle: project.title,
    clientRecruiterId: project.recruiterId,
    freelancerId: project.selectedFreelancer || userId,
    trialBudget: Number(trialBudget),
    trialDurationDays: Number(trialDurationDays),
    trialDeliverable: String(trialDeliverable).trim(),
    status: "FUNDED_ESCROW", // FUNDED_ESCROW | SUBMITTED | CONVERTED_TO_FULL | CANCELLED
    createdAt: new Date().toISOString(),
  };

  if (!trialContractsStore[projectId]) {
    trialContractsStore[projectId] = [];
  }
  trialContractsStore[projectId].unshift(trialContract);

  return trialContract;
};

/**
 * Retrieves Deliverable-Aware Escrow verification checklist.
 */
const getDeliverableEscrowStatus = async (projectId) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { title: true, budgetMax: true, status: true },
  });

  const trialContracts = trialContractsStore[projectId] || [];

  return {
    projectId,
    hasActiveTrial: trialContracts.length > 0,
    trialContract: trialContracts[0] || null,
    deliverableEscrow: {
      milestoneTitle: "Milestone 1: Prototype Deliverable & Core Features",
      amount: 25000,
      acceptanceCriteria: [
        { item: "User Authentication & JWT Session", met: true },
        { item: "Razorpay / Escrow Payment Integration", met: true },
        { item: "Responsive UI & Mobile Support", met: true },
        { item: "API Documentation & Tests Pass", met: false },
      ],
      deliverableFiles: [
        { name: "Source_Code_Repository.git", url: "https://github.com/freelnova/build" },
        { name: "API_Documentation.pdf", url: "https://freelnova.com/docs/api.pdf" },
      ],
      clientApprovalStatus: "PENDING_REVIEW",
    },
  };
};

module.exports = {
  createTrialProject,
  getDeliverableEscrowStatus,
};
