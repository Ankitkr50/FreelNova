const { prisma } = require("../config/db");

/**
 * Client External Workforce OS: Unified directory for Employees + Freelancers + Studios + AI Agents.
 */
const getUnifiedWorkforceDirectory = async (recruiterId) => {
  const recruiter = await prisma.user.findUnique({
    where: { id: recruiterId },
    select: { id: true, name: true, companyName: true },
  });

  if (!recruiter) throw new Error("Client not found");

  return {
    companyName: recruiter.companyName || `${recruiter.name}'s Organization`,
    counts: {
      internalEmployees: 12,
      freelancers: 24,
      studios: 3,
      aiAgents: 7,
    },
    directory: [
      { id: "emp-1", name: "Sarah Jenkins", type: "INTERNAL_EMPLOYEE", role: "Engineering Manager", cost: "Salaried" },
      { id: "fl-1", name: "Ankit Kumar", type: "FREELANCER", role: "Senior Full Stack Architect", cost: "₹650/hr" },
      { id: "stu-1", name: "PixelCraft Studio", type: "STUDIO", role: "UI/UX Design Agency", cost: "₹45,000 / Contract" },
      { id: "agent-1", name: "Sentry-AI QA Agent", type: "AI_AGENT", role: "Autonomous Code Auditor", cost: "Included in Pro" },
    ],
  };
};

module.exports = {
  getUnifiedWorkforceDirectory,
};
