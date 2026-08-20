const { prisma } = require("../config/db");

// In-memory store for contract change requests & milestone versions
const changeRequestsStore = {};

/**
 * Creates a contract change request with impact analysis.
 */
const createContractChangeRequest = async (projectId, requestedByUserId, payload) => {
  const { proposedScopeChange, budgetImpactAmount = 0, timelineImpactDays = 0 } = payload;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { title: true, recruiterId: true, selectedFreelancer: true },
  });

  if (!project) throw new Error("Project not found");

  const requestId = `cr-${Date.now()}`;
  const changeRequest = {
    id: requestId,
    projectId,
    projectTitle: project.title,
    requestedByUserId,
    proposedScopeChange: String(proposedScopeChange).trim(),
    budgetImpactAmount: Number(budgetImpactAmount),
    timelineImpactDays: Number(timelineImpactDays),
    status: "PENDING_APPROVAL", // PENDING_APPROVAL | APPROVED | REJECTED
    versionNumber: 2,
    createdAt: new Date().toISOString(),
  };

  if (!changeRequestsStore[projectId]) changeRequestsStore[projectId] = [];
  changeRequestsStore[projectId].unshift(changeRequest);

  return changeRequest;
};

module.exports = {
  createContractChangeRequest,
};
