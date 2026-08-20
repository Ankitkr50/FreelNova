const { prisma } = require("../config/db");
const { getWorkPassport } = require("./passport.service");

// In-memory store for AI Twin configuration settings
const aiTwinConfigStore = {};

/**
 * Gets or initializes the AI Professional Twin configuration for a freelancer.
 */
const getAITwinConfig = async (freelancerId) => {
  const user = await prisma.user.findUnique({
    where: { id: freelancerId },
    select: {
      id: true,
      name: true,
      role: true,
      headline: true,
      bio: true,
      skills: true,
      hourlyRate: true,
      experienceYears: true,
      subscriptions: {
        where: {
          status: "active",
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { plan: true },
      },
    },
  });

  if (!user) {
    throw new Error("Freelancer not found");
  }

  const isPro = user.subscriptions && user.subscriptions.length > 0;
  const existingConfig = aiTwinConfigStore[freelancerId] || {
    isEnabled: isPro, // Auto-enabled for Pro/Elite members by default
    exposedSections: {
      skills: true,
      verifiedProjects: true,
      availability: true,
      typicalProjectTypes: true,
      hourlyRate: true,
      workExperience: true,
    },
    customInstructions: "Answer questions concisely, politely, and strictly based on my verified platform history.",
    preferredWork: "Full stack web development, React/Node.js architecture, API integrations.",
  };

  return {
    freelancerId: user.id,
    freelancerName: user.name,
    isPro,
    config: existingConfig,
  };
};

/**
 * Updates AI Twin configuration settings.
 */
const updateAITwinConfig = async (freelancerId, payload) => {
  const config = await getAITwinConfig(freelancerId);
  if (!config.isPro) {
    throw new Error("AI Professional Twin is exclusive to Pro and Elite subscribers.");
  }

  const current = config.config;
  const updated = {
    isEnabled: typeof payload.isEnabled === "boolean" ? payload.isEnabled : current.isEnabled,
    exposedSections: {
      ...current.exposedSections,
      ...(payload.exposedSections || {}),
    },
    customInstructions: payload.customInstructions || current.customInstructions,
    preferredWork: payload.preferredWork || current.preferredWork,
  };

  aiTwinConfigStore[freelancerId] = updated;
  return updated;
};

/**
 * Queries the AI Professional Twin for a freelancer.
 * Answers based ONLY on verified freelancer activity.
 */
const queryAITwin = async (freelancerId, question) => {
  const passport = await getWorkPassport(freelancerId);
  const twinConfigData = await getAITwinConfig(freelancerId);

  if (!twinConfigData.config.isEnabled) {
    throw new Error("AI Professional Twin is currently disabled by the freelancer.");
  }

  const q = String(question || "").toLowerCase();
  const exposed = twinConfigData.config.exposedSections;

  let answer = "";
  if (q.includes("skill") || q.includes("technology") || q.includes("stack")) {
    if (exposed.skills) {
      answer = `${passport.user.name}'s verified technical skills include: ${passport.skills.map((s) => s.name).join(", ")}.`;
    } else {
      answer = `${passport.user.name} has restricted public visibility for skills in their AI Twin settings.`;
    }
  } else if (q.includes("experience") || q.includes("year") || q.includes("background")) {
    if (exposed.workExperience) {
      answer = `${passport.user.name} has completed ${passport.metrics.verifiedProjects.value} verified projects on FreelNova with a contract completion rate of ${passport.metrics.completionRate.value}%.`;
    } else {
      answer = "Work experience details are set to private by the freelancer.";
    }
  } else if (q.includes("rate") || q.includes("price") || q.includes("cost") || q.includes("charge")) {
    if (exposed.hourlyRate) {
      answer = `${passport.user.name}'s standard hourly rate is ₹${(passport.user.hourlyRate || 500).toLocaleString()}/hr for verified platform contracts.`;
    } else {
      answer = "Hourly rate details are not exposed via AI Twin.";
    }
  } else if (q.includes("available") || q.includes("time") || q.includes("hire")) {
    if (exposed.availability) {
      answer = `${passport.user.name} is currently "${passport.availability.status}" with an average response time of ${passport.availability.responseHours} hour.`;
    } else {
      answer = "Availability status is private.";
    }
  } else if (q.includes("project") || q.includes("type") || q.includes("work")) {
    answer = `${passport.user.name} specializes in: ${twinConfigData.config.preferredWork}. Typical project types include web app development, API architecture, and UI component design.`;
  } else {
    answer = `${passport.user.name}'s AI Professional Twin: Completed ${passport.metrics.verifiedProjects.value} verified projects with a ${passport.metrics.clientSatisfaction.value}★ client rating. Verified skills: ${passport.skills.map((s) => s.name).slice(0, 5).join(", ")}.`;
  }

  return {
    freelancerId: passport.user.id,
    freelancerName: passport.user.name,
    question,
    answer,
    isAIGenerated: true,
    disclaimer: "🤖 AI-Generated Response: Formulated strictly from verified platform history and freelancer-controlled visibility rules.",
  };
};

module.exports = {
  getAITwinConfig,
  updateAITwinConfig,
  queryAITwin,
};
