const { prisma } = require("../config/db");
const { getWorkPassport } = require("./passport.service");

/**
 * Generates AI Career Autopilot project recommendations for a freelancer.
 * @param {string} freelancerId - UUID of the freelancer
 */
const getCareerRecommendations = async (freelancerId) => {
  const passportData = await getWorkPassport(freelancerId);
  const freelancer = await prisma.user.findUnique({
    where: { id: freelancerId },
    select: {
      id: true,
      name: true,
      skills: true,
      hourlyRate: true,
      experienceYears: true,
      category: true,
    },
  });

  if (!freelancer) {
    throw new Error("Freelancer not found");
  }

  const freelancerSkills = (freelancer.skills || []).map((s) => s.toLowerCase());

  // Fetch open projects
  const openProjects = await prisma.project.findMany({
    where: {
      status: { in: ["posted", "applied"] },
      recruiterId: { not: freelancerId },
      moderationStatus: "approved",
    },
    select: {
      id: true,
      projectCode: true,
      title: true,
      description: true,
      category: true,
      skills: true,
      budgetMin: true,
      budgetMax: true,
      currency: true,
      timelineDays: true,
      deadline: true,
      applicationCount: true,
      createdAt: true,
      recruiter: {
        select: {
          id: true,
          name: true,
          companyName: true,
          ratingAvg: true,
          isVerified: true,
        },
      },
    },
    take: 50,
  });

  const recommendations = openProjects
    .map((project) => {
      const projectSkills = project.skills || [];
      const lowerProjectSkills = projectSkills.map((s) => s.toLowerCase());

      const matchingSkills = projectSkills.filter((s) =>
        freelancerSkills.includes(s.toLowerCase())
      );
      const missingSkills = projectSkills.filter(
        (s) => !freelancerSkills.includes(s.toLowerCase())
      );

      // Match score calculation
      let skillScore = 0;
      if (projectSkills.length > 0) {
        skillScore = (matchingSkills.length / projectSkills.length) * 60;
      } else {
        skillScore = 40; // baseline if no specific skills specified
      }

      let categoryScore = 0;
      if (
        freelancer.category &&
        project.category &&
        freelancer.category.toLowerCase() === project.category.toLowerCase()
      ) {
        categoryScore = 20;
      }

      let budgetScore = 20; // Default reasonable fit
      if (freelancer.hourlyRate > 0) {
        const estProjectHourly = project.budgetMax / Math.max(project.timelineDays * 8, 10);
        if (estProjectHourly >= freelancer.hourlyRate * 0.8) {
          budgetScore = 20;
        } else {
          budgetScore = 10;
        }
      }

      const matchScore = Math.min(
        98,
        Math.max(45, Math.round(skillScore + categoryScore + budgetScore))
      );

      // Why You Match bullet points
      const whyYouMatch = [];
      if (matchingSkills.length > 0) {
        whyYouMatch.push(
          `Matches ${matchingSkills.length}/${projectSkills.length} required skills: ${matchingSkills.slice(0, 4).join(", ")}`
        );
      }
      if (categoryScore > 0) {
        whyYouMatch.push(`Project category "${project.category}" aligns with your profile focus`);
      }
      if (passportData.metrics.completionRate.value >= 90) {
        whyYouMatch.push(`Your high completion rate (${passportData.metrics.completionRate.value}%) makes you a top candidate`);
      }
      if (passportData.metrics.clientSatisfaction.value >= 4.5) {
        whyYouMatch.push(`Your ${passportData.metrics.clientSatisfaction.value}★ client rating boosts your ranking`);
      }
      if (whyYouMatch.length === 0) {
        whyYouMatch.push("Your domain experience matches project requirements");
      }

      // Estimated Competition
      let estimatedCompetition = "Low Competition (1-3 Bids)";
      if (project.applicationCount >= 8) {
        estimatedCompetition = "High Competition (8+ Bids)";
      } else if (project.applicationCount >= 4) {
        estimatedCompetition = "Medium Competition (4-7 Bids)";
      }

      // Recommended Bid Range
      const recommendedBidMin = Math.round(project.budgetMin * 0.95);
      const recommendedBidMax = Math.round(project.budgetMax);

      // Expected Difficulty
      let expectedDifficulty = "Moderate Complexity";
      if (project.budgetMax > 100000 || projectSkills.length >= 6) {
        expectedDifficulty = "High Technical Complexity";
      } else if (project.budgetMax < 25000 && projectSkills.length <= 3) {
        expectedDifficulty = "Beginner Friendly";
      }

      return {
        project: {
          id: project.id,
          projectCode: project.projectCode,
          title: project.title,
          description: project.description,
          category: project.category,
          skills: project.skills,
          budgetMin: project.budgetMin,
          budgetMax: project.budgetMax,
          currency: project.currency,
          timelineDays: project.timelineDays,
          deadline: project.deadline,
          applicationCount: project.applicationCount,
          createdAt: project.createdAt,
          client: project.recruiter,
        },
        autopilot: {
          matchScore,
          whyYouMatch,
          estimatedCompetition,
          recommendedBidRange: {
            min: recommendedBidMin,
            max: recommendedBidMax,
            recommended: Math.round((recommendedBidMin + recommendedBidMax) / 2),
            currency: project.currency,
          },
          missingSkills,
          expectedDifficulty,
        },
      };
    })
    .sort((a, b) => b.autopilot.matchScore - a.autopilot.matchScore);

  return {
    freelancer: {
      id: freelancer.id,
      name: freelancer.name,
      skills: freelancer.skills,
      passport: passportData.metrics,
    },
    totalMatches: recommendations.length,
    recommendations,
  };
};

/**
 * Generates an AI pitch proposal draft for a target project.
 * Does NOT auto-submit.
 */
const generateAIProposal = async ({ projectId, freelancerId, customTone = "Professional & Persuasive", keyHighlights = "" }) => {
  const [project, freelancer] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        skills: true,
        budgetMin: true,
        budgetMax: true,
        currency: true,
        timelineDays: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: freelancerId },
      select: {
        name: true,
        skills: true,
        experienceYears: true,
        hourlyRate: true,
        ratingAvg: true,
      },
    }),
  ]);

  if (!project) {
    throw new Error("Project not found");
  }

  const matchingSkills = (project.skills || []).filter((s) =>
    (freelancer.skills || []).some((fs) => fs.toLowerCase() === s.toLowerCase())
  );

  const proposalText = `Dear Hiring Team,

I am excited to submit my proposal for "${project.title}". With over ${freelancer.experienceYears || 3}+ years of professional experience and a strong background in ${project.category}, I am confident in delivering exceptional results for your project within your specified ${project.timelineDays}-day timeline.

Why I am the Ideal Choice for This Project:
- Relevant Skill Mastery: Expertise in ${matchingSkills.join(", ") || (freelancer.skills || []).slice(0, 4).join(", ") || "Full Stack Development"}.
- Verified Track Record: Maintaining a ${freelancer.ratingAvg ? freelancer.ratingAvg.toFixed(1) : "5.0"}★ client satisfaction rating with 100% verified escrow completion.
${keyHighlights ? `- Key Focus: ${keyHighlights}\n` : ""}- Quality & Assurance: Clean code structure, thorough testing, and prompt daily progress communications.

Proposed Execution Strategy:
1. Requirements Alignment & Architecture setup (Days 1-${Math.ceil(project.timelineDays * 0.2)})
2. Core Feature Implementation & Integration (Days ${Math.ceil(project.timelineDays * 0.2) + 1}-${Math.ceil(project.timelineDays * 0.7)})
3. Quality Audit, Testing & Deployment Handover (Days ${Math.ceil(project.timelineDays * 0.7) + 1}-${project.timelineDays})

I look forward to discussing the project specifications in detail.

Best regards,
${freelancer.name}`;

  return {
    projectId: project.id,
    projectTitle: project.title,
    proposalText,
    recommendedBid: Math.round((project.budgetMin + project.budgetMax) / 2),
    recommendedDeliveryDays: project.timelineDays,
    tone: customTone,
  };
};

module.exports = {
  getCareerRecommendations,
  generateAIProposal,
};
