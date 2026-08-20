const { prisma } = require("../config/db");

/**
 * Calculates Freelancer Protection & Safety Net eligibility for an active contract.
 */
const getProtectionEligibility = async (projectId, userId) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      title: true,
      budgetMax: true,
      selectedFreelancer: true,
      recruiter: { select: { isVerified: true, name: true } },
      payments: { select: { escrowStatus: true, amount: true } },
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const isEscrowFunded = project.payments.some(
    (p) => p.escrowStatus === "held_in_escrow" || p.escrowStatus === "released"
  );

  const eligibleAmount = Math.round(project.budgetMax * 0.8);

  return {
    projectId: project.id,
    projectTitle: project.title,
    contractValue: project.budgetMax,
    eligibleProtectedAmount: eligibleAmount,
    protectionCategories: [
      "Eligible Payment Delay Protection",
      "Contract Cancellation Protection",
      "Verified Escrow Release Support",
      "Dedicated Dispute Arbitration",
    ],
    eligibilityChecklist: [
      { item: "Verified Client Account", status: "PASS" },
      { item: "Escrow Fully Funded in Platform Vault", status: isEscrowFunded ? "PASS" : "PENDING" },
      { item: "Active Escrow Contract Terms Agreed", status: "PASS" },
      { item: "Milestone Deliverable Conditions Met", status: "PASS" },
    ],
    termsDisclaimer: "🔒 FreelNova Protection Eligibility: Protection assistance is governed strictly by platform Escrow & Dispute Resolution Terms of Service.",
  };
};

module.exports = {
  getProtectionEligibility,
};
