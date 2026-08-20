const { prisma } = require("../config/db");

// In-memory store for company workspace data
const companyWorkspacesStore = {};
const approvalRequestsStore = {};

/**
 * Retrieves or initializes Company Workspace data for serious clients.
 */
const getCompanyWorkspace = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      companyName: true,
      companyId: true,
      role: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const workspaceId = user.companyId || `comp-${user.id.slice(0, 8)}`;
  const companyName = user.companyName || `${user.name}'s Enterprise Workspace`;

  let existingWorkspace = companyWorkspacesStore[workspaceId];
  if (!existingWorkspace) {
    existingWorkspace = {
      id: workspaceId,
      name: companyName,
      ownerId: user.id,
      employees: [
        { id: user.id, name: user.name, email: user.email, role: "Company Admin / Finance Approver" },
      ],
      teams: [
        { name: "Engineering & Tech Team", memberCount: 1, activeProjects: 1 },
      ],
      budgets: {
        totalAllocated: 500000,
        spentToDate: 175000,
        escrowCommitted: 65000,
        remaining: 260000,
        currency: "INR",
      },
    };
    companyWorkspacesStore[workspaceId] = existingWorkspace;
  }

  // Always keep workspace name in sync with real user company details
  existingWorkspace.name = companyName;
  existingWorkspace.employees[0] = { id: user.id, name: user.name, email: user.email, role: "Company Admin / Finance Approver" };

  const approvalWorkflowRequests = approvalRequestsStore[workspaceId] || [
    {
      id: "appr-1",
      requesterName: `${user.name} (Project Lead)`,
      freelancerTitle: "Full-Stack Web Specialist",
      budgetRequested: 45000,
      timelineDays: 14,
      status: "APPROVED_FINANCE", // PENDING_MANAGER -> PENDING_FINANCE -> APPROVED_FINANCE
      workflowSteps: [
        { step: "Employee Hiring Request", status: "COMPLETED", timestamp: new Date(Date.now() - 86400000).toISOString() },
        { step: "Manager Technical Approval", status: "COMPLETED", timestamp: new Date(Date.now() - 43200000).toISOString() },
        { step: "Finance & Escrow Authorization", status: "COMPLETED", timestamp: new Date().toISOString() },
      ],
    },
  ];

  return {
    workspace: existingWorkspace,
    approvalRequests: approvalWorkflowRequests,
  };
};

/**
 * Creates a hiring approval workflow request: Employee -> Manager -> Finance -> Escrow.
 */
const createApprovalRequest = async (userId, payload) => {
  const workspaceData = await getCompanyWorkspace(userId);
  const workspaceId = workspaceData.workspace.id;

  const { freelancerTitle, budgetRequested, timelineDays, justification } = payload;
  if (!freelancerTitle || !budgetRequested) {
    throw new Error("freelancerTitle and budgetRequested are required");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, role: true },
  });

  const newRequest = {
    id: `appr-${Date.now()}`,
    requesterName: `${user?.name || "Employee"} (${user?.role || "Team Member"})`,
    freelancerTitle: String(freelancerTitle).trim(),
    budgetRequested: Number(budgetRequested),
    timelineDays: Number(timelineDays || 14),
    justification: String(justification || "Strategic hiring for Q3 deliverable").trim(),
    status: "PENDING_MANAGER",
    workflowSteps: [
      { step: "Employee Hiring Request", status: "COMPLETED", timestamp: new Date().toISOString() },
      { step: "Manager Technical Approval", status: "PENDING", timestamp: null },
      { step: "Finance & Escrow Authorization", status: "PENDING", timestamp: null },
    ],
  };

  if (!approvalRequestsStore[workspaceId]) {
    approvalRequestsStore[workspaceId] = [];
  }
  approvalRequestsStore[workspaceId].unshift(newRequest);

  return newRequest;
};

/**
 * Approves a workflow step (Manager or Finance).
 */
const approveWorkflowStep = async (userId, requestId, targetStep) => {
  const workspaceData = await getCompanyWorkspace(userId);
  const workspaceId = workspaceData.workspace.id;
  const requests = approvalRequestsStore[workspaceId] || [];
  const req = requests.find((r) => r.id === requestId);

  if (!req) {
    throw new Error("Approval request not found");
  }

  if (targetStep === "manager") {
    req.status = "PENDING_FINANCE";
    req.workflowSteps[1].status = "COMPLETED";
    req.workflowSteps[1].timestamp = new Date().toISOString();
  } else if (targetStep === "finance") {
    req.status = "APPROVED_FINANCE";
    req.workflowSteps[2].status = "COMPLETED";
    req.workflowSteps[2].timestamp = new Date().toISOString();
  }

  return req;
};

module.exports = {
  getCompanyWorkspace,
  createApprovalRequest,
  approveWorkflowStep,
};
