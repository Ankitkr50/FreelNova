const { prisma } = require("../config/db");
const passportService = require("./passport.service");
const trustEngineService = require("./trustEngine.service");
const projectAutopilotService = require("./projectAutopilot.service");
const matchingEngineService = require("./matchingEngine.service");
const rehiringService = require("./rehiring.service");
const retainerService = require("./retainer.service");
const incomeOSService = require("./incomeOS.service");

/**
 * 1. Unified Reputation Score & Badges (0-100)
 */
const getUnifiedReputationScore = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      isVerified: true,
      ratingAvg: true,
      ratingCount: true,
      skills: true,
      createdAt: true,
    },
  });

  if (!user) throw new Error("User not found");

  if (user.role === "freelancer") {
    const passport = await passportService.getWorkPassport(userId);
    const completedCount = passport.verifiedProjectsCount || 0;
    const completionRate = passport.completionRate || 100;
    const onTimeRate = passport.onTimeRate || 100;
    const ratingScore = Math.round((user.ratingAvg / 5.0) * 100);
    const repeatRate = passport.repeatClientRate || 0;
    const skillCount = user.skills.length;

    // Server-authoritative composite score calculation
    let score = Math.round(
      completionRate * 0.3 +
      onTimeRate * 0.25 +
      (ratingScore > 0 ? ratingScore : 85) * 0.25 +
      Math.min(repeatRate * 1.2, 100) * 0.1 +
      Math.min(completedCount * 3, 100) * 0.1
    );
    score = Math.min(Math.max(score, 50), 100);

    const badges = [];
    if (onTimeRate >= 95) badges.push({ code: "HIGHLY_RELIABLE", label: "HIGHLY RELIABLE", color: "bg-emerald-50 text-emerald-700 border-emerald-200" });
    if (score >= 85) badges.push({ code: "TRUSTED_PROFESSIONAL", label: "TRUSTED PROFESSIONAL", color: "bg-blue-50 text-blue-700 border-blue-200" });
    if (user.isVerified) badges.push({ code: "VERIFIED_SPECIALIST", label: "VERIFIED SPECIALIST", color: "bg-purple-50 text-purple-700 border-purple-200" });
    if (user.ratingAvg >= 4.8 && user.ratingCount >= 3) badges.push({ code: "TOP_RATED", label: "TOP RATED", color: "bg-amber-50 text-amber-800 border-amber-200" });

    return {
      userId: user.id,
      name: user.name,
      role: user.role,
      reputationScore: score,
      tierBadge: passport.freelancerLevel,
      completionRate,
      onTimeRate,
      repeatClientRate: repeatRate,
      verifiedProjectsCount: completedCount,
      badges,
    };
  } else {
    // Client Trust Profile Unified Score
    const clientTrust = await trustEngineService.getClientTrustProfile(userId);
    let score = 75;
    if (clientTrust.trustLevel === "HIGH") score = 95;
    else if (clientTrust.trustLevel === "MEDIUM") score = 82;
    else score = 65;

    const badges = [];
    if (clientTrust.paymentVerified) badges.push({ code: "TRUSTED_CLIENT", label: "TRUSTED CLIENT", color: "bg-emerald-50 text-emerald-700 border-emerald-200" });
    if (clientTrust.totalVerifiedSpend > 100000) badges.push({ code: "HIGH_VOLUME_BUYER", label: "TOP PAYER", color: "bg-blue-50 text-blue-700 border-blue-200" });
    if (clientTrust.averageResponseTimeHours <= 2) badges.push({ code: "PROMPT_RESPONDER", label: "FAST RESPONDER", color: "bg-amber-50 text-amber-800 border-amber-200" });

    return {
      userId: user.id,
      name: user.name,
      role: user.role,
      reputationScore: score,
      trustLevel: clientTrust.trustLevel,
      totalVerifiedSpend: clientTrust.totalVerifiedSpend,
      hiringCompletionRate: clientTrust.hiringCompletionRate,
      disputeRate: clientTrust.disputeRate,
      badges,
    };
  }
};

/**
 * 2. Referral & Ambassador System
 */
const getOrCreateReferralCode = async (userId) => {
  let refCode = await prisma.referralCode.findUnique({ where: { userId } });
  if (!refCode) {
    const codeStr = `REF-FN-${userId.replace(/-/g, "").substring(0, 6).toUpperCase()}`;
    refCode = await prisma.referralCode.create({
      data: {
        userId,
        code: codeStr,
      },
    });
  }
  return refCode;
};

const getReferralStats = async (userId) => {
  const refCode = await getOrCreateReferralCode(userId);
  const referrals = await prisma.userReferral.findMany({
    where: { referrerId: userId },
    orderBy: { createdAt: "desc" },
  });

  const convertedCount = referrals.filter((r) => r.status === "CONVERTED" || r.status === "REWARDED").length;
  let ambassadorTier = "RISING AMBASSADOR";
  if (convertedCount >= 20) ambassadorTier = "TOP AMBASSADOR";
  else if (convertedCount >= 5) ambassadorTier = "VERIFIED AMBASSADOR";

  const totalRewardsConnects = referrals.reduce((sum, r) => sum + (r.status === "REWARDED" ? r.rewardConnects : 0), 0);

  return {
    referralCode: refCode.code,
    shareUrl: `${process.env.CLIENT_URL || "http://localhost:5173"}/register?ref=${refCode.code}`,
    clicks: refCode.clicks,
    totalInvited: referrals.length,
    successfulReferrals: convertedCount,
    ambassadorTier,
    totalRewardsConnects,
    referralsHistory: referrals,
  };
};

const processReferralRegistration = async (referrerCode, newUserId) => {
  if (!referrerCode || !newUserId) return null;
  const refCodeObj = await prisma.referralCode.findUnique({ where: { code: referrerCode } });
  if (!refCodeObj) return null;
  if (refCodeObj.userId === newUserId) return null; // Anti-self-referral check

  const existing = await prisma.userReferral.findUnique({ where: { referredUserId: newUserId } });
  if (existing) return existing;

  const referral = await prisma.userReferral.create({
    data: {
      referrerId: refCodeObj.userId,
      referredUserId: newUserId,
      referralCode: referrerCode,
      status: "PENDING",
      rewardConnects: 20,
    },
  });

  await prisma.referralCode.update({
    where: { id: refCodeObj.id },
    data: { clicks: { increment: 1 } },
  });

  return referral;
};

/**
 * 3. Personalized Discovery Feed
 */
const getPersonalizedDiscoveryFeed = async (userId, role, query = {}) => {
  if (role === "freelancer") {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { skills: true, hourlyRate: true } });
    const userSkills = user?.skills || [];

    const projects = await prisma.project.findMany({
      where: { status: "posted" },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        recruiter: { select: { id: true, name: true, isVerified: true } },
        _count: { select: { applications: true } },
      },
    });

    const feed = projects.map((p) => {
      const matchCount = p.skills.filter((s) => userSkills.includes(s)).length;
      const matchScore = Math.min(Math.round((matchCount / Math.max(p.skills.length, 1)) * 100) + 40, 98);

      const labels = [];
      if (matchScore >= 85) labels.push({ code: "HOT_MATCH", text: `🔥 ${matchScore}% MATCH`, color: "bg-rose-50 text-rose-700 border-rose-200 font-bold" });
      if (p._count.applications < 5) labels.push({ code: "LOW_COMPETITION", text: "⚡ LOW COMPETITION", color: "bg-emerald-50 text-emerald-700 border-emerald-200" });
      if (p.budgetMax >= 50000) labels.push({ code: "HIGH_BUDGET", text: "💰 HIGH BUDGET", color: "bg-blue-50 text-blue-700 border-blue-200" });
      if (p.recruiter?.isVerified) labels.push({ code: "VERIFIED_CLIENT", text: "🛡️ VERIFIED CLIENT", color: "bg-purple-50 text-purple-700 border-purple-200" });
      if (p.timelineDays >= 30) labels.push({ code: "LONG_TERM", text: "⏳ LONG-TERM", color: "bg-amber-50 text-amber-800 border-amber-200" });

      return {
        ...p,
        matchScore,
        labels,
      };
    });

    return { projects: feed };
  } else {
    // Client view: Recommended Freelancers
    const freelancers = await prisma.user.findMany({
      where: { role: "freelancer", moderationStatus: "active" },
      select: {
        id: true,
        name: true,
        username: true,
        headline: true,
        skills: true,
        hourlyRate: true,
        ratingAvg: true,
        ratingCount: true,
        isVerified: true,
      },
      orderBy: { ratingAvg: "desc" },
      take: 15,
    });

    return { freelancers };
  }
};

/**
 * 4. Instant Hire (Fast Hiring Workflow)
 */
const getInstantHireRecommendations = async (recruiterId, criteria = {}) => {
  const { category, skills = [], budgetMax = 100000 } = criteria;
  const candidates = await prisma.user.findMany({
    where: {
      role: "freelancer",
      isVerified: true,
      moderationStatus: "active",
    },
    select: {
      id: true,
      name: true,
      username: true,
      headline: true,
      skills: true,
      hourlyRate: true,
      ratingAvg: true,
      ratingCount: true,
    },
    take: 10,
  });

  const ranked = candidates.map((c) => {
    const matchedSkills = c.skills.filter((s) => skills.includes(s)).length;
    const matchPercentage = Math.min(80 + matchedSkills * 5, 99);
    return {
      ...c,
      matchPercentage,
      estimatedDeliveryDays: 5,
      hourlyRateFormatted: `₹${c.hourlyRate}/hr`,
    };
  }).sort((a, b) => b.matchPercentage - a.matchPercentage).slice(0, 3);

  return { recommendations: ranked };
};

/**
 * 5. FreelNova Launchpad (Idea to Execution Orchestration)
 */
const orchestrateLaunchpadIdea = async (recruiterId, payload) => {
  const { ideaTitle, description, category, targetTimelineDays } = payload;
  const specResult = await projectAutopilotService.generateProjectAutopilot(ideaTitle || description || "Enterprise Fullstack Solution");

  return {
    launchpadId: `LNP-${Date.now()}`,
    ideaTitle: ideaTitle || "Enterprise Solution",
    category: category || specResult.draftProject.category,
    targetTimelineDays: targetTimelineDays || specResult.draftProject.timelineDays,
    steps: [
      { step: 1, title: "IDEA SPECIFICATION", status: "COMPLETED", data: specResult.draftProject },
      { step: 2, title: "REQUIRED SKILLS IDENTIFIED", status: "COMPLETED", skills: specResult.draftProject.skills },
      { step: 3, title: "TALENT & WORKFORCE MATCHING", status: "READY", recommendedRole: "Human + AI Hybrid Workforce", candidates: specResult.suggestedFreelancers },
      { step: 4, title: "MILESTONES BREAKDOWN", status: "PROPOSED", milestones: specResult.draftProject.suggestedMilestones },
      { step: 5, title: "DEVELOPMENT & VAULT STORAGE", status: "PENDING" },
      { step: 6, title: "QUALITY ASSURANCE & TESTING", status: "PENDING" },
      { step: 7, title: "FINAL DELIVERY & MAINTENANCE", status: "PENDING" },
    ],
  };
};

/**
 * 6. Rewards & Connects Ledger Extension
 */
const getUserRewardBalance = async (userId) => {
  let rewardObj = await prisma.userRewardCredit.findUnique({ where: { userId } });
  if (!rewardObj) {
    rewardObj = await prisma.userRewardCredit.create({
      data: {
        userId,
        connects: 50,
        totalEarned: 50,
        totalSpent: 0,
      },
    });
  }
  const history = await prisma.rewardLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return {
    userId,
    connects: rewardObj.connects,
    totalEarned: rewardObj.totalEarned,
    totalSpent: rewardObj.totalSpent,
    rewardTier: rewardObj.rewardTier,
    history,
  };
};

const awardUserRewardConnects = async (userId, action, connects, note = "") => {
  let rewardObj = await prisma.userRewardCredit.findUnique({ where: { userId } });
  if (!rewardObj) {
    rewardObj = await prisma.userRewardCredit.create({
      data: { userId, connects: 50, totalEarned: 50 },
    });
  }

  const updated = await prisma.userRewardCredit.update({
    where: { userId },
    data: {
      connects: { increment: connects },
      totalEarned: { increment: connects },
    },
  });

  await prisma.rewardLog.create({
    data: {
      userId,
      action,
      connects,
      note,
    },
  });

  return updated;
};

/**
 * 8. Public Work Showcase Page
 */
const getPublicWorkShowcase = async (username) => {
  const user = await prisma.user.findFirst({
    where: { OR: [{ username }, { id: username }] },
    select: {
      id: true,
      name: true,
      username: true,
      headline: true,
      bio: true,
      location: true,
      skills: true,
      hourlyRate: true,
      ratingAvg: true,
      ratingCount: true,
      portfolioItems: true,
      isVerified: true,
      createdAt: true,
    },
  });

  if (!user) throw new Error("Public profile showcase not found");
  const passport = await passportService.getWorkPassport(user.id);

  return {
    profile: {
      ...user,
      freelancerLevel: passport.freelancerLevel,
      verifiedProjectsCount: passport.verifiedProjectsCount,
      completionRate: passport.completionRate,
      onTimeRate: passport.onTimeRate,
    },
    privacy: "PUBLIC",
  };
};

/**
 * 9. Community Hub Services
 */
const getCommunityPosts = async (query = {}) => {
  const { category = "all", search } = query;
  const where = { status: "APPROVED" };
  if (category !== "all") where.category = category;

  const posts = await prisma.communityPost.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      comments: true,
      _count: { select: { comments: true, reactions: true } },
    },
  });

  // Attach author details
  const authorIds = [...new Set(posts.map((p) => p.authorId))];
  const authors = await prisma.user.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, name: true, username: true, role: true },
  });
  const authorMap = Object.fromEntries(authors.map((a) => [a.id, a]));

  const enriched = posts.map((p) => ({
    ...p,
    author: authorMap[p.authorId] || { name: "Community Member" },
  }));

  return { posts: enriched };
};

const createCommunityPost = async (authorId, payload) => {
  const { title, content, category = "General", tags = [] } = payload;
  const post = await prisma.communityPost.create({
    data: {
      authorId,
      title,
      content,
      category,
      tags,
    },
  });
  return post;
};

/**
 * 10. Freelancer Business Toolkit Unified Data
 */
const getBusinessToolkitData = async (userId) => {
  const incomeData = await incomeOSService.getIncomeOS(userId);
  const passport = await passportService.getWorkPassport(userId);
  const activeContracts = await prisma.project.findMany({
    where: { selectedFreelancer: userId, status: "in_progress" },
    select: { id: true, title: true, budgetMin: true, budgetMax: true, deadline: true },
  });

  return {
    incomeOverview: incomeData,
    passportMetrics: passport,
    activeContractsCount: activeContracts.length,
    activeContracts,
  };
};

/**
 * 13. Automated Achievements Evaluator
 */
const evaluateUserAchievements = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return [];

  const passport = await passportService.getWorkPassport(userId);
  const completedCount = passport.verifiedProjectsCount || 0;
  const repeatCount = passport.repeatClientRate || 0;

  const eligibleCodes = [];
  if (completedCount >= 1) eligibleCodes.push({ code: "FIRST_PROJECT", title: "🏆 First Completed Project", description: "Successfully delivered your first client milestone", icon: "badge-first.png" });
  if (completedCount >= 5) eligibleCodes.push({ code: "MILESTONE_5", title: "⚡ 5 Projects Milestone", description: "Completed 5 verified client projects", icon: "badge-5.png" });
  if (passport.onTimeRate >= 95 && completedCount >= 3) eligibleCodes.push({ code: "ONTIME_STREAK_10", title: "🔥 Always On-Time", description: "Maintained 95%+ on-time delivery record", icon: "badge-ontime.png" });
  if (repeatCount > 0) eligibleCodes.push({ code: "REPEAT_PARTNER_10", title: "💎 Client Favorite", description: "Secured repeat contracts with satisfied clients", icon: "badge-repeat.png" });
  if (user.isVerified) eligibleCodes.push({ code: "EXPERT_VERIFIED", title: "🎯 Verified Specialist", description: "Passed verified identity & skill assessment", icon: "badge-verified.png" });

  for (const item of eligibleCodes) {
    try {
      await prisma.userAchievement.upsert({
        where: { userId_achievementCode: { userId, achievementCode: item.code } },
        update: {},
        create: {
          userId,
          achievementCode: item.code,
          title: item.title,
          description: item.description,
          badgeIcon: item.icon,
        },
      });
    } catch (e) {
      // Ignore duplicates
    }
  }

  const achievements = await prisma.userAchievement.findMany({ where: { userId } });
  return achievements;
};

/**
 * 14. Personalized Growth Dashboard
 */
const getPersonalizedGrowthDashboard = async (userId, role) => {
  const reputation = await getUnifiedReputationScore(userId);
  const achievements = await evaluateUserAchievements(userId);
  const rewardBalance = await getUserRewardBalance(userId);

  if (role === "freelancer") {
    const passport = await passportService.getWorkPassport(userId);
    return {
      role,
      reputation,
      passport,
      achievements,
      connectsBalance: rewardBalance.connects,
      nextTierGoal: passport.freelancerLevel?.detail || "Bronze L1 Next",
    };
  } else {
    const clientTrust = await trustEngineService.getClientTrustProfile(userId);
    return {
      role,
      reputation,
      clientTrust,
      achievements,
    };
  }
};

module.exports = {
  getUnifiedReputationScore,
  getOrCreateReferralCode,
  getReferralStats,
  processReferralRegistration,
  getPersonalizedDiscoveryFeed,
  getInstantHireRecommendations,
  orchestrateLaunchpadIdea,
  getUserRewardBalance,
  awardUserRewardConnects,
  getPublicWorkShowcase,
  getCommunityPosts,
  createCommunityPost,
  getBusinessToolkitData,
  evaluateUserAchievements,
  getPersonalizedGrowthDashboard,
};
