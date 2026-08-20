const { prisma } = require("../config/db");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/apiError");
const { dispatchNotification } = require("../services/notification.service");

// Helper to validate UUIDs
const isValidUuid = (id) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

const PROJECT_SELECT = {
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
  status: true,
  recruiterId: true,
  selectedFreelancer: true,
  applicationCount: true,
  createdAt: true,
  updatedAt: true,
};

const createProject = catchAsync(async (req, res) => {
  const payload = req.validatedBody;
  const recruiterId = req.user.id || req.user._id;

  const count = await prisma.project.count();
  const projectCode = `PID${String(count + 1).padStart(8, '0')}`;

  const project = await prisma.project.create({
    data: {
      ...payload,
      recruiterId,
      projectCode,
      status: "posted",
    },
    select: PROJECT_SELECT,
  });

  res.status(201).json({
    success: true,
    message: "Project created successfully",
    data: project,
  });
});

const getProjectById = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid project id");
  }

  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      ...PROJECT_SELECT,
      recruiter: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          companyName: true,
          ratingAvg: true,
          isVerified: true,
          createdAt: true,
        },
      },
      freelancer: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  let totalSpent = 0;
  if (project.recruiter) {
    const aggregate = await prisma.payment.aggregate({
      where: {
        recruiterId: project.recruiter.id,
        status: "captured",
      },
      _sum: {
        amount: true,
      },
    });
    totalSpent = aggregate._sum.amount || 0;
  }

  const aggregateBids = await prisma.application.aggregate({
    where: { projectId: id },
    _min: { bidAmount: true },
    _max: { bidAmount: true },
    _avg: { bidAmount: true },
    _count: { id: true },
  });

  const bidStats = {
    min: aggregateBids._min.bidAmount || 0,
    max: aggregateBids._max.bidAmount || 0,
    avg: aggregateBids._avg.bidAmount ? Math.round(aggregateBids._avg.bidAmount) : 0,
    count: aggregateBids._count.id || 0,
  };

  // Map relation structures to match the original response format
  const mapped = {
    ...project,
    bidStats,
    recruiterId: project.recruiter
      ? {
          ...project.recruiter,
          totalSpent,
        }
      : null,
    selectedFreelancer: project.freelancer,
  };
  delete mapped.recruiter;
  delete mapped.freelancer;

  res.status(200).json({
    success: true,
    message: "Project fetched successfully",
    data: mapped,
  });
});

const listProjects = catchAsync(async (req, res) => {
  const {
    q,
    skills,
    category,
    budgetMin,
    budgetMax,
    status,
    recruiterId,
    sort = "newest",
    page = "1",
    limit = "10",
  } = req.query;

  const userUserId = req.user?.id || req.user?._id;
  const where = {};

  const accessConditions = [];
  if (req.user?.role === "recruiter" && userUserId) {
    accessConditions.push({
      OR: [
        { recruiterId: userUserId },
        { moderationStatus: "approved" },
      ],
    });
  } else if (req.user?.role !== "admin") {
    accessConditions.push({ moderationStatus: "approved" });
  }

  if (accessConditions.length > 0) {
    where.AND = accessConditions;
  }

  if (q) {
    const queryStr = String(q).trim();
    where.OR = [
      { title: { contains: queryStr, mode: "insensitive" } },
      { description: { contains: queryStr, mode: "insensitive" } },
    ];
  }

  if (category) {
    where.category = { equals: String(category).trim(), mode: "insensitive" };
  }

  if (status) {
    const normalizedStatus = String(status).trim().toLowerCase();
    const allowedStatuses = ["posted", "applied", "selected", "in_progress", "completed", "paid"];
    if (allowedStatuses.includes(normalizedStatus)) {
      where.status = normalizedStatus;
    }
  }

  if (recruiterId && isValidUuid(String(recruiterId))) {
    where.recruiterId = recruiterId;
  }

  if (skills) {
    const skillList = String(skills)
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);
    if (skillList.length) {
      where.skills = { hasSome: skillList };
    }
  }

  if (budgetMin || budgetMax) {
    if (budgetMin && Number.isFinite(Number(budgetMin))) {
      where.budgetMax = { gte: Number(budgetMin) };
    }
    if (budgetMax && Number.isFinite(Number(budgetMax))) {
      where.budgetMin = { lte: Number(budgetMax) };
    }
  }

  const pageNumber = Math.max(Number.parseInt(page, 10) || 1, 1);
  const limitNumber = Math.min(Math.max(Number.parseInt(limit, 10) || 10, 1), 100);
  const skip = (pageNumber - 1) * limitNumber;

  const sortMap = {
    newest: { createdAt: "desc" },
    oldest: { createdAt: "asc" },
    budget_low: { budgetMin: "asc" },
    budget_high: { budgetMax: "desc" },
    deadline_asc: { deadline: "asc" },
    deadline_desc: { deadline: "desc" },
  };
  const sortOptions = sortMap[sort] || sortMap.newest;

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      select: {
        ...PROJECT_SELECT,
        recruiter: {
          select: {
            id: true,
            name: true,
            role: true,
            companyName: true,
            ratingAvg: true,
            isVerified: true,
          },
        },
        freelancer: {
          select: {
            id: true,
            name: true,
            ratingAvg: true,
          },
        },
      },
      orderBy: sortOptions,
      skip,
      take: limitNumber,
    }),
    prisma.project.count({ where }),
  ]);

  const mappedItems = items.map((item) => {
    const mapped = { ...item, recruiterId: item.recruiter };
    delete mapped.recruiter;
    return mapped;
  });

  res.status(200).json({
    success: true,
    message: "Projects fetched successfully",
    data: mappedItems,
    meta: {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber) || 1,
      hasNextPage: pageNumber * limitNumber < total,
      hasPrevPage: pageNumber > 1,
    },
  });
});

const getProjectApplicants = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!isValidUuid(id)) {
    return res.status(200).json({
      success: true,
      message: "Applicants fetched successfully",
      data: { applicants: [], projectId: id, projectStatus: "posted" },
    });
  }

  const project = await prisma.project.findUnique({
    where: { id },
    select: { title: true, recruiterId: true, status: true },
  });

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const userUserId = req.user.id || req.user._id;
  const isOwner = project.recruiterId === userUserId;
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) {
    throw new ApiError(403, "Only recruiter owner or admin can view applicants");
  }

  const applicants = await prisma.application.findMany({
    where: { projectId: id },
    select: {
      id: true,
      proposal: true,
      bidAmount: true,
      deliveryDays: true,
      status: true,
      createdAt: true,
      freelancerId: true,
      freelancer: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          role: true,
          skills: true,
          ratingAvg: true,
          schoolOrCollege: true,
          experienceYears: true,
          companyName: true,
          hourlyRate: true,
          workExperience: true,
          portfolioItems: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const mapped = applicants.map((item) => ({
    id: item.id,
    applicantId: item.freelancer?.id || item.freelancerId,
    name: item.freelancer?.name || "Freelancer",
    username: item.freelancer?.username || "",
    proposal: item.proposal,
    bidAmount: item.bidAmount,
    deliveryDays: item.deliveryDays,
    rating: item.freelancer?.ratingAvg || 0,
    skills: item.freelancer?.skills || [],
    status: item.status,
    createdAt: item.createdAt,
    schoolOrCollege: item.freelancer?.schoolOrCollege || "",
    experienceYears: item.freelancer?.experienceYears || 0,
    companyName: item.freelancer?.companyName || "",
    hourlyRate: item.freelancer?.hourlyRate || 0,
    workExperience: item.freelancer?.workExperience || [],
    portfolioItems: item.freelancer?.portfolioItems || [],
  }));

  res.status(200).json({
    success: true,
    message: "Applicants fetched successfully",
    data: { applicants: mapped, projectId: id, projectStatus: project.status },
  });
});

const reviewApplicant = catchAsync(async (req, res) => {
  const { id, applicantId } = req.params;
  const { action } = req.validatedBody;

  if (!isValidUuid(id) || !isValidUuid(applicantId)) {
    throw new ApiError(400, "Invalid id");
  }

  const project = await prisma.project.findUnique({
    where: { id },
    select: { title: true, recruiterId: true, status: true, selectedFreelancer: true },
  });

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const userUserId = req.user.id || req.user._id;
  const isOwner = project.recruiterId === userUserId;
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) {
    throw new ApiError(403, "Only recruiter owner or admin can review applicants");
  }

  let application = await prisma.application.findUnique({
    where: { id: applicantId },
  });

  if (!application) {
    application = await prisma.application.findUnique({
      where: {
        projectId_freelancerId: {
          projectId: id,
          freelancerId: applicantId,
        },
      },
    });
  }

  if (!application) {
    throw new ApiError(404, "Application not found");
  }

  if (action === "shortlisted") {
    await prisma.application.update({
      where: { id: application.id },
      data: { status: "shortlisted" },
    });
  } else if (action === "rejected") {
    await prisma.application.update({
      where: { id: application.id },
      data: { status: "rejected" },
    });
  } else if (action === "selected") {
    if (!["posted", "applied", "selected", "in_progress"].includes(project.status)) {
      throw new ApiError(400, "Project is not in selectable state");
    }
    if (project.status === "in_progress") {
      throw new ApiError(400, "Project already in progress");
    }

    // Wrap in a transaction to make it atomic
    await prisma.$transaction([
      prisma.application.updateMany({
        where: {
          projectId: id,
          freelancerId: { not: applicantId },
          status: { in: ["submitted", "shortlisted"] },
        },
        data: { status: "rejected" },
      }),
      prisma.application.update({
        where: { id: application.id },
        data: { status: "selected" },
      }),
      prisma.project.update({
        where: { id },
        data: {
          selectedFreelancer: application.freelancerId,
          status: "selected",
        },
      }),
    ]);
  }

  res.status(200).json({
    success: true,
    message: `Applicant ${action} successfully.`,
    data: {
      projectId: id,
      applicantId,
      status: action,
    },
  });
});

const updateProjectStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.validatedBody;

  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid project id");
  }

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const userUserId = req.user.id || req.user._id;
  const isOwner = project.recruiterId === userUserId;
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) {
    throw new ApiError(403, "Only recruiter owner or admin can update project status");
  }

  await prisma.project.update({
    where: { id },
    data: { status },
  });

  if (status === "paid") {
    const payment = await prisma.payment.findFirst({
      where: {
        projectId: id,
        status: "captured",
        escrowStatus: "held_in_escrow",
      },
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          escrowStatus: "released",
          timeline: {
            create: [
              {
                event: "escrow_released",
                status: "released",
                note: "Automatically released upon project status transition to paid",
                metadata: { releasedBy: userUserId, role: req.user.role },
              },
            ],
          },
        },
      });
    }
  }

  res.status(200).json({
    success: true,
    message: "Project status updated.",
    data: { projectId: id, status },
  });
});

const applyToProject = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid project id");
  }

  const project = await prisma.project.findUnique({
    where: { id },
    select: { title: true, status: true, recruiterId: true, deadline: true, applicationCount: true },
  });

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const userUserId = req.user.id || req.user._id;
  if (project.recruiterId === userUserId) {
    throw new ApiError(400, "You cannot apply to your own project");
  }

  if (!["posted", "applied"].includes(project.status)) {
    throw new ApiError(400, "Project is not open for applications");
  }

  if (project.deadline <= new Date()) {
    throw new ApiError(400, "Project deadline has passed");
  }

  const duplicate = await prisma.application.findUnique({
    where: {
      projectId_freelancerId: {
        projectId: id,
        freelancerId: userUserId,
      },
    },
  });

  if (duplicate && duplicate.status !== "withdrawn") {
    throw new ApiError(409, "You have already applied to this project");
  }

  let finalApplicationId = duplicate?.id;

  if (duplicate && duplicate.status === "withdrawn") {
    const updatedApp = await prisma.application.update({
      where: { id: duplicate.id },
      data: {
        proposal: req.validatedBody.proposal,
        bidAmount: req.validatedBody.bidAmount,
        deliveryDays: req.validatedBody.deliveryDays,
        status: "submitted",
      },
    });
    finalApplicationId = updatedApp.id;
  } else {
    const newApp = await prisma.application.create({
      data: {
        projectId: id,
        recruiterId: project.recruiterId,
        freelancerId: userUserId,
        proposal: req.validatedBody.proposal,
        bidAmount: req.validatedBody.bidAmount,
        deliveryDays: req.validatedBody.deliveryDays,
      },
    });
    finalApplicationId = newApp.id;

    // Increment application count
    await prisma.project.update({
      where: { id },
      data: { applicationCount: { increment: 1 } },
    });
  }

  const nextStatus = project.status === "posted" ? "applied" : project.status;
  await prisma.project.update({
    where: { id },
    data: { status: nextStatus },
  });

  const application = await prisma.application.findUnique({
    where: { id: finalApplicationId },
    select: {
      id: true,
      projectId: true,
      freelancerId: true,
      recruiterId: true,
      proposal: true,
      bidAmount: true,
      deliveryDays: true,
      status: true,
      createdAt: true,
      freelancer: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  const responseApplication = {
    ...application,
    freelancerId: application.freelancer,
  };
  delete responseApplication.freelancer;

  await dispatchNotification({
    recipientIds: [project.recruiterId],
    type: "project_applied",
    title: "New project application",
    message: `A freelancer applied to your project "${project.title}".`,
    entityType: "Project",
    entityId: id,
    metadata: {
      projectStatus: nextStatus,
      applicationId: finalApplicationId,
      freelancerId: userUserId,
    },
  });

  res.status(201).json({
    success: true,
    message: "Application submitted successfully",
    data: {
      application: responseApplication,
      projectStatus: nextStatus,
    },
  });
});

const selectFreelancer = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid project id");
  }

  const project = await prisma.project.findUnique({
    where: { id },
    select: { title: true, status: true, recruiterId: true, selectedFreelancer: true, deadline: true, timelineDays: true },
  });

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const userUserId = req.user.id || req.user._id;
  if (project.recruiterId !== userUserId) {
    throw new ApiError(403, "You can only select freelancer for your own project");
  }

  if (!["applied", "selected", "in_progress"].includes(project.status)) {
    throw new ApiError(400, "Project is not in selectable state");
  }

  const { applicationId, freelancerId, startNow } = req.validatedBody;
  let selectedApplication = null;

  if (applicationId) {
    selectedApplication = await prisma.application.findUnique({
      where: { id: applicationId },
    });
  } else {
    selectedApplication = await prisma.application.findUnique({
      where: {
        projectId_freelancerId: {
          projectId: id,
          freelancerId,
        },
      },
    });
  }

  if (!selectedApplication || selectedApplication.projectId !== id) {
    throw new ApiError(404, "Application not found for this project");
  }

  if (!["submitted", "shortlisted", "selected"].includes(selectedApplication.status)) {
    throw new ApiError(400, "Only submitted/shortlisted applications can be selected");
  }

  if (project.status === "in_progress" && !startNow) {
    throw new ApiError(400, "Project already in progress; cannot move status backwards");
  }

  if (
    ["selected", "in_progress"].includes(project.status) &&
    project.selectedFreelancer &&
    project.selectedFreelancer !== selectedApplication.freelancerId
  ) {
    throw new ApiError(409, "A freelancer is already selected for this project");
  }

  const nextStatus = startNow ? "in_progress" : "selected";

  await prisma.$transaction([
    prisma.application.updateMany({
      where: {
        projectId: id,
        id: { not: selectedApplication.id },
        status: { in: ["submitted", "shortlisted"] },
      },
      data: { status: "rejected" },
    }),
    prisma.application.updateMany({
      where: { id: selectedApplication.id },
      data: { status: "selected" },
    }),
    prisma.project.update({
      where: { id },
      data: {
        selectedFreelancer: selectedApplication.freelancerId,
        status: nextStatus,
      },
    }),
  ]);

  try {
    const { ensureProjectConversation } = require("./chat.controller");
    await ensureProjectConversation(id);
  } catch (cErr) {}

  const responseProjectRaw = await prisma.project.findUnique({
    where: { id },
    select: {
      ...PROJECT_SELECT,
      freelancer: { select: { id: true, name: true, email: true, role: true } },
      recruiter: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  const responseProject = {
    ...responseProjectRaw,
    selectedFreelancer: responseProjectRaw?.freelancer || responseProjectRaw?.selectedFreelancer || null,
    recruiterId: responseProjectRaw?.recruiter || responseProjectRaw?.recruiterId || null,
  };
  delete responseProject.freelancer;
  delete responseProject.recruiter;

  const responseApplicationRaw = await prisma.application.findUnique({
    where: { id: selectedApplication.id },
    select: {
      id: true,
      projectId: true,
      freelancerId: true,
      recruiterId: true,
      proposal: true,
      bidAmount: true,
      deliveryDays: true,
      status: true,
      createdAt: true,
      freelancer: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  const responseApplication = {
    ...responseApplicationRaw,
    freelancerId: responseApplicationRaw.freelancer,
  };
  delete responseApplication.freelancer;

  await dispatchNotification({
    recipientIds: [selectedApplication.freelancerId],
    type: startNow ? "project_in_progress" : "project_selected",
    title: startNow ? "Project started" : "You have been selected",
    message: startNow
      ? `You were selected and project "${project.title}" is now in progress.`
      : `You were selected for project "${project.title}".`,
    entityType: "Project",
    entityId: id,
    metadata: {
      projectStatus: nextStatus,
      applicationId: selectedApplication.id,
    },
  });

  res.status(200).json({
    success: true,
    message: startNow
      ? "Freelancer selected and project moved to in_progress"
      : "Freelancer selected successfully",
    data: {
      project: responseProject,
      application: responseApplication,
    },
  });
});

const listAppliedProjects = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;

  const applications = await prisma.application.findMany({
    where: { freelancerId: userId },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          category: true,
          budgetMin: true,
          budgetMax: true,
          currency: true,
          status: true,
          deadline: true,
          recruiter: { select: { id: true, name: true, ratingAvg: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const mapped = applications.map((app) => ({
    id: app.project.id,
    title: app.project.title,
    category: app.project.category,
    budgetMin: app.project.budgetMin,
    budgetMax: app.project.budgetMax,
    currency: app.project.currency,
    status: app.project.status,
    deadline: app.project.deadline,
    proposal: app.proposal,
    bidAmount: app.bidAmount,
    deliveryDays: app.deliveryDays,
    applicationStatus: app.status,
    appliedAt: app.createdAt,
    recruiter: {
      name: app.project.recruiter.name,
      company: "FreelNova",
      ratingAvg: app.project.recruiter.ratingAvg,
    },
  }));

  res.status(200).json({
    success: true,
    message: "Applied projects fetched successfully",
    data: mapped,
  });
});

const projectAutopilotService = require("../services/projectAutopilot.service");
const vaultService = require("../services/vault.service");

const generateAutopilotProject = catchAsync(async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    throw new ApiError(400, "Prompt requirement is required");
  }

  const autopilotData = await projectAutopilotService.generateProjectAutopilot(prompt);

  res.status(200).json({
    success: true,
    message: "Project specification generated successfully by Autopilot",
    data: autopilotData,
  });
});

const getProjectVault = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userUserId = req.user.id || req.user._id;

  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid project id");
  }

  const vault = await vaultService.getProjectVault(id, userUserId, req.user.role);

  res.status(200).json({
    success: true,
    message: "Project Vault retrieved successfully",
    data: vault,
  });
});

const addVaultDecision = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userUserId = req.user.id || req.user._id;
  const { title, note } = req.body;

  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid project id");
  }

  const newDecision = await vaultService.addVaultDecision(id, userUserId, req.user.role, { title, note });

  res.status(201).json({
    success: true,
    message: "Vault decision recorded successfully",
    data: newDecision,
  });
});

const queryProjectAIMemory = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userUserId = req.user.id || req.user._id;
  const { question } = req.body;

  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid project id");
  }

  if (!question) {
    throw new ApiError(400, "Question is required");
  }

  const aiMemoryResponse = await vaultService.queryProjectAIMemory(id, userUserId, req.user.role, question);

  res.status(200).json({
    success: true,
    message: "Project AI Memory query resolved",
    data: aiMemoryResponse,
  });
});

const workforceService = require("../services/workforce.service");

const getHybridWorkforce = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid project id");
  }

  const workforce = await workforceService.getHybridWorkforce(id);

  res.status(200).json({
    success: true,
    message: "Hybrid Human + AI Workforce retrieved successfully",
    data: workforce,
  });
});

const assignAIAgentToProject = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid project id");
  }

  const newAgent = await workforceService.assignAIAgentToProject(id, req.body);

  res.status(201).json({
    success: true,
    message: "AI Digital Agent assigned to project workforce",
    data: newAgent,
  });
});

const logWorkOutput = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userUserId = req.user.id || req.user._id;

  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid project id");
  }

  const output = await workforceService.logWorkOutput(id, userUserId, req.body);

  res.status(201).json({
    success: true,
    message: "Work output logged with human vs AI attribution",
    data: output,
  });
});

const trustEngineService = require("../services/trustEngine.service");

const getProjectIntentScore = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid project id");
  }

  const intentData = await trustEngineService.getProjectIntentScore(id);

  res.status(200).json({
    success: true,
    message: "Project Intent Score computed",
    data: intentData,
  });
});

const getClientTrustProfile = catchAsync(async (req, res) => {
  const { id } = req.params;
  const targetRecruiterId = id || req.user.id || req.user._id;

  const trustData = await trustEngineService.getClientTrustProfile(targetRecruiterId);

  res.status(200).json({
    success: true,
    message: "Client Trust Profile computed",
    data: trustData,
  });
});

const trialProjectService = require("../services/trialProject.service");

const createTrialProject = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userUserId = req.user.id || req.user._id;

  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid project id");
  }

  const trial = await trialProjectService.createTrialProject(id, userUserId, req.body);

  res.status(201).json({
    success: true,
    message: "Paid trial project created and funded in escrow",
    data: trial,
  });
});

const getDeliverableEscrowStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid project id");
  }

  const status = await trialProjectService.getDeliverableEscrowStatus(id);

  res.status(200).json({
    success: true,
    message: "Deliverable escrow status retrieved",
    data: status,
  });
});

const ipVaultService = require("../services/ipVault.service");
const translatorService = require("../services/translator.service");

const getProjectIPVault = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid project id");
  }

  const vault = await ipVaultService.getProjectIPVault(id);

  res.status(200).json({
    success: true,
    message: "Project IP & Ownership Vault retrieved",
    data: vault,
  });
});

const translateRequirement = catchAsync(async (req, res) => {
  const { vagueText } = req.body;
  if (!vagueText) {
    throw new ApiError(400, "vagueText is required");
  }

  const translation = await translatorService.translateRequirement(vagueText);

  res.status(200).json({
    success: true,
    message: "Requirement translated to measurable technical criteria",
    data: translation,
  });
});

const getGlobalCompatibility = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id || req.user._id;

  const compat = await translatorService.getGlobalCompatibility(id, userId);

  res.status(200).json({
    success: true,
    message: "Global work compatibility calculated",
    data: compat,
  });
});

const knowledgeGraphService = require("../services/knowledgeGraph.service");

const queryKnowledgeGraph = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { query } = req.body;

  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid project id");
  }

  if (!query) {
    throw new ApiError(400, "query is required");
  }

  const result = await knowledgeGraphService.queryKnowledgeGraph(id, query);

  res.status(200).json({
    success: true,
    message: "Knowledge graph record retrieved",
    data: result,
  });
});

const matchingEngineService = require("../services/matchingEngine.service");
const continuityService = require("../services/continuity.service");
const workGraphService = require("../services/workGraph.service");
const meetingsService = require("../services/meetings.service");
const outcomeService = require("../services/outcome.service");

const getMatchingCandidatesForProject = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!isValidUuid(id)) throw new ApiError(400, "Invalid project id");

  const candidates = await matchingEngineService.getMatchingCandidatesForProject(id);
  res.status(200).json({ success: true, message: "Matching candidates computed", data: candidates });
});

const detectProjectContinuityRisk = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!isValidUuid(id)) throw new ApiError(400, "Invalid project id");

  const continuity = await continuityService.detectProjectContinuityRisk(id);
  res.status(200).json({ success: true, message: "Project continuity risk analyzed", data: continuity });
});

const approveReplacementCandidate = catchAsync(async (req, res) => {
  const { id } = req.params;
  const recruiterId = req.user.id || req.user._id;

  const result = await continuityService.approveReplacementCandidate(id, recruiterId, req.body.replacementFreelancerId);
  res.status(200).json({ success: true, message: "Replacement candidate approved & context transferred", data: result });
});

const queryPlatformWorkGraph = catchAsync(async (req, res) => {
  const result = await workGraphService.queryPlatformWorkGraph(req.query.q);
  res.status(200).json({ success: true, message: "Platform Work Graph query executed", data: result });
});

const createMeetingSession = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id || req.user._id;

  const meeting = await meetingsService.createMeetingSession(id, userId, req.body);
  res.status(201).json({ success: true, message: "Meeting session created with AI Meeting OS", data: meeting });
});

const getProjectMeetings = catchAsync(async (req, res) => {
  const { id } = req.params;
  const meetings = await meetingsService.getProjectMeetings(id);
  res.status(200).json({ success: true, message: "Project meetings retrieved", data: meetings });
});

const getProjectOutcomeScore = catchAsync(async (req, res) => {
  const { id } = req.params;
  const outcome = await outcomeService.getProjectOutcomeScore(id);
  res.status(200).json({ success: true, message: "Project outcome score retrieved", data: outcome });
});

const generateAIDisputeEvidenceSummary = catchAsync(async (req, res) => {
  const { disputeId } = req.params;
  const summary = await outcomeService.generateAIDisputeEvidenceSummary(disputeId);
  res.status(200).json({ success: true, message: "AI dispute evidence summary generated", data: summary });
});

module.exports = {
  createProject,
  getProjectById,
  listProjects,
  applyToProject,
  selectFreelancer,
  getProjectApplicants,
  reviewApplicant,
  updateProjectStatus,
  listAppliedProjects,
  generateAutopilotProject,
  getProjectVault,
  addVaultDecision,
  queryProjectAIMemory,
  getHybridWorkforce,
  assignAIAgentToProject,
  logWorkOutput,
  getProjectIntentScore,
  getClientTrustProfile,
  createTrialProject,
  getDeliverableEscrowStatus,
  getProjectIPVault,
  translateRequirement,
  getGlobalCompatibility,
  queryKnowledgeGraph,
  getMatchingCandidatesForProject,
  detectProjectContinuityRisk,
  approveReplacementCandidate,
  queryPlatformWorkGraph,
  createMeetingSession,
  getProjectMeetings,
  getProjectOutcomeScore,
  generateAIDisputeEvidenceSummary,
};
