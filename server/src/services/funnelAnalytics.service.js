/**
 * Funnel Analytics: Signup → Activation → First Hire → Repeat Transaction.
 */
const getFunnelAnalytics = async () => {
  return {
    clientFunnel: [
      { step: "Signup", count: 500, conversionRate: "100%" },
      { step: "Account Verification", count: 440, conversionRate: "88%" },
      { step: "Project Created", count: 350, conversionRate: "70%" },
      { step: "Talent Shortlisted", count: 290, conversionRate: "58%" },
      { step: "First Hire & Escrow Funded", count: 245, conversionRate: "49%" },
      { step: "Project Completion", count: 220, conversionRate: "44%" },
      { step: "Repeat Hire", count: 140, conversionRate: "28%" },
    ],
    freelancerFunnel: [
      { step: "Signup", count: 1200, conversionRate: "100%" },
      { step: "Profile Completion", count: 960, conversionRate: "80%" },
      { step: "Skill Arena Passed", count: 720, conversionRate: "60%" },
      { step: "First Application", count: 680, conversionRate: "56%" },
      { step: "Hired & Delivered", count: 480, conversionRate: "40%" },
      { step: "Retainer Signed", count: 180, conversionRate: "15%" },
    ],
  };
};

module.exports = {
  getFunnelAnalytics,
};
