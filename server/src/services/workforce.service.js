const { prisma } = require("../config/db");

// In-memory store for project workforce assignments & work outputs
const projectWorkforceStore = {};
const projectWorkOutputsStore = {};

/**
 * Retrieves the hybrid Human + AI Workforce workspace for a project.
 */
const getHybridWorkforce = async (projectId) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      recruiter: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      freelancer: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          skills: true,
        },
      },
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  // Human Team Members
  const humanMembers = [
    {
      id: project.recruiter.id,
      name: project.recruiter.name,
      role: "Client / Project Owner",
      type: "HUMAN",
      isResponsibleOwner: true,
      avatar: "👤",
    },
    ...(project.freelancer
      ? [
          {
            id: project.freelancer.id,
            name: project.freelancer.name,
            role: "Lead Freelancer Developer",
            type: "HUMAN",
            isResponsibleOwner: false,
            avatar: "👨‍💻",
          },
        ]
      : []),
  ];

  // AI Digital Agent Members assigned to this project
  const assignedAIAgents = projectWorkforceStore[projectId] || [
    {
      id: "agent-codex",
      name: "Codex-AI Developer",
      role: "Autonomous AI Coding Specialist",
      type: "AI_AGENT",
      capabilities: ["Express Auth Routes", "Prisma Schema Compiles", "API Optimization"],
      isResponsibleOwner: false,
      avatar: "🤖",
    },
    {
      id: "agent-pixel",
      name: "PixelCraft-AI Designer",
      role: "AI UI/UX System Designer",
      type: "AI_AGENT",
      capabilities: ["Figma Component Specs", "Tailwind Design System"],
      isResponsibleOwner: false,
      avatar: "🎨",
    },
    {
      id: "agent-qa",
      name: "Sentry-AI QA Agent",
      role: "Automated Code Auditor & QA",
      type: "AI_AGENT",
      capabilities: ["Static Code Security Audit", "Unit Test Compiles"],
      isResponsibleOwner: false,
      avatar: "🛡️",
    },
  ];

  const workOutputs = projectWorkOutputsStore[projectId] || [
    {
      id: "out-1",
      title: "Prisma Database Schema & Auth Middleware",
      producedBy: "HUMAN",
      authorName: project.freelancer?.name || "Human Lead",
      timestamp: project.createdAt,
    },
    {
      id: "out-2",
      title: "Automated JWT Auth Route Compilation",
      producedBy: "AI_AGENT",
      authorName: "Codex-AI Developer",
      timestamp: project.updatedAt,
    },
  ];

  return {
    projectId: project.id,
    projectTitle: project.title,
    humanTeamCount: humanMembers.length,
    aiAgentCount: assignedAIAgents.length,
    humanLeadOwner: project.recruiter.name,
    team: [...humanMembers, ...assignedAIAgents],
    workOutputs,
  };
};

/**
 * Assigns an AI Digital Agent to the project workforce.
 */
const assignAIAgentToProject = async (projectId, agentData) => {
  if (!projectWorkforceStore[projectId]) {
    projectWorkforceStore[projectId] = [];
  }

  const newAgent = {
    id: `agent-${Date.now()}`,
    name: agentData.name || "AI Specialist Agent",
    role: agentData.role || "Autonomous AI Assistant",
    type: "AI_AGENT",
    capabilities: agentData.capabilities || ["Task Execution", "Code Audit"],
    isResponsibleOwner: false,
    avatar: "🤖",
  };

  projectWorkforceStore[projectId].push(newAgent);
  return newAgent;
};

/**
 * Logs a work output item with clear Human vs AI attribution.
 */
const logWorkOutput = async (projectId, userId, outputData) => {
  if (!projectWorkOutputsStore[projectId]) {
    projectWorkOutputsStore[projectId] = [];
  }

  const newOutput = {
    id: `out-${Date.now()}`,
    title: String(outputData.title).trim(),
    producedBy: outputData.producedBy === "AI_AGENT" ? "AI_AGENT" : "HUMAN",
    authorName: String(outputData.authorName || "Team Contributor").trim(),
    timestamp: new Date().toISOString(),
  };

  projectWorkOutputsStore[projectId].unshift(newOutput);
  return newOutput;
};

module.exports = {
  getHybridWorkforce,
  assignAIAgentToProject,
  logWorkOutput,
};
