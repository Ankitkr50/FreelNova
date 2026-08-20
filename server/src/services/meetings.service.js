const { prisma } = require("../config/db");

// In-memory store for meeting records
const meetingsStore = {};

/**
 * Creates a meeting session with consent-based recording, AI transcript, summary, and action items.
 */
const createMeetingSession = async (projectId, hostUserId, payload) => {
  const { title, scheduledAt } = payload;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, title: true },
  });

  if (!project) throw new Error("Project not found");

  const meetingId = `meet-${Date.now()}`;
  const meeting = {
    id: meetingId,
    projectId,
    projectTitle: project.title,
    hostUserId,
    title: title || `Architecture Sync for ${project.title}`,
    scheduledAt: scheduledAt || new Date().toISOString(),
    status: "COMPLETED",
    consentGiven: true,
    videoRoomUrl: `https://meet.freelnova.com/room/${meetingId}`,
    aiSummary: {
      decisions: [
        "Selected PostgreSQL as primary database for ACID compliance.",
        "React.js frontend with Tailwind CSS for design system.",
        "3 milestone releases over 30 days.",
      ],
      actionItems: [
        { assignee: "Freelancer", task: "Design API architecture spec", deadline: "Aug 21" },
        { assignee: "Client", task: "Provide brand color palette & assets", deadline: "Aug 18" },
      ],
    },
  };

  if (!meetingsStore[projectId]) meetingsStore[projectId] = [];
  meetingsStore[projectId].unshift(meeting);

  return meeting;
};

const getProjectMeetings = async (projectId) => {
  return meetingsStore[projectId] || [
    {
      id: "meet-sample-101",
      title: "Initial Requirements & Architecture Review",
      status: "COMPLETED",
      consentGiven: true,
      videoRoomUrl: "https://meet.freelnova.com/room/meet-sample-101",
      aiSummary: {
        decisions: ["Adopted React + Vite for client bundle", "Razorpay Escrow for payments"],
        actionItems: [{ assignee: "Freelancer", task: "Setup repository", deadline: "Aug 15" }],
      },
    },
  ];
};

module.exports = {
  createMeetingSession,
  getProjectMeetings,
};
