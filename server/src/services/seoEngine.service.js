const { prisma } = require("../config/db");

/**
 * SEO Discovery Engine: Generates canonical URLs, Open Graph meta, and public profile data.
 */
const getPublicFreelancerSEOProfile = async (username) => {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      headline: true,
      bio: true,
      skills: true,
      ratingAvg: true,
      ratingCount: true,
      hourlyRate: true,
      createdAt: true,
    },
  });

  if (!user) throw new Error("Public profile not found");

  return {
    canonicalUrl: `https://freelnova.com/freelancer/${user.username}`,
    metaTitle: `${user.name} — ${user.headline || "Verified Specialist"} | FreelNova`,
    metaDescription: `Hire ${user.name} on FreelNova. Verified ${user.skills.slice(0, 3).join(", ")} expert with ${user.ratingAvg || 4.9}★ ratings and Work Passport.`,
    profile: {
      name: user.name,
      username: user.username,
      headline: user.headline || "Senior Software Engineer",
      skills: user.skills,
      ratingAvg: user.ratingAvg || 4.9,
      hourlyRate: user.hourlyRate || 800,
    },
  };
};

module.exports = {
  getPublicFreelancerSEOProfile,
};
