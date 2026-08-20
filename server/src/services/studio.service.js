const { prisma } = require("../config/db");

// In-memory store for studio agency teams
const studiosStore = {};

/**
 * Creates or retrieves a FreelNova Studio (Agency-in-a-Box) team.
 */
const getOrCreateStudio = async (userId, payload = {}) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const studioId = `studio-${userId.slice(0, 8)}`;

  const existingStudio = studiosStore[studioId] || {
    id: studioId,
    name: payload.name || `${user.name}'s Studio Agency`,
    leadId: user.id,
    leadName: user.name,
    teamMembers: [
      { id: user.id, name: user.name, role: "Lead Full Stack Architect", revenueShare: 40 },
      { id: "mem-2", name: "Rahul Sharma", role: "Backend Developer", revenueShare: 25 },
      { id: "mem-3", name: "Priya Patel", role: "UI/UX Product Designer", revenueShare: 20 },
      { id: "mem-4", name: "Aman Verma", role: "QA & Security Specialist", revenueShare: 15 },
    ],
    internalMilestones: [
      { title: "Figma Component Tokens & System", assignedTo: "Priya Patel", status: "COMPLETED" },
      { title: "API Gateway & Postgres Schema", assignedTo: "Rahul Sharma", status: "IN_PROGRESS" },
      { title: "End-to-End Test Suite", assignedTo: "Aman Verma", status: "PENDING" },
    ],
    totalStudioRevenue: 350000,
    activeContractsCount: 3,
  };

  studiosStore[studioId] = existingStudio;
  return existingStudio;
};

module.exports = {
  getOrCreateStudio,
};
