const { prisma } = require("../config/db");

// In-memory onboarding goals store
const onboardingGoalsStore = {};

/**
 * Sets user goal and returns personalized onboarding steps.
 */
const setUserOnboardingGoal = async (userId, goal) => {
  onboardingGoalsStore[userId] = goal; // HIRE_FREELANCER | BUILD_TEAM | BUY_SERVICE | HIRE_LONG_TERM

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isVerified: true, role: true, name: true },
  });

  const steps = [
    { step: 1, title: "Verify Account", status: user?.isVerified ? "COMPLETED" : "PENDING" },
    { step: 2, title: `Set Goal (${goal})`, status: "COMPLETED" },
    { step: 3, title: "Company Profile Info", status: "OPTIONAL" },
    { step: 4, title: "Create First Project or Service Order", status: "NEXT_ACTION" },
    { step: 5, title: "Review Matching Talent", status: "LOCKED" },
  ];

  return {
    userId,
    selectedGoal: goal,
    completionPercentage: user?.isVerified ? 60 : 40,
    steps,
  };
};

module.exports = {
  setUserOnboardingGoal,
};
