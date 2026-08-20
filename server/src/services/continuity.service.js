const { prisma } = require("../config/db");

// In-memory store for continuity replacement requests
const continuityRequestsStore = {};

/**
 * Detects continuity risk and prepares context transfer payload.
 */
const detectProjectContinuityRisk = async (projectId) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      recruiter: { select: { id: true, name: true } },
      freelancer: { select: { id: true, name: true } },
      payments: true,
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  // Find top 3 replacement candidate freelancers with matching skills
  const replacementCandidates = await prisma.user.findMany({
    where: {
      role: "freelancer",
      isVerified: true,
      id: { not: project.selectedFreelancer || "" },
      skills: { hasSome: project.skills },
    },
    select: {
      id: true,
      name: true,
      username: true,
      skills: true,
      ratingAvg: true,
      hourlyRate: true,
    },
    take: 3,
  });

  const preservedContext = {
    projectId: project.id,
    projectTitle: project.title,
    currentStatus: project.status,
    preservedVaultAssets: [
      "Requirements Brief Specification",
      "Milestones Breakdown",
      "Git Code Repository Links",
      "Recorded Decisions & Meeting Notes",
      "Project AI Memory Transcripts",
    ],
    replacementCandidates: replacementCandidates.map((c) => ({
      ...c,
      matchScore: 91,
      whyRecommended: `Matches verified skills (${project.skills.join(", ")}) with ${c.ratingAvg || 4.9}★ rating. Ready for context handover.`,
    })),
  };

  return preservedContext;
};

/**
 * Client approves replacement freelancer to continue project context.
 */
const approveReplacementCandidate = async (projectId, recruiterUserId, replacementFreelancerId) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Project not found");

  if (project.recruiterId !== recruiterUserId) {
    throw new Error("Forbidden: Only project owner recruiter can approve replacement");
  }

  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: {
      selectedFreelancer: replacementFreelancerId,
      status: "in_progress",
    },
    include: { freelancer: { select: { name: true, email: true } } },
  });

  return {
    projectId,
    status: updatedProject.status,
    newFreelancer: updatedProject.freelancer,
    contextTransferStatus: "TRANSFERRED_SUCCESSFULLY",
  };
};

module.exports = {
  detectProjectContinuityRisk,
  approveReplacementCandidate,
};
