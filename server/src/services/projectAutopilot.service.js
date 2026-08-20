const { prisma } = require("../config/db");

/**
 * Generates full project autopilot specification from a client's simple prompt.
 * Does NOT publish automatically. Returns draft to client for review.
 * @param {string} prompt - Client prompt (e.g. "I need an e-commerce website")
 */
const generateProjectAutopilot = async (prompt) => {
  const cleanPrompt = String(prompt || "").trim();
  if (!cleanPrompt) {
    throw new Error("Prompt is required");
  }

  const lower = cleanPrompt.toLowerCase();

  // Determine Category and Skills
  let category = "Web Development";
  let skills = ["React.js", "Node.js", "Express", "PostgreSQL", "Tailwind CSS"];
  let estimatedBudgetMin = 35000;
  let estimatedBudgetMax = 65000;
  let estimatedTimelineDays = 14;

  if (lower.includes("mobile") || lower.includes("app") || lower.includes("android") || lower.includes("ios")) {
    category = "Mobile App Development";
    skills = ["React Native", "Flutter", "Node.js", "Firebase", "REST APIs"];
    estimatedBudgetMin = 50000;
    estimatedBudgetMax = 95000;
    estimatedTimelineDays = 21;
  } else if (lower.includes("design") || lower.includes("ui") || lower.includes("ux") || lower.includes("figma")) {
    category = "Design & Creative";
    skills = ["Figma", "UI/UX Design", "Wireframing", "Prototyping", "Design System"];
    estimatedBudgetMin = 20000;
    estimatedBudgetMax = 45000;
    estimatedTimelineDays = 10;
  } else if (lower.includes("ai") || lower.includes("ml") || lower.includes("python") || lower.includes("bot")) {
    category = "AI & Machine Learning";
    skills = ["Python", "PyTorch", "OpenAI API", "FastAPI", "PostgreSQL", "Docker"];
    estimatedBudgetMin = 60000;
    estimatedBudgetMax = 120000;
    estimatedTimelineDays = 25;
  } else if (lower.includes("ecommerce") || lower.includes("e-commerce") || lower.includes("store") || lower.includes("shop")) {
    category = "Web Development";
    skills = ["Next.js", "Node.js", "PostgreSQL", "Razorpay", "Tailwind CSS", "Redux"];
    estimatedBudgetMin = 45000;
    estimatedBudgetMax = 85000;
    estimatedTimelineDays = 18;
  }

  // Find Suggested Verified Freelancers matching skills
  const matchingFreelancers = await prisma.user.findMany({
    where: {
      role: "freelancer",
      isVerified: true,
      moderationStatus: "active",
      skills: { hasSome: skills },
    },
    select: {
      id: true,
      name: true,
      username: true,
      skills: true,
      hourlyRate: true,
      ratingAvg: true,
      ratingCount: true,
      experienceYears: true,
      headline: true,
    },
    orderBy: { ratingAvg: "desc" },
    take: 3,
  });

  // Milestones Breakdown
  const milestones = [
    {
      title: "Milestone 1: Requirements Brief & Architecture Blueprint",
      durationDays: Math.ceil(estimatedTimelineDays * 0.2),
      budgetPercentage: 20,
      estimatedCost: Math.round(estimatedBudgetMax * 0.2),
      deliverables: ["Technical Architecture Specification", "Database ER Diagram", "Wireframe Mockups"],
    },
    {
      title: "Milestone 2: Core Frontend & Backend Development",
      durationDays: Math.ceil(estimatedTimelineDays * 0.5),
      budgetPercentage: 50,
      estimatedCost: Math.round(estimatedBudgetMax * 0.5),
      deliverables: ["User Auth & Dashboard UI", "API Routes & Database Integration", "Payment Gateway Setup"],
    },
    {
      title: "Milestone 3: Quality Assurance, Security Audit & Final Deployment",
      durationDays: Math.ceil(estimatedTimelineDays * 0.3),
      budgetPercentage: 30,
      estimatedCost: Math.round(estimatedBudgetMax * 0.3),
      deliverables: ["End-to-End Testing Pass", "Security & Load Test Report", "Production Server Deployment"],
    },
  ];

  // Acceptance Criteria
  const acceptanceCriteria = [
    "All specified features pass technical verification tests without errors.",
    "Responsive design verified across desktop, tablet, and mobile breakpoints.",
    "API response latency under 300ms with error rate < 0.1%.",
    "Source code delivered with README documentation and environment variables setup.",
  ];

  // Risk Factors & Mitigations
  const riskFactors = [
    {
      risk: "Third-party payment gateway integration delays",
      impact: "Medium",
      mitigation: "Use sandbox test credentials in Milestone 1 to validate webhook handlers early.",
    },
    {
      risk: "Scope creep beyond initial specification",
      impact: "High",
      mitigation: "Strict milestone deliverables gate; additional feature requests logged as separate milestone add-ons.",
    },
    {
      risk: "Performance bottleneck under peak traffic",
      impact: "Low",
      mitigation: "Implement Redis caching layer and optimized Prisma database query indexes.",
    },
  ];

  const suggestedTeam = [
    { role: "Lead Full Stack Developer", count: 1, focus: "Architecture & API Integration" },
    { role: "UI/UX Product Designer", count: 1, focus: "Figma Components & Design Tokens" },
    { role: "QA & Security Auditor", count: 1, focus: "End-to-End Testing & Vulnerability Check" },
  ];

  const generatedSpecMarkdown = `# Project Specification: ${cleanPrompt}

## Executive Summary
This project outlines the end-to-end development of a high-performance ${category} solution tailored to meet modern web standards and client growth objectives.

## Core Technical Stack
${skills.map((s) => `- ${s}`).join("\n")}

## Key Features & Functional Requirements
- **User Authentication**: Multi-factor authentication, JWT session handling, and role-based access.
- **Interactive Workspace**: Responsive UI with dynamic state management and instant feedback.
- **Payment & Escrow Integration**: Secure checkout processing with automated transaction auditing.
- **Admin & Analytics Control**: Real-time reporting dashboard with data export capabilities.

## Timeline & Budget Allocation
- **Estimated Timeline**: ${estimatedTimelineDays} Days
- **Budget Allocation**: ₹${estimatedBudgetMin.toLocaleString()} - ₹${estimatedBudgetMax.toLocaleString()} ${"INR"}
`;

  return {
    prompt: cleanPrompt,
    draftProject: {
      title: cleanPrompt.length > 50 ? `${cleanPrompt.slice(0, 47)}...` : cleanPrompt,
      description: generatedSpecMarkdown,
      category,
      skills,
      budgetMin: estimatedBudgetMin,
      budgetMax: estimatedBudgetMax,
      currency: "INR",
      timelineDays: estimatedTimelineDays,
    },
    specificationMarkdown: generatedSpecMarkdown,
    milestones,
    acceptanceCriteria,
    riskFactors,
    suggestedTeam,
    suggestedFreelancers: matchingFreelancers,
  };
};

module.exports = {
  generateProjectAutopilot,
};
