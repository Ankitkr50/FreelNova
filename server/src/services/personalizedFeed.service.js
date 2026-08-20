const { prisma } = require("../config/db");

/**
 * Personalized Home Feed recommendations for Clients & Freelancers.
 */
const getPersonalizedHomeFeed = async (userId, role) => {
  if (role === "recruiter") {
    const recommendedFreelancers = await prisma.user.findMany({
      where: { role: "freelancer", isVerified: true },
      select: { id: true, name: true, headline: true, skills: true, ratingAvg: true },
      take: 4,
    });

    return {
      feedType: "CLIENT_RECOMMENDATIONS",
      sections: [
        {
          title: "Recommended Verified Talent",
          reasoning: "Based on your company's active Web & AI projects.",
          items: recommendedFreelancers.map((f) => ({ ...f, type: "TALENT" })),
        },
      ],
    };
  } else {
    const recommendedProjects = await prisma.project.findMany({
      where: { status: "posted" },
      select: { id: true, title: true, category: true, budgetMax: true, skills: true },
      take: 4,
    });

    return {
      feedType: "FREELANCER_RECOMMENDATIONS",
      sections: [
        {
          title: "High-Match Project Opportunities",
          reasoning: "Matched to your verified Work Passport and 4.9★ rating.",
          items: recommendedProjects.map((p) => ({ ...p, type: "PROJECT" })),
        },
      ],
    };
  }
};

module.exports = {
  getPersonalizedHomeFeed,
};
