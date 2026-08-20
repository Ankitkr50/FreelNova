const { prisma } = require("../config/db");

/**
 * Retrieves IP & Deliverable Ownership Vault details for a project.
 */
const getProjectIPVault = async (projectId) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      title: true,
      status: true,
      recruiter: { select: { name: true } },
      freelancer: { select: { name: true } },
      payments: { select: { status: "captured", escrowStatus: true } },
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const isCompleted = project.status === "completed" || project.status === "paid";

  return {
    projectId: project.id,
    projectTitle: project.title,
    ipTransferStatus: isCompleted ? "COMPLETED" : "PENDING_PAYMENT_RELEASE",
    ownershipItems: [
      {
        asset: "Source Code Repository",
        owner: isCompleted ? project.recruiter?.name || "Client" : "Held in Vault",
        license: "Full Exclusive Commercial Rights",
        transferStatus: isCompleted ? "TRANSFERRED" : "IN_ESCROW_VAULT",
      },
      {
        asset: "UI/UX Figma Design Tokens",
        owner: isCompleted ? project.recruiter?.name || "Client" : "Held in Vault",
        license: "Full Copyright",
        transferStatus: isCompleted ? "TRANSFERRED" : "IN_ESCROW_VAULT",
      },
      {
        asset: "Reusable Utility Libraries",
        owner: project.freelancer?.name || "Freelancer",
        license: "MIT License / Reusable Asset",
        transferStatus: "RETAINED_BY_CREATOR",
      },
    ],
  };
};

module.exports = {
  getProjectIPVault,
};
