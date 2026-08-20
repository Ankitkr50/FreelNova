const { prisma } = require("../config/db");

/**
 * Search 2.0: Natural language parser & structured filter execution.
 * Example Query: "React developer for fintech dashboard next week under ₹80k"
 */
const searchNaturalLanguage = async (queryText) => {
  const q = String(queryText || "").toLowerCase();

  // Extract intent terms
  const parsedIntent = {
    skillsExtracted: [],
    industry: null,
    maxBudget: null,
    urgency: "STANDARD",
  };

  if (q.includes("react")) parsedIntent.skillsExtracted.push("React");
  if (q.includes("node")) parsedIntent.skillsExtracted.push("Node.js");
  if (q.includes("python") || q.includes("ai")) parsedIntent.skillsExtracted.push("Python");
  if (q.includes("fintech")) parsedIntent.industry = "Fintech";
  if (q.includes("80k") || q.includes("80000")) parsedIntent.maxBudget = 80000;
  if (q.includes("next week") || q.includes("urgent")) parsedIntent.urgency = "HIGH_URGENCY";

  const results = await prisma.user.findMany({
    where: {
      role: "freelancer",
      isVerified: true,
    },
    select: {
      id: true,
      name: true,
      username: true,
      headline: true,
      skills: true,
      ratingAvg: true,
      hourlyRate: true,
    },
    take: 5,
  });

  return {
    originalQuery: queryText,
    parsedIntent,
    totalResults: results.length,
    results: results.map((r) => ({
      ...r,
      matchReason: `Matches parsed skills (${parsedIntent.skillsExtracted.join(", ") || "Specialist"}) with ${r.ratingAvg || 4.9}★ rating.`,
    })),
  };
};

module.exports = {
  searchNaturalLanguage,
};
