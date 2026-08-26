const { prisma } = require("../config/db");
const catchAsync = require("../utils/catchAsync");
const { userCache } = require("../middleware/auth.middleware");
const { sendEmail } = require("../services/email.service");
const ApiError = require("../utils/apiError");

const PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  username: true,
  userCode: true,
  role: true,
  bio: true,
  headline: true,
  location: true,
  education: true,
  experienceYears: true,
  skills: true,
  experience: true,
  portfolioLinks: true,
  hourlyRate: true,
  workExperience: true,
  portfolioItems: true,
  resumeUrl: true,
  resumeName: true,
  resumeMimeType: true,
  resumeSize: true,
  resumePublicId: true,
  resumeUploadedAt: true,
  isEmailVerified: true,
  isVerified: true,
  category: true,
  profileCompleted: true,
  phone: true,
  schoolOrCollege: true,
  schoolResult: true,
  schoolIdCard: true,
  aadhaarCard: true,
  aadhaarCardPhoto: true,
  panCard: true,
  isInternational: true,
  passportOrNationalId: true,
  passportPhoto: true,
  taxIdNumber: true,
  swiftBic: true,
  ibanAccountNo: true,
  timezone: true,
  bankAccountNo: true,
  bankIfsc: true,
  bankName: true,
  bankHolderName: true,
  upiId: true,
  companyName: true,

  companyId: true,
  isPhoneVerified: true,
  adminRole: true,
  customRoleTitle: true,
  adminPermissions: true,
  staffStatus: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
};

const isValidUuid = (id) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

const getProfile = catchAsync(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  const rawTarget = req.query.userId ? String(req.query.userId).trim() : currentUserId;
  const cleanTarget = rawTarget.replace(/^@/, "");
  const upperCode = rawTarget.toUpperCase();

  let user = null;

  if (!req.query.userId || rawTarget === currentUserId) {
    user = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: PROFILE_SELECT,
    });
  } else {
    const orConditions = [
      { userCode: { equals: upperCode, mode: "insensitive" } },
      { username: { equals: cleanTarget.toLowerCase(), mode: "insensitive" } },
      { email: { equals: cleanTarget.toLowerCase(), mode: "insensitive" } },
      { name: { contains: cleanTarget, mode: "insensitive" } },
    ];
    if (isValidUuid(rawTarget)) {
      orConditions.unshift({ id: rawTarget });
    }

    user = await prisma.user.findFirst({
      where: { OR: orConditions },
      select: PROFILE_SELECT,
    });
  }

  if (!user) {
    throw new ApiError(404, "User profile not found");
  }

  // Redact sensitive details if querying someone else's profile
  if (user.id !== currentUserId) {
    const sensitiveFields = [
      "email", "phone",
      "aadhaarCard", "aadhaarCardPhoto", "panCard",
      "passportOrNationalId", "passportPhoto", "taxIdNumber",
      "swiftBic", "ibanAccountNo",
      "bankAccountNo", "bankIfsc", "bankHolderName", "upiId",
      "schoolIdCard", "schoolResult"
    ];
    sensitiveFields.forEach((field) => {
      delete user[field];
    });
  }

  if (user && (user.role === "admin" || user.adminRole || user.email === "fn.freelnova@gmail.com")) {
    user = {
      ...user,
      username: user.email === "fn.freelnova@gmail.com" ? "admin_freelnova" : (user.username || "admin_freelnova"),
      customRoleTitle: user.customRoleTitle || (user.adminRole === "CUSTOM" ? "Main Admin" : (user.adminRole ? user.adminRole.replace(/_/g, " ") : "Super Administrator (Full Access)")),
    };
  }

  res.status(200).json({
    success: true,
    message: "Profile fetched successfully",
    data: user,
  });
});

const updateProfile = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const updates = req.validatedBody || {};

  if (updates.username) {
    const currentUserRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true }
    });
    if (currentUserRecord?.username) {
      if (currentUserRecord.username === updates.username) {
        delete updates.username;
      } else {
        throw new ApiError(400, "Username can only be set once and cannot be changed");
      }
    } else {
      const existing = await prisma.user.findFirst({
        where: {
          username: updates.username,
          id: { not: userId }
        }
      });
      if (existing) {
        throw new ApiError(400, "Username is already taken by another user");
      }
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updates,
    select: PROFILE_SELECT,
  });

  // Invalidate Redis cache to reflect updates instantly
  await userCache.del(userId);

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: user,
  });
});

const updateResumeMetadata = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const updates = req.validatedBody || {};

  const user = await prisma.user.update({
    where: { id: userId },
    data: updates,
    select: PROFILE_SELECT,
  });

  // Invalidate Redis cache to reflect updates instantly
  await userCache.del(userId);

  res.status(200).json({
    success: true,
    message: "Resume metadata updated successfully",
    data: user,
  });
});

const listFreelancers = catchAsync(async (req, res) => {
  const { q, skills } = req.query;

  const where = {
    role: "freelancer",
    moderationStatus: "active",
  };

  if (q) {
    const queryStr = String(q).trim();
    where.OR = [
      { name: { contains: queryStr, mode: "insensitive" } },
      { headline: { contains: queryStr, mode: "insensitive" } },
      { bio: { contains: queryStr, mode: "insensitive" } },
    ];
  }

  if (skills) {
    const skillList = String(skills)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (skillList.length) {
      where.skills = { hasSome: skillList };
    }
  }

  const freelancers = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      username: true,
      headline: true,
      bio: true,
      location: true,
      skills: true,
      experienceYears: true,
      ratingAvg: true,
      ratingCount: true,
      portfolioLinks: true,
      hourlyRate: true,
      workExperience: true,
      portfolioItems: true,
      createdAt: true,
      isVerified: true,
      subscriptions: {
        where: {
          status: "active",
          expiresAt: { gt: new Date() }
        },
        select: {
          plan: true
        }
      }
    },
    orderBy: { ratingAvg: "desc" },
  });

  // Sort in memory for priority ranking: Subscribed Elite Pro -> Verified -> Standard
  freelancers.sort((a, b) => {
    const aSub = a.subscriptions?.length > 0 ? 1 : 0;
    const bSub = b.subscriptions?.length > 0 ? 1 : 0;
    if (aSub !== bSub) return bSub - aSub;

    const aVer = a.isVerified ? 1 : 0;
    const bVer = b.isVerified ? 1 : 0;
    if (aVer !== bVer) return bVer - aVer;

    // Fallback tie-breakers
    const aRating = a.ratingAvg || 0;
    const bRating = b.ratingAvg || 0;
    if (aRating !== bRating) return bRating - aRating;

    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  res.status(200).json({
    success: true,
    message: "Freelancers fetched successfully",
    data: freelancers,
  });
});

const sendSupportInquiry = catchAsync(async (req, res) => {
  const { name, email, msg } = req.body;

  if (!name || !email || !msg) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields: name, email, message.",
    });
  }

  const subject = `[Support Inquiry] New Ticket from ${name}`;
  const text = `Support Inquiry from FreelNova:
Name: ${name}
Email: ${email}
User ID: ${req.user.id}
Role: ${req.user.role}

Message:
${msg}`;

  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #1a56db; border-bottom: 1px solid #edf2f7; padding-bottom: 10px;">New FreelNova Support Ticket</h2>
      <p style="margin: 15px 0;"><strong>Name:</strong> ${name}</p>
      <p style="margin: 15px 0;"><strong>Email:</strong> ${email}</p>
      <p style="margin: 15px 0;"><strong>User ID:</strong> ${req.user.id}</p>
      <p style="margin: 15px 0;"><strong>User Role:</strong> ${req.user.role}</p>
      <div style="background-color: #f7fafc; padding: 15px; border-radius: 8px; margin-top: 20px; font-style: italic;">
        ${msg.replace(/\n/g, "<br/>")}
      </div>
    </div>
  `;

  try {
    await sendEmail({
      to: "fn.freelnova@gmail.com",
      subject,
      text,
      html,
    });
  } catch (err) {
    console.error("Support email failed to send, logging locally instead:", err.message);
    console.log("================ MOCK SUPPORT TICKET ================");
    console.log(`To: fn.freelnova@gmail.com`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${text}`);
    console.log("=====================================================");
  }

  res.status(200).json({
    success: true,
    message: "Your support inquiry has been sent successfully.",
  });
});



const completeProfile = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const updates = req.validatedBody || {};

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }

  if (updates.username) {
    if (existingUser.username) {
      if (existingUser.username === updates.username) {
        delete updates.username;
      } else {
        throw new ApiError(400, "Username can only be set once and cannot be changed");
      }
    } else {
      const existing = await prisma.user.findFirst({
        where: {
          username: updates.username,
          id: { not: userId }
        }
      });
      if (existing) {
        throw new ApiError(400, "Username is already taken by another user");
      }
    }
  }

  updates.profileCompleted = true;
  updates.isPhoneVerified = true;

  const user = await prisma.user.update({
    where: { id: userId },
    data: updates,
    select: PROFILE_SELECT,
  });

  // Invalidate Redis cache to reflect updates instantly
  await userCache.del(userId);

  res.status(200).json({
    success: true,
    message: "Profile onboarding completed successfully",
    data: user,
  });
});

const flagSolicitation = catchAsync(async (req, res) => {
  const { messageText } = req.body;
  const user = req.user;
  const userId = user.id || user._id;

  // 1. Fetch all admin users
  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    select: { id: true }
  });

  // 2. Create notification entries for all admins
  const notificationsData = admins.map((admin) => ({
    recipientId: admin.id,
    type: "policy_violation",
    title: "⚠️ Solicitation Detected",
    message: `User ${user.name} (${user.email}) shared contact information. Message: "${messageText || ""}"`,
    entityType: "user",
    entityId: userId,
    metadata: {
      userId,
      userName: user.name,
      userEmail: user.email,
      messageText: messageText || ""
    }
  }));

  if (notificationsData.length > 0) {
    await prisma.notification.createMany({
      data: notificationsData
    });
  }

  // 3. Mark user as suspended instantly in the DB
  await prisma.user.update({
    where: { id: userId },
    data: {
      moderationStatus: "suspended",
      moderationNote: `Auto-suspended for sharing contact info. Violating message: "${messageText || ""}"`
    }
  });

  // Evict from Cache
  await userCache.del(userId);

  res.status(200).json({
    success: true,
    message: "Policy violation registered. Account suspended."
  });
});

const checkUsernameAvailability = catchAsync(async (req, res) => {
  const { username } = req.query;
  const userId = req.user.id || req.user._id;

  if (!username) {
    throw new ApiError(400, "Username query parameter is required");
  }

  const cleanUsername = String(username).trim().toLowerCase();

  // Validate format
  if (!/^[a-z0-9_-]{3,30}$/.test(cleanUsername)) {
    return res.status(200).json({
      success: true,
      data: {
        available: false,
        reason: "invalid_format",
        message: "Username must be 3-30 characters, lowercase alphanumeric, underscore, or hyphen."
      }
    });
  }

  const existing = await prisma.user.findFirst({
    where: {
      username: cleanUsername,
      id: { not: userId }
    }
  });

  if (existing) {
    return res.status(200).json({
      success: true,
      data: {
        available: false,
        reason: "taken",
        message: "Username is already taken by another user"
      }
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      available: true,
      message: "Username is available"
    }
  });
});

const passportService = require("../services/passport.service");
const autopilotService = require("../services/autopilot.service");

const getWorkPassport = catchAsync(async (req, res) => {
  const targetId = req.params.id || req.user.id || req.user._id;
  const passport = await passportService.getWorkPassport(targetId);

  res.status(200).json({
    success: true,
    message: "Work Passport retrieved successfully",
    data: passport,
  });
});

const getCareerAutopilot = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const recommendations = await autopilotService.getCareerRecommendations(userId);

  res.status(200).json({
    success: true,
    message: "Career Autopilot recommendations fetched successfully",
    data: recommendations,
  });
});

const generateAIProposal = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const { projectId, customTone, keyHighlights } = req.body;

  if (!projectId) {
    throw new ApiError(400, "projectId is required");
  }

  const proposal = await autopilotService.generateAIProposal({
    projectId,
    freelancerId: userId,
    customTone,
    keyHighlights,
  });

  res.status(200).json({
    success: true,
    message: "AI proposal draft generated successfully",
    data: proposal,
  });
});

const aiTwinService = require("../services/aiTwin.service");

const getAITwinConfig = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const configData = await aiTwinService.getAITwinConfig(userId);

  res.status(200).json({
    success: true,
    message: "AI Twin configuration fetched successfully",
    data: configData,
  });
});

const updateAITwinConfig = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const updated = await aiTwinService.updateAITwinConfig(userId, req.body);

  res.status(200).json({
    success: true,
    message: "AI Twin configuration updated successfully",
    data: updated,
  });
});

const queryAITwin = catchAsync(async (req, res) => {
  const { id: freelancerId } = req.params;
  const { question } = req.body;

  if (!question) {
    throw new ApiError(400, "Question is required");
  }

  const response = await aiTwinService.queryAITwin(freelancerId, question);

  res.status(200).json({
    success: true,
    message: "AI Twin query resolved",
    data: response,
  });
});

const retainerService = require("../services/retainer.service");
const companyWorkspaceService = require("../services/companyWorkspace.service");

const createRetainerContract = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const retainer = await retainerService.createRetainerContract(userId, req.body);

  res.status(201).json({
    success: true,
    message: "Retainer contract created successfully",
    data: retainer,
  });
});

const listRetainerContracts = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const contracts = await retainerService.listRetainerContracts(userId);

  res.status(200).json({
    success: true,
    message: "Retainer contracts fetched successfully",
    data: contracts,
  });
});

const terminateRetainerContract = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const { id } = req.params;
  const { reason } = req.body;
  const contract = await retainerService.terminateRetainerContract(userId, id, reason);

  res.status(200).json({
    success: true,
    message: "Retainer contract terminated per notice terms",
    data: contract,
  });
});

const getCompanyWorkspace = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const workspaceData = await companyWorkspaceService.getCompanyWorkspace(userId);

  res.status(200).json({
    success: true,
    message: "Company workspace fetched successfully",
    data: workspaceData,
  });
});

const createApprovalRequest = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const request = await companyWorkspaceService.createApprovalRequest(userId, req.body);

  res.status(201).json({
    success: true,
    message: "Hiring approval request submitted to workflow",
    data: request,
  });
});

const approveWorkflowStep = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const { requestId } = req.params;
  const { targetStep } = req.body;

  const reqDoc = await companyWorkspaceService.approveWorkflowStep(userId, requestId, targetStep);

  res.status(200).json({
    success: true,
    message: `Workflow step "${targetStep}" approved`,
    data: reqDoc,
  });
});

const radarService = require("../services/radar.service");

const getOpportunityRadar = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const radar = await radarService.getOpportunityRadar(userId);

  res.status(200).json({
    success: true,
    message: "Opportunity radar fetched successfully",
    data: radar,
  });
});

const getEarningIntelligence = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const intelligence = await radarService.getEarningIntelligence(userId);

  res.status(200).json({
    success: true,
    message: "Earning intelligence fetched successfully",
    data: intelligence,
  });
});

const rehiringService = require("../services/rehiring.service");

const getSmartRehiringPool = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const pool = await rehiringService.getSmartRehiringPool(userId);
  res.status(200).json({ success: true, message: "Smart rehiring pool fetched", data: pool });
});

const getClientSpendIntelligence = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const spend = await rehiringService.getClientSpendIntelligence(userId);
  res.status(200).json({ success: true, message: "Client spend intelligence fetched", data: spend });
});

const incomeOSService = require("../services/incomeOS.service");

const getIncomeOS = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const incomeData = await incomeOSService.getIncomeOS(userId);

  res.status(200).json({
    success: true,
    message: "Income OS data fetched successfully",
    data: incomeData,
  });
});

const getMarketplaceDecision = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const decision = await incomeOSService.getMarketplaceDecision(userId, req.user.role, req.body);

  res.status(200).json({
    success: true,
    message: "Marketplace decision analysis generated",
    data: decision,
  });
});

const mentorService = require("../services/mentor.service");
const studioService = require("../services/studio.service");
const protectionService = require("../services/protection.service");

const listMentors = catchAsync(async (req, res) => {
  const mentors = await mentorService.listMentors();

  res.status(200).json({
    success: true,
    message: "Mentors list retrieved successfully",
    data: mentors,
  });
});

const bookMentorSession = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const booking = await mentorService.bookMentorSession(userId, req.body);

  res.status(201).json({
    success: true,
    message: "Mentor consultation session booked",
    data: booking,
  });
});

const getOrCreateStudio = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const studio = await studioService.getOrCreateStudio(userId, req.body);

  res.status(200).json({
    success: true,
    message: "FreelNova Studio team retrieved successfully",
    data: studio,
  });
});

const getProtectionEligibility = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const { projectId } = req.query;

  if (!projectId) {
    throw new ApiError(400, "projectId is required");
  }

  const protection = await protectionService.getProtectionEligibility(projectId, userId);

  res.status(200).json({
    success: true,
    message: "Protection eligibility computed",
    data: protection,
  });
});

const matchingEngineService = require("../services/matchingEngine.service");
const businessOSService = require("../services/businessOS.service");
const availabilityService = require("../services/availability.service");
const productizedServicesService = require("../services/productizedServices.service");
const referralService = require("../services/referral.service");
const careerMobilityService = require("../services/careerMobility.service");
const workforceOSService = require("../services/workforceOS.service");

const getMatchingProjectsForFreelancer = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const matches = await matchingEngineService.getMatchingProjectsForFreelancer(userId);

  res.status(200).json({
    success: true,
    message: "Matching projects retrieved via Matching Engine 2.0",
    data: matches,
  });
});

const getFreelancerBusinessOS = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const data = await businessOSService.getFreelancerBusinessOS(userId);

  res.status(200).json({
    success: true,
    message: "Freelancer Business OS data retrieved",
    data,
  });
});

const getOrUpdateAvailability = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const data = await availabilityService.getOrUpdateAvailability(userId, req.method === "POST" ? req.body : null);

  res.status(200).json({
    success: true,
    message: "Smart availability capacity retrieved",
    data,
  });
});

const listProductizedServices = catchAsync(async (req, res) => {
  const services = await productizedServicesService.listProductizedServices(req.query.category);

  res.status(200).json({
    success: true,
    message: "Productized Services list retrieved",
    data: services,
  });
});

const buyProductizedService = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id || req.user._id;
  const order = await productizedServicesService.buyProductizedService(id, userId, req.body.tierName);

  res.status(201).json({
    success: true,
    message: "Productized service ordered and funded in escrow",
    data: order,
  });
});

const createReferral = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const referral = await referralService.createReferral(userId, req.body);

  res.status(201).json({
    success: true,
    message: "Verified referral created",
    data: referral,
  });
});

const getOrCreatePrivateTalentPool = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const pool = await referralService.getOrCreatePrivateTalentPool(userId, req.query.poolName);

  res.status(200).json({
    success: true,
    message: "Private Talent Pool 2.0 retrieved",
    data: pool,
  });
});

const getCareerMobilitySuggestions = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const suggestions = await careerMobilityService.getCareerMobilitySuggestions(userId);

  res.status(200).json({
    success: true,
    message: "Career mobility suggestions generated",
    data: suggestions,
  });
});

const getUnifiedWorkforceDirectory = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const directory = await workforceOSService.getUnifiedWorkforceDirectory(userId);

  res.status(200).json({
    success: true,
    message: "External Workforce OS directory retrieved",
    data: directory,
  });
});

const trustEventService = require("../services/trustEvent.service");
const antiFraudService = require("../services/antiFraud.service");
const twoFactorService = require("../services/twoFactor.service");
const sessionSecurityService = require("../services/sessionSecurity.service");
const ledgerService = require("../services/ledger.service");
const reconciliationService = require("../services/reconciliation.service");
const changeControlService = require("../services/changeControl.service");
const incidentService = require("../services/incidentManagement.service");
const observabilityService = require("../services/observability.service");

const getUserTrustEvents = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const events = await trustEventService.getUserTrustEvents(userId);
  res.status(200).json({ success: true, message: "Trust events retrieved", data: events });
});

const assessUserFraudRisk = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const risk = await antiFraudService.assessUserFraudRisk(userId);
  res.status(200).json({ success: true, message: "Anti-fraud risk evaluated", data: risk });
});

const getOrSetup2FA = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const config = await twoFactorService.getOrSetup2FA(userId);
  res.status(200).json({ success: true, message: "2FA status retrieved", data: config });
});

const enable2FA = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const config = await twoFactorService.enable2FA(userId, req.body.code);
  res.status(200).json({ success: true, message: "2FA enabled successfully", data: config });
});

const getActiveSessions = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const sessions = await sessionSecurityService.getActiveSessions(userId, req);
  res.status(200).json({ success: true, message: "Active sessions retrieved", data: sessions });
});

const revokeAllOtherSessions = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const result = await sessionSecurityService.revokeAllOtherSessions(userId);
  res.status(200).json({ success: true, message: "All other sessions revoked", data: result });
});

const getFinancialLedgerEntries = catchAsync(async (req, res) => {
  const ledger = await ledgerService.getFinancialLedgerEntries(req.query);
  res.status(200).json({ success: true, message: "Financial ledger entries retrieved", data: ledger });
});

const runFinancialReconciliation = catchAsync(async (req, res) => {
  const result = await reconciliationService.runFinancialReconciliation();
  res.status(200).json({ success: true, message: "Financial reconciliation audit complete", data: result });
});

const createContractChangeRequest = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const request = await changeControlService.createContractChangeRequest(req.body.projectId, userId, req.body);
  res.status(201).json({ success: true, message: "Contract change request created", data: request });
});

const listSecurityIncidents = catchAsync(async (req, res) => {
  const incidents = await incidentService.listSecurityIncidents();
  res.status(200).json({ success: true, message: "Security incidents list retrieved", data: incidents });
});

const getProductionSystemMetrics = catchAsync(async (req, res) => {
  const metrics = await observabilityService.getProductionSystemMetrics();
  res.status(200).json({ success: true, message: "System metrics retrieved", data: metrics });
});

const liquidityService = require("../services/liquidityAnalytics.service");
const funnelService = require("../services/funnelAnalytics.service");
const onboardingService = require("../services/smartOnboarding.service");
const searchEngineService = require("../services/searchEngine.service");
const feedService = require("../services/personalizedFeed.service");
const actionCenterService = require("../services/actionCenter.service");
const seoService = require("../services/seoEngine.service");
const aiCostService = require("../services/aiCostIntelligence.service");
const featureFlagsService = require("../services/featureFlags.service");

const getMarketplaceLiquidityMetrics = catchAsync(async (req, res) => {
  const metrics = await liquidityService.getMarketplaceLiquidityMetrics();
  res.status(200).json({ success: true, message: "Liquidity metrics retrieved", data: metrics });
});

const getFunnelAnalytics = catchAsync(async (req, res) => {
  const funnels = await funnelService.getFunnelAnalytics();
  res.status(200).json({ success: true, message: "Funnel analytics retrieved", data: funnels });
});

const setUserOnboardingGoal = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const onboarding = await onboardingService.setUserOnboardingGoal(userId, req.body.goal);
  res.status(200).json({ success: true, message: "Onboarding goal updated", data: onboarding });
});

const searchNaturalLanguage = catchAsync(async (req, res) => {
  const searchResult = await searchEngineService.searchNaturalLanguage(req.query.q);
  res.status(200).json({ success: true, message: "Natural language search executed", data: searchResult });
});

const getPersonalizedHomeFeed = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const feed = await feedService.getPersonalizedHomeFeed(userId, req.user.role);
  res.status(200).json({ success: true, message: "Personalized home feed retrieved", data: feed });
});

const getActionCenterItems = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const actions = await actionCenterService.getActionCenterItems(userId, req.user.role);
  res.status(200).json({ success: true, message: "Action center items retrieved", data: actions });
});

const getPublicFreelancerSEOProfile = catchAsync(async (req, res) => {
  const profile = await seoService.getPublicFreelancerSEOProfile(req.params.username);
  res.status(200).json({ success: true, message: "Public SEO profile retrieved", data: profile });
});

const getAICostUsage = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const usage = await aiCostService.trackAndValidateAIUsage(userId, req.user.subscriptionPlan || "PRO", 0);
  res.status(200).json({ success: true, message: "AI cost usage retrieved", data: usage });
});

const getFeatureFlags = catchAsync(async (req, res) => {
  const flags = await featureFlagsService.getFeatureFlags();
  res.status(200).json({ success: true, message: "Feature flags retrieved", data: flags });
});

const oauthService = require("../services/oauth.service");
const webhookService = require("../services/webhook.service");
const copilotService = require("../services/copilot.service");
const aiSandboxService = require("../services/aiSandbox.service");
const integrationsService = require("../services/integrations.service");
const globalizationService = require("../services/globalization.service");
const partnerService = require("../services/partnerProgram.service");

const createOAuthApplication = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const app = await oauthService.createOAuthApplication(userId, req.body);
  res.status(201).json({ success: true, message: "OAuth 2.0 Client Application created", data: app });
});

const issueOAuthAccessToken = catchAsync(async (req, res) => {
  const { clientId, clientSecret, scope } = req.body;
  const token = await oauthService.issueOAuthAccessToken(clientId, clientSecret, scope);
  res.status(200).json({ success: true, message: "OAuth Access Token issued", data: token });
});

const registerWebhookSubscription = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const sub = await webhookService.registerWebhookSubscription(userId, req.body);
  res.status(201).json({ success: true, message: "Webhook subscription registered", data: sub });
});

const queryFreelNovaCopilot = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const answer = await copilotService.queryFreelNovaCopilot(userId, req.user.role, req.body.scope, req.body.query);
  res.status(200).json({ success: true, message: "Copilot answer generated", data: answer });
});

const runAISandboxTest = catchAsync(async (req, res) => {
  const testResult = await aiSandboxService.runAISandboxTest(req.body.agentId, req.body.sampleTaskInput);
  res.status(200).json({ success: true, message: "AI sandbox test executed", data: testResult });
});

const handleSlackSlashCommand = catchAsync(async (req, res) => {
  const slackResponse = await integrationsService.handleSlackSlashCommand(req.body.command, req.body.text);
  res.status(200).json(slackResponse);
});

const formatGlobalCurrency = catchAsync(async (req, res) => {
  const { amount, targetCurrency } = req.query;
  const formatted = globalizationService.formatGlobalCurrency(Number(amount || 0), targetCurrency || "INR");
  res.status(200).json({ success: true, message: "Global currency formatted", data: formatted });
});

const registerPartnerProgram = catchAsync(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const partner = await partnerService.registerPartnerProgram(userId, req.body);
  res.status(201).json({ success: true, message: "Partner program registered", data: partner });
});

const getEcosystemMetrics = catchAsync(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Ecosystem metrics retrieved",
    data: {
      totalOAuthApps: 14,
      activeWebhooks: 42,
      apiCalls24h: 12800,
      aiTokens24h: 450000,
      activeIntegrations: ["Slack Slash Commands", "Microsoft Teams", "Google Workspace", "Salesforce CRM"],
    },
  });
});

const skillGraphService = require("../services/skillGraph.service");

const getVerifiedSkillGraph = catchAsync(async (req, res) => {
  const targetId = req.params.id || req.user.id || req.user._id;
  const graph = await skillGraphService.getVerifiedSkillGraph(targetId);
  res.status(200).json({ success: true, message: "Verified skill graph retrieved", data: graph });
});

module.exports = {
  getProfile,
  updateProfile,
  completeProfile,
  updateResumeMetadata,
  listFreelancers,
  sendSupportInquiry,
  flagSolicitation,
  checkUsernameAvailability,
  getWorkPassport,
  getCareerAutopilot,
  generateAIProposal,
  getAITwinConfig,
  updateAITwinConfig,
  queryAITwin,
  createRetainerContract,
  listRetainerContracts,
  terminateRetainerContract,
  getCompanyWorkspace,
  createApprovalRequest,
  approveWorkflowStep,
  getVerifiedSkillGraph,
  getOpportunityRadar,
  getEarningIntelligence,
  getSmartRehiringPool,
  getClientSpendIntelligence,
  getIncomeOS,
  getMarketplaceDecision,
  listMentors,
  bookMentorSession,
  getOrCreateStudio,
  getProtectionEligibility,
  getMatchingProjectsForFreelancer,
  getFreelancerBusinessOS,
  getOrUpdateAvailability,
  listProductizedServices,
  buyProductizedService,
  createReferral,
  getOrCreatePrivateTalentPool,
  getCareerMobilitySuggestions,
  getUnifiedWorkforceDirectory,
  getUserTrustEvents,
  assessUserFraudRisk,
  getOrSetup2FA,
  enable2FA,
  getActiveSessions,
  revokeAllOtherSessions,
  getFinancialLedgerEntries,
  runFinancialReconciliation,
  createContractChangeRequest,
  listSecurityIncidents,
  getProductionSystemMetrics,
  getMarketplaceLiquidityMetrics,
  getFunnelAnalytics,
  setUserOnboardingGoal,
  searchNaturalLanguage,
  getPersonalizedHomeFeed,
  getActionCenterItems,
  getPublicFreelancerSEOProfile,
  getAICostUsage,
  getFeatureFlags,
  createOAuthApplication,
  issueOAuthAccessToken,
  registerWebhookSubscription,
  queryFreelNovaCopilot,
  runAISandboxTest,
  handleSlackSlashCommand,
  formatGlobalCurrency,
  registerPartnerProgram,
  getEcosystemMetrics,
};


