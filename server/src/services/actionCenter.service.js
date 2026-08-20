const { prisma } = require("../config/db");

/**
 * Aggregates urgent operational action items for Client & Freelancer dashboards.
 */
const getActionCenterItems = async (userId, role) => {
  const actions = [];

  if (role === "recruiter") {
    actions.push(
      {
        id: "act-1",
        severity: "HIGH", // HIGH (Red) | MEDIUM (Yellow) | LOW (Green)
        color: "rose",
        title: "Approve ₹25,000 Milestone Release",
        description: "Freelancer delivered Milestone 1 prototype 24 hours ago.",
        actionUrl: "/my-projects",
      },
      {
        id: "act-2",
        severity: "MEDIUM",
        color: "amber",
        title: "Review 3 Freelancer Proposals",
        description: "New applicants submitted bids for React Dashboard.",
        actionUrl: "/recruiter/applicants",
      }
    );
  } else {
    actions.push(
      {
        id: "act-1",
        severity: "MEDIUM",
        color: "amber",
        title: "Client Requested Revision on API Specs",
        description: "Please check feedback in Project Vault.",
        actionUrl: "/project-vault",
      },
      {
        id: "act-2",
        severity: "LOW",
        color: "emerald",
        title: "Retainer Renewal Confirmed",
        description: "Enterprise client auto-renewed monthly contract.",
        actionUrl: "/income-os",
      }
    );
  }

  return {
    userId,
    role,
    totalPendingActions: actions.length,
    actions,
  };
};

module.exports = {
  getActionCenterItems,
};
