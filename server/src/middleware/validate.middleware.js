const ApiError = require("../utils/apiError");
const USER_ROLES = ["freelancer", "recruiter", "admin"];
const USER_MODERATION_STATUSES = ["active", "suspended", "blocked"];
const PROJECT_STATUSES = ["posted", "applied", "selected", "in_progress", "completed", "paid", "cancelled"];
const PROJECT_MODERATION_STATUSES = ["approved", "flagged", "removed"];
const PAYMENT_REVIEW_STATUSES = ["pending", "approved", "flagged"];
const DISPUTE_TYPES = ["milestone_delivery", "quality_of_work", "communication", "payment_issue", "other"];
const DISPUTE_STATUSES = ["open", "under_review", "resolved", "closed", "rejected"];
const DISPUTE_PRIORITIES = ["low", "medium", "high", "urgent"];

const isValidUuid = (id) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])[A-Za-z\d\S]{8,64}$/;
const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;
const PUBLIC_AUTH_ROLES = ["freelancer", "recruiter"];

const validateRequiredFields = (requiredFields) => (req, res, next) => {
  const missing = requiredFields.filter((field) => !req.body[field]);
  if (missing.length) {
    return next(new ApiError(400, "Validation failed", { missingFields: missing }));
  }
  return next();
};

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const validateRegisterPayload = (req, res, next) => {
  const errors = [];
  const name = String(req.body.name || "").trim();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");
  const role = String(req.body.role || "").trim().toLowerCase();

  if (!name || name.length < 2 || name.length > 80) {
    errors.push({ field: "name", message: "Name must be 2 to 80 characters" });
  }

  if (!EMAIL_REGEX.test(email)) {
    errors.push({ field: "email", message: "Invalid email format" });
  }

  if (!STRONG_PASSWORD_REGEX.test(password)) {
    errors.push({
      field: "password",
      message:
        "Password must be 8-64 chars with uppercase, lowercase, number, and special character",
    });
  }

  if (!PUBLIC_AUTH_ROLES.includes(role)) {
    errors.push({
      field: "role",
      message: `Role must be one of: ${PUBLIC_AUTH_ROLES.join(", ")}`,
    });
  }

  if (errors.length) {
    return next(new ApiError(400, "Validation failed", { errors }));
  }

  req.body.name = name;
  req.body.email = email;
  req.body.role = role;
  return next();
};

const validateLoginPayload = (req, res, next) => {
  const errors = [];
  const inputStr = String(req.body.email || req.body.identifier || req.body.username || "").trim();
  const password = String(req.body.password || "");

  if (!inputStr) {
    errors.push({ field: "email", message: "Email, Username, or User ID (FID) is required" });
  }

  if (!password) {
    errors.push({ field: "password", message: "Password is required" });
  }

  if (errors.length) {
    return next(new ApiError(400, "Validation failed", { errors }));
  }

  req.body.email = inputStr;
  return next();
};

const validateOtpPayload = (req, res, next) => {
  const errors = [];
  const email = normalizeEmail(req.body.email);
  const otp = String(req.body.otp || "").trim();

  if (!EMAIL_REGEX.test(email)) {
    errors.push({ field: "email", message: "Invalid email format" });
  }

  if (!otp || !/^\d{6}$/.test(otp)) {
    errors.push({ field: "otp", message: "OTP must be a 6-digit number" });
  }

  if (errors.length) {
    return next(new ApiError(400, "Validation failed", { errors }));
  }

  req.body.email = email;
  req.body.otp = otp;
  return next();
};

const validateResendOtpPayload = (req, res, next) => {
  const email = normalizeEmail(req.body.email);
  if (!EMAIL_REGEX.test(email)) {
    return next(
      new ApiError(400, "Validation failed", {
        errors: [{ field: "email", message: "Invalid email format" }],
      })
    );
  }
  req.body.email = email;
  return next();
};


const validateRefreshTokenPayload = (req, res, next) => {
  const refreshToken = String(req.body.refreshToken || "").trim();
  if (!refreshToken) {
    return next(
      new ApiError(400, "Validation failed", {
        errors: [{ field: "refreshToken", message: "Refresh token is required" }],
      })
    );
  }
  req.body.refreshToken = refreshToken;
  return next();
};

const validateGoogleAuthPayload = (req, res, next) => {
  const errors = [];
  const credential = String(req.body.credential || "").trim();
  const role = req.body.role !== undefined ? String(req.body.role || "").trim().toLowerCase() : "";
  const isRegister = req.body.isRegister === true || req.body.isRegister === "true";

  if (!credential) {
    errors.push({ field: "credential", message: "Google credential is required" });
  }

  const allowedRoles = ["freelancer", "recruiter", "admin"];
  if (role && !allowedRoles.includes(role)) {
    errors.push({
      field: "role",
      message: `Role must be one of: ${allowedRoles.join(", ")}`,
    });
  }

  if (errors.length) {
    return next(new ApiError(400, "Validation failed", { errors }));
  }

  req.validatedBody = {
    credential,
    role: role || "freelancer",
    isRegister,
  };
  req.body.isRegister = isRegister;
  return next();
};

const validateUserProfileUpdatePayload = (req, res, next) => {
  const errors = [];
  const payload = {};

  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim();
    if (name.length < 2 || name.length > 80) {
      errors.push({ field: "name", message: "Name must be 2 to 80 characters" });
    } else {
      payload.name = name;
    }
  }

  if (req.body.username !== undefined) {
    const username = String(req.body.username).trim().toLowerCase();
    if (!/^[a-z0-9_-]{3,30}$/.test(username)) {
      errors.push({ field: "username", message: "Username must be 3-30 characters, lowercase, alphanumeric, underscore or hyphen" });
    } else {
      payload.username = username;
    }
  }

  if (req.body.bio !== undefined) {
    const bio = String(req.body.bio).trim();
    if (bio.length > 1000) {
      errors.push({ field: "bio", message: "Bio must be at most 1000 characters" });
    } else {
      payload.bio = bio;
    }
  }

  if (req.body.headline !== undefined) {
    const headline = String(req.body.headline).trim();
    if (headline.length > 200) {
      errors.push({ field: "headline", message: "Headline must be at most 200 characters" });
    } else {
      payload.headline = headline;
    }
  }

  if (req.body.location !== undefined) {
    const location = String(req.body.location).trim();
    if (location.length > 200) {
      errors.push({ field: "location", message: "Location must be at most 200 characters" });
    } else {
      payload.location = location;
    }
  }

  if (req.body.education !== undefined) {
    const education = String(req.body.education).trim();
    if (education.length > 300) {
      errors.push({ field: "education", message: "Education must be at most 300 characters" });
    } else {
      payload.education = education;
    }
  }

  if (req.body.experienceYears !== undefined) {
    const experienceYears = Number(req.body.experienceYears);
    if (!Number.isFinite(experienceYears) || experienceYears < 0 || experienceYears > 50) {
      errors.push({
        field: "experienceYears",
        message: "Experience years must be between 0 and 50",
      });
    } else {
      payload.experienceYears = experienceYears;
    }
  }

  if (req.body.experience !== undefined) {
    const experience = String(req.body.experience).trim();
    if (experience.length > 2000) {
      errors.push({
        field: "experience",
        message: "Experience must be at most 2000 characters",
      });
    } else {
      payload.experience = experience;
    }
  }

  if (req.body.skills !== undefined) {
    if (!Array.isArray(req.body.skills)) {
      errors.push({ field: "skills", message: "Skills must be an array of strings" });
    } else {
      const normalizedSkills = req.body.skills
        .map((skill) => String(skill).trim())
        .filter(Boolean)
        .slice(0, 50);
      payload.skills = normalizedSkills;
    }
  }

  if (req.body.portfolioLinks !== undefined) {
    if (!Array.isArray(req.body.portfolioLinks)) {
      errors.push({
        field: "portfolioLinks",
        message: "Portfolio links must be an array of URLs",
      });
    } else {
      const links = req.body.portfolioLinks
        .map((link) => String(link).trim())
        .filter(Boolean)
        .slice(0, 20);

      const hasInvalid = links.some(
        (link) => !link.startsWith("http://") && !link.startsWith("https://")
      );
      if (hasInvalid) {
        errors.push({
          field: "portfolioLinks",
          message: "Each portfolio link must start with http:// or https://",
        });
      } else {
        payload.portfolioLinks = links;
      }
    }
  }

  if (req.body.hourlyRate !== undefined) {
    const hourlyRate = Number(req.body.hourlyRate);
    if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
      errors.push({ field: "hourlyRate", message: "Hourly rate must be a non-negative number" });
    } else {
      payload.hourlyRate = hourlyRate;
    }
  }

  if (req.body.workExperience !== undefined) {
    if (!Array.isArray(req.body.workExperience)) {
      errors.push({ field: "workExperience", message: "Work experience must be an array" });
    } else {
      payload.workExperience = req.body.workExperience;
    }
  }

  if (req.body.portfolioItems !== undefined) {
    if (!Array.isArray(req.body.portfolioItems)) {
      errors.push({ field: "portfolioItems", message: "Portfolio items must be an array" });
    } else {
      payload.portfolioItems = req.body.portfolioItems;
    }
  }

  if (req.body.bankAccountNo !== undefined) {
    const bankAccountNo = String(req.body.bankAccountNo).trim();
    if (bankAccountNo.length > 30) {
      errors.push({ field: "bankAccountNo", message: "Bank account number must be at most 30 characters" });
    } else {
      payload.bankAccountNo = bankAccountNo || null;
    }
  }

  if (req.body.bankIfsc !== undefined) {
    const bankIfsc = String(req.body.bankIfsc).trim();
    if (bankIfsc.length > 20) {
      errors.push({ field: "bankIfsc", message: "IFSC code must be at most 20 characters" });
    } else {
      payload.bankIfsc = bankIfsc || null;
    }
  }

  if (req.body.bankName !== undefined) {
    const bankName = String(req.body.bankName).trim();
    if (bankName.length > 100) {
      errors.push({ field: "bankName", message: "Bank name must be at most 100 characters" });
    } else {
      payload.bankName = bankName || null;
    }
  }

  if (req.body.bankHolderName !== undefined) {
    const bankHolderName = String(req.body.bankHolderName).trim();
    if (bankHolderName.length > 100) {
      errors.push({ field: "bankHolderName", message: "Account holder name must be at most 100 characters" });
    } else {
      payload.bankHolderName = bankHolderName || null;
    }
  }

  if (req.body.upiId !== undefined) {
    const upiId = String(req.body.upiId).trim();
    if (upiId.length > 100) {
      errors.push({ field: "upiId", message: "UPI ID must be at most 100 characters" });
    } else {
      payload.upiId = upiId || null;
    }
  }

  if (req.body.category !== undefined) {
    const category = String(req.body.category).trim();
    if (category.length > 50) {
      errors.push({ field: "category", message: "Category must be at most 50 characters" });
    } else {
      payload.category = category || null;
    }
  }

  if (req.body.phone !== undefined) {
    const phone = String(req.body.phone).trim();
    if (phone.length > 20) {
      errors.push({ field: "phone", message: "Phone number must be at most 20 characters" });
    } else {
      payload.phone = phone || null;
    }
  }

  if (req.body.aadhaarCard !== undefined) {
    const aadhaarCard = String(req.body.aadhaarCard).trim();
    if (aadhaarCard.length > 20) {
      errors.push({ field: "aadhaarCard", message: "Aadhaar Card must be at most 20 characters" });
    } else {
      payload.aadhaarCard = aadhaarCard || null;
    }
  }

  if (req.body.aadhaarCardPhoto !== undefined) {
    const aadhaarCardPhoto = String(req.body.aadhaarCardPhoto).trim();
    if (aadhaarCardPhoto.length > 1000) {
      errors.push({ field: "aadhaarCardPhoto", message: "Aadhaar Photo URL must be at most 1000 characters" });
    } else {
      payload.aadhaarCardPhoto = aadhaarCardPhoto || null;
    }
  }

  if (req.body.panCard !== undefined) {
    const panCard = String(req.body.panCard).trim();
    if (panCard.length > 20) {
      errors.push({ field: "panCard", message: "PAN Card must be at most 20 characters" });
    } else {
      payload.panCard = panCard || null;
    }
  }

  if (req.body.companyName !== undefined) {
    const companyName = String(req.body.companyName).trim();
    if (companyName.length > 255) {
      errors.push({ field: "companyName", message: "Company Name must be at most 255 characters" });
    } else {
      payload.companyName = companyName || null;
    }
  }

  if (req.body.companyId !== undefined) {
    const companyId = String(req.body.companyId).trim();
    if (companyId.length > 100) {
      errors.push({ field: "companyId", message: "Company ID must be at most 100 characters" });
    } else {
      payload.companyId = companyId || null;
    }
  }

  if (req.body.schoolIdCard !== undefined) {
    const schoolIdCard = String(req.body.schoolIdCard).trim();
    if (schoolIdCard.length > 500) {
      errors.push({ field: "schoolIdCard", message: "Verification Drive Link must be at most 500 characters" });
    } else {
      payload.schoolIdCard = schoolIdCard || null;
    }
  }

  if (errors.length) {
    return next(new ApiError(400, "Validation failed", { errors }));
  }

  req.validatedBody = payload;
  return next();
};

const validateResumeMetadataPayload = (req, res, next) => {
  const errors = [];
  const resumeUrl = String(req.body.resumeUrl || "").trim();
  const resumeName = String(req.body.resumeName || "").trim();
  const resumeMimeType = String(req.body.resumeMimeType || "").trim().toLowerCase();
  const resumePublicId = String(req.body.resumePublicId || "").trim();
  const resumeSize = Number(req.body.resumeSize);

  if (!resumeUrl || (!resumeUrl.startsWith("http://") && !resumeUrl.startsWith("https://"))) {
    errors.push({ field: "resumeUrl", message: "Resume URL is required and must be a valid URL" });
  }

  if (!resumeName || resumeName.length > 255) {
    errors.push({ field: "resumeName", message: "Resume name is required and max length is 255" });
  }

  if (resumeMimeType !== "application/pdf") {
    errors.push({ field: "resumeMimeType", message: "Only PDF resumes are allowed" });
  }

  if (!Number.isFinite(resumeSize) || resumeSize <= 0 || resumeSize > MAX_RESUME_SIZE_BYTES) {
    errors.push({
      field: "resumeSize",
      message: `Resume size must be between 1 byte and ${MAX_RESUME_SIZE_BYTES} bytes`,
    });
  }

  if (resumePublicId && resumePublicId.length > 255) {
    errors.push({ field: "resumePublicId", message: "Resume public id must be at most 255 chars" });
  }

  if (errors.length) {
    return next(new ApiError(400, "Validation failed", { errors }));
  }

  req.validatedBody = {
    resumeUrl,
    resumeName,
    resumeMimeType,
    resumeSize,
    resumePublicId,
    resumeUploadedAt: new Date(),
  };
  return next();
};

const validateProjectCreatePayload = (req, res, next) => {
  const errors = [];
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim();
  const category = String(req.body.category || "").trim();
  const currency = String(req.body.currency || "INR").trim().toUpperCase();
  const timelineDays = Number(req.body.timelineDays);
  const budgetMin = Number(req.body.budgetMin);
  const budgetMax = Number(req.body.budgetMax);
  const deadline = new Date(req.body.deadline);
  const status = String(req.body.status || "posted").trim().toLowerCase();

  if (title.length < 5 || title.length > 120) {
    errors.push({ field: "title", message: "Title must be 5 to 120 characters" });
  }

  if (description.length < 20 || description.length > 5000) {
    errors.push({
      field: "description",
      message: "Description must be 20 to 5000 characters",
    });
  }

  if (!category || category.length > 80) {
    errors.push({
      field: "category",
      message: "Category is required and max length is 80",
    });
  }

  if (!Array.isArray(req.body.skills) || req.body.skills.length === 0) {
    errors.push({ field: "skills", message: "At least one skill is required" });
  }

  const skills = Array.isArray(req.body.skills)
    ? req.body.skills.map((skill) => String(skill).trim()).filter(Boolean).slice(0, 50)
    : [];

  if (!Number.isFinite(budgetMin) || budgetMin < 1) {
    errors.push({ field: "budgetMin", message: "Budget min must be at least 1" });
  }

  if (!Number.isFinite(budgetMax) || budgetMax < 1) {
    errors.push({ field: "budgetMax", message: "Budget max must be at least 1" });
  }

  if (Number.isFinite(budgetMin) && Number.isFinite(budgetMax) && budgetMin > budgetMax) {
    errors.push({
      field: "budgetMin",
      message: "Budget min cannot be greater than budget max",
    });
  }

  if (!Number.isFinite(timelineDays) || timelineDays < 1 || timelineDays > 3650) {
    errors.push({ field: "timelineDays", message: "Timeline days must be between 1 and 3650" });
  }

  if (Number.isNaN(deadline.getTime())) {
    errors.push({ field: "deadline", message: "Deadline must be a valid date" });
  } else if (deadline <= new Date()) {
    errors.push({ field: "deadline", message: "Deadline must be in the future" });
  }

  if (!PROJECT_STATUSES.includes(status)) {
    errors.push({
      field: "status",
      message: `Status must be one of: ${PROJECT_STATUSES.join(", ")}`,
    });
  }

  if (errors.length) {
    return next(new ApiError(400, "Validation failed", { errors }));
  }

  req.validatedBody = {
    title,
    description,
    category,
    skills,
    budgetMin,
    budgetMax,
    currency: currency || "INR",
    timelineDays,
    deadline,
    status,
  };
  return next();
};

const validateProjectApplyPayload = (req, res, next) => {
  const errors = [];
  const proposal = String(req.body.proposal || "").trim();
  const bidAmount = Number(req.body.bidAmount);
  const deliveryDays = Number(req.body.deliveryDays);

  if (proposal.length < 20 || proposal.length > 3000) {
    errors.push({
      field: "proposal",
      message: "Proposal must be 20 to 3000 characters",
    });
  }

  if (!Number.isFinite(bidAmount) || bidAmount < 1) {
    errors.push({ field: "bidAmount", message: "Bid amount must be at least 1" });
  }

  if (!Number.isFinite(deliveryDays) || deliveryDays < 1 || deliveryDays > 3650) {
    errors.push({
      field: "deliveryDays",
      message: "Delivery days must be between 1 and 3650",
    });
  }

  if (errors.length) {
    return next(new ApiError(400, "Validation failed", { errors }));
  }

  req.validatedBody = { proposal, bidAmount, deliveryDays };
  return next();
};

const validateProjectSelectionPayload = (req, res, next) => {
  const errors = [];
  const applicationId = req.body.applicationId ? String(req.body.applicationId).trim() : "";
  const freelancerId = req.body.freelancerId ? String(req.body.freelancerId).trim() : "";
  const startNow = Boolean(req.body.startNow);

  if (!applicationId && !freelancerId) {
    errors.push({
      field: "selection",
      message: "Either applicationId or freelancerId is required",
    });
  }

  if (applicationId && !isValidUuid(applicationId)) {
    errors.push({ field: "applicationId", message: "Invalid applicationId" });
  }

  if (freelancerId && !isValidUuid(freelancerId)) {
    errors.push({ field: "freelancerId", message: "Invalid freelancerId" });
  }

  if (errors.length) {
    return next(new ApiError(400, "Validation failed", { errors }));
  }

  req.validatedBody = { applicationId, freelancerId, startNow };
  return next();
};

const validateProjectReviewApplicantPayload = (req, res, next) => {
  const errors = [];
  const action = String(req.body.action || "").trim().toLowerCase();
  const allowed = ["shortlisted", "rejected", "selected"];

  if (!allowed.includes(action)) {
    errors.push({ field: "action", message: `action must be one of: ${allowed.join(", ")}` });
  }

  if (errors.length) {
    return next(new ApiError(400, "Validation failed", { errors }));
  }

  req.validatedBody = { action };
  return next();
};

const validateProjectStatusUpdatePayload = (req, res, next) => {
  const errors = [];
  const status = String(req.body.status || "").trim().toLowerCase();
  const allowed = ["posted", "applied", "selected", "in_progress", "completed", "paid", "cancelled"];

  if (!allowed.includes(status)) {
    errors.push({ field: "status", message: `status must be one of: ${allowed.join(", ")}` });
  }

  if (errors.length) {
    return next(new ApiError(400, "Validation failed", { errors }));
  }

  req.validatedBody = { status };
  return next();
};

const validateReviewCreatePayload = (req, res, next) => {
  const errors = [];
  const projectId = req.body.projectId ? String(req.body.projectId).trim() : "";
  const revieweeId = req.body.revieweeId ? String(req.body.revieweeId).trim() : "";
  const rating = Number(req.body.rating);
  const comment = String(req.body.comment || "").trim();

  if (!projectId || !isValidUuid(projectId)) {
    errors.push({ field: "projectId", message: "Valid projectId is required" });
  }

  if (!revieweeId || !isValidUuid(revieweeId)) {
    errors.push({ field: "revieweeId", message: "Valid revieweeId is required" });
  }

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    errors.push({ field: "rating", message: "Rating must be between 1 and 5" });
  }

  if (comment.length < 3 || comment.length > 2000) {
    errors.push({ field: "comment", message: "Comment must be 3 to 2000 characters" });
  }

  if (errors.length) {
    return next(new ApiError(400, "Validation failed", { errors }));
  }

  req.validatedBody = {
    projectId,
    revieweeId,
    rating,
    comment,
  };
  return next();
};

const validatePaymentCreatePayload = (req, res, next) => {
  const errors = [];
  const projectId = req.body.projectId ? String(req.body.projectId).trim() : "";
  const amount = Number(req.body.amount);
  const currency = String(req.body.currency || "INR").trim().toUpperCase();
  const idempotencyKeyInput =
    req.headers["x-idempotency-key"] || req.body.idempotencyKey || "";
  const idempotencyKey = String(idempotencyKeyInput).trim();

  if (!projectId || !isValidUuid(projectId)) {
    errors.push({ field: "projectId", message: "Valid projectId is required" });
  }

  if (!Number.isFinite(amount) || amount < 1) {
    errors.push({ field: "amount", message: "Amount must be at least 1" });
  }

  if (!currency || currency.length > 10) {
    errors.push({ field: "currency", message: "Invalid currency" });
  }

  if (!idempotencyKey) {
    errors.push({
      field: "idempotencyKey",
      message: "idempotencyKey (or x-idempotency-key header) is required",
    });
  } else if (idempotencyKey.length < 8 || idempotencyKey.length > 120) {
    errors.push({
      field: "idempotencyKey",
      message: "Idempotency key must be between 8 and 120 characters",
    });
  }

  if (errors.length) {
    return next(new ApiError(400, "Validation failed", { errors }));
  }

  req.validatedBody = {
    projectId,
    amount,
    currency,
    idempotencyKey,
  };
  return next();
};

const validatePaymentReleasePayload = (req, res, next) => {
  const errors = [];
  const paymentId = req.body.paymentId ? String(req.body.paymentId).trim() : "";
  const forceRelease = Boolean(req.body.forceRelease);
  const releaseNote = String(req.body.releaseNote || "").trim();

  if (!paymentId || !isValidUuid(paymentId)) {
    errors.push({ field: "paymentId", message: "Valid paymentId is required" });
  }

  if (releaseNote.length > 500) {
    errors.push({ field: "releaseNote", message: "Release note must be at most 500 characters" });
  }

  if (errors.length) {
    return next(new ApiError(400, "Validation failed", { errors }));
  }

  req.validatedBody = {
    paymentId,
    forceRelease,
    releaseNote,
  };
  return next();
};

const validatePaymentRefundPayload = (req, res, next) => {
  const errors = [];
  const paymentId = req.body.paymentId ? String(req.body.paymentId).trim() : "";
  const reason = String(req.body.reason || "").trim();
  const refundAmountInput = req.body.refundAmount !== undefined ? Number(req.body.refundAmount) : null;

  if (!paymentId || !isValidUuid(paymentId)) {
    errors.push({ field: "paymentId", message: "Valid paymentId is required" });
  }

  if (reason.length > 500) {
    errors.push({ field: "reason", message: "Reason must be at most 500 characters" });
  }

  if (refundAmountInput !== null && (!Number.isFinite(refundAmountInput) || refundAmountInput < 1)) {
    errors.push({ field: "refundAmount", message: "refundAmount must be a positive number" });
  }

  if (errors.length) {
    return next(new ApiError(400, "Validation failed", { errors }));
  }

  req.validatedBody = {
    paymentId,
    reason,
    refundAmount: refundAmountInput,
  };
  return next();
};

const validatePaymentVerifyPayload = (req, res, next) => {
  const errors = [];
  const razorpayOrderId = String(req.body.razorpayOrderId || "").trim();
  const razorpayPaymentId = String(req.body.razorpayPaymentId || "").trim();
  const razorpaySignature = String(req.body.razorpaySignature || "").trim();

  if (!razorpayOrderId) {
    errors.push({ field: "razorpayOrderId", message: "razorpayOrderId is required" });
  }

  if (!razorpayPaymentId) {
    errors.push({ field: "razorpayPaymentId", message: "razorpayPaymentId is required" });
  }

  if (!razorpaySignature) {
    errors.push({ field: "razorpaySignature", message: "razorpaySignature is required" });
  }

  if (errors.length) {
    return next(new ApiError(400, "Validation failed", { errors }));
  }

  req.validatedBody = { razorpayOrderId, razorpayPaymentId, razorpaySignature };
  return next();
};

const validateAdminUserStatusPayload = (req, res, next) => {
  const errors = [];
  const moderationStatus = req.body.moderationStatus !== undefined ? String(req.body.moderationStatus).trim().toLowerCase() : undefined;
  const moderationNote = req.body.moderationNote !== undefined ? String(req.body.moderationNote).trim() : "";

  if (moderationStatus !== undefined && !USER_MODERATION_STATUSES.includes(moderationStatus)) {
    errors.push({
      field: "moderationStatus",
      message: `moderationStatus must be one of: ${USER_MODERATION_STATUSES.join(", ")}`,
    });
  }

  if (moderationNote.length > 500) {
    errors.push({ field: "moderationNote", message: "moderationNote must be at most 500 chars" });
  }

  if (errors.length) {
    return next(new ApiError(400, "Validation failed", { errors }));
  }

  const payload = {};
  if (moderationStatus !== undefined) payload.moderationStatus = moderationStatus;
  if (req.body.moderationNote !== undefined) payload.moderationNote = moderationNote;
  if (req.body.isVerified !== undefined) payload.isVerified = Boolean(req.body.isVerified);

  req.validatedBody = payload;
  return next();
};

const validateAdminProjectModerationPayload = (req, res, next) => {
  const errors = [];
  const moderationStatus = String(req.body.moderationStatus || "").trim().toLowerCase();
  const moderationNote = String(req.body.moderationNote || "").trim();

  if (!PROJECT_MODERATION_STATUSES.includes(moderationStatus)) {
    errors.push({
      field: "moderationStatus",
      message: `moderationStatus must be one of: ${PROJECT_MODERATION_STATUSES.join(", ")}`,
    });
  }

  if (moderationNote.length > 500) {
    errors.push({ field: "moderationNote", message: "moderationNote must be at most 500 chars" });
  }

  if (errors.length) {
    return next(new ApiError(400, "Validation failed", { errors }));
  }

  req.validatedBody = { moderationStatus, moderationNote };
  return next();
};

const validateAdminPaymentReviewPayload = (req, res, next) => {
  const errors = [];
  const reviewStatus = String(req.body.reviewStatus || "").trim().toLowerCase();
  const reviewNote = String(req.body.reviewNote || "").trim();

  if (!PAYMENT_REVIEW_STATUSES.includes(reviewStatus)) {
    errors.push({
      field: "reviewStatus",
      message: `reviewStatus must be one of: ${PAYMENT_REVIEW_STATUSES.join(", ")}`,
    });
  }

  if (reviewNote.length > 500) {
    errors.push({ field: "reviewNote", message: "reviewNote must be at most 500 chars" });
  }

  if (errors.length) {
    return next(new ApiError(400, "Validation failed", { errors }));
  }

  req.validatedBody = { reviewStatus, reviewNote };
  return next();
};

const validateAdminDisputeCreatePayload = (req, res, next) => {
  const errors = [];
  const projectId = req.body.projectId ? String(req.body.projectId).trim() : "";
  const paymentId = req.body.paymentId ? String(req.body.paymentId).trim() : "";
  const raisedBy = req.body.raisedBy ? String(req.body.raisedBy).trim() : "";
  const againstUserId = req.body.againstUserId ? String(req.body.againstUserId).trim() : "";
  const type = String(req.body.type || "").trim().toLowerCase();
  const reason = String(req.body.reason || "").trim();
  const priority = String(req.body.priority || "medium").trim().toLowerCase();

  if (!projectId || !isValidUuid(projectId)) {
    errors.push({ field: "projectId", message: "Valid projectId is required" });
  }

  if (paymentId && !isValidUuid(paymentId)) {
    errors.push({ field: "paymentId", message: "Invalid paymentId" });
  }

  if (raisedBy && !isValidUuid(raisedBy)) {
    errors.push({ field: "raisedBy", message: "Invalid raisedBy" });
  }

  if (againstUserId && !isValidUuid(againstUserId)) {
    errors.push({ field: "againstUserId", message: "Invalid againstUserId" });
  }

  if (!DISPUTE_TYPES.includes(type)) {
    errors.push({ field: "type", message: `type must be one of: ${DISPUTE_TYPES.join(", ")}` });
  }

  if (reason.length < 5 || reason.length > 3000) {
    errors.push({ field: "reason", message: "reason must be 5 to 3000 characters" });
  }

  if (!DISPUTE_PRIORITIES.includes(priority)) {
    errors.push({
      field: "priority",
      message: `priority must be one of: ${DISPUTE_PRIORITIES.join(", ")}`,
    });
  }

  if (errors.length) {
    return next(new ApiError(400, "Validation failed", { errors }));
  }

  req.validatedBody = {
    projectId,
    paymentId: paymentId || null,
    raisedBy: raisedBy || null,
    againstUserId: againstUserId || null,
    type,
    reason,
    priority,
  };
  return next();
};

const validateAdminDisputePatchPayload = (req, res, next) => {
  const errors = [];
  const status = req.body.status !== undefined ? String(req.body.status).trim().toLowerCase() : "";
  const priority =
    req.body.priority !== undefined ? String(req.body.priority).trim().toLowerCase() : "";
  const resolutionNote = String(req.body.resolutionNote || "").trim();
  const assignedAdminId = req.body.assignedAdminId ? String(req.body.assignedAdminId).trim() : "";

  if (!status && !priority && !resolutionNote && !assignedAdminId) {
    errors.push({ field: "body", message: "At least one field is required to update dispute" });
  }

  if (status && !DISPUTE_STATUSES.includes(status)) {
    errors.push({
      field: "status",
      message: `status must be one of: ${DISPUTE_STATUSES.join(", ")}`,
    });
  }

  if (priority && !DISPUTE_PRIORITIES.includes(priority)) {
    errors.push({
      field: "priority",
      message: `priority must be one of: ${DISPUTE_PRIORITIES.join(", ")}`,
    });
  }

  if (resolutionNote.length > 2000) {
    errors.push({
      field: "resolutionNote",
      message: "resolutionNote must be at most 2000 chars",
    });
  }

  if (assignedAdminId && !isValidUuid(assignedAdminId)) {
    errors.push({ field: "assignedAdminId", message: "Invalid assignedAdminId" });
  }

  if (errors.length) {
    return next(new ApiError(400, "Validation failed", { errors }));
  }

  req.validatedBody = {
    status: status || null,
    priority: priority || null,
    resolutionNote: resolutionNote || "",
    assignedAdminId: assignedAdminId || null,
  };
  return next();
};

const validateProfileCompletionPayload = (req, res, next) => {
  const errors = [];
  const {
    category,
    phone,
    isInternational,
    aadhaarCard,
    aadhaarCardPhoto,
    panCard,
    bankAccountNo,
    bankIfsc,
    bankName,
    passportOrNationalId,
    passportPhoto,
    taxIdNumber,
    swiftBic,
    ibanAccountNo,
    timezone,
    schoolOrCollege,
    schoolResult,
    schoolIdCard,
    companyName,
    companyId,
    username,
    upiId,
  } = req.body;

  const validCategories = ["student", "company", "employee"];
  if (!category || !validCategories.includes(category)) {
    errors.push({ field: "category", message: "Invalid or missing category. Must be student, company, or employee." });
    return next(new ApiError(400, "Validation failed", { errors }));
  }

  const cleanPhone = String(phone || "").trim();
  const cleanIsInternational = !!isInternational;
  const cleanBankName = String(bankName || "").trim();

  const payload = {
    category,
    isInternational: cleanIsInternational,
    timezone: String(timezone || "UTC").trim(),
  };

  if (username === undefined || String(username).trim() === "") {
    errors.push({ field: "username", message: "Username is required." });
  } else {
    const cleanUsername = String(username).trim().toLowerCase();
    if (!/^[a-z0-9_-]{3,30}$/.test(cleanUsername)) {
      errors.push({ field: "username", message: "Username must be 3-30 characters, lowercase, alphanumeric, underscore or hyphen." });
    } else {
      payload.username = cleanUsername;
    }
  }

  if (!cleanBankName || cleanBankName.length > 100) {
    errors.push({ field: "bankName", message: "Bank Name is required and must be under 100 characters." });
  }
  payload.bankName = cleanBankName;

  if (cleanIsInternational) {
    // Validate International Phone Format
    if (!cleanPhone || !/^\+?[1-9]\d{1,14}$/.test(cleanPhone)) {
      errors.push({ field: "phone", message: "Phone number must be a valid international number with country code (e.g. +14155552671)." });
    }
    payload.phone = cleanPhone;

    // Validate International Documents
    const cleanPassport = String(passportOrNationalId || "").trim();
    if (!cleanPassport || cleanPassport.length < 5 || cleanPassport.length > 50) {
      errors.push({ field: "passportOrNationalId", message: "Passport or National ID is required (5 to 50 characters)." });
    }
    payload.passportOrNationalId = cleanPassport;

    const cleanPassportPhoto = String(passportPhoto || "").trim();
    if (!cleanPassportPhoto || (!cleanPassportPhoto.startsWith("http://") && !cleanPassportPhoto.startsWith("https://"))) {
      errors.push({ field: "passportPhoto", message: "Passport Photo is required and must be a valid URL." });
    }
    payload.passportPhoto = cleanPassportPhoto;

    const cleanTaxId = String(taxIdNumber || "").trim().toUpperCase();
    if (!cleanTaxId || cleanTaxId.length < 4 || cleanTaxId.length > 50) {
      errors.push({ field: "taxIdNumber", message: "Tax ID Number or SSN is required." });
    }
    payload.taxIdNumber = cleanTaxId;

    const cleanSwift = String(swiftBic || "").trim().toUpperCase();
    if (!cleanSwift || !/^[A-Z0-9]{8,11}$/.test(cleanSwift)) {
      errors.push({ field: "swiftBic", message: "SWIFT/BIC Code must be a valid 8 or 11 character alphanumeric code." });
    }
    payload.swiftBic = cleanSwift;

    const cleanIban = String(ibanAccountNo || "").trim().toUpperCase();
    if (!cleanIban || cleanIban.length < 15 || cleanIban.length > 34) {
      errors.push({ field: "ibanAccountNo", message: "IBAN Bank Account number must be between 15 and 34 characters." });
    }
    payload.ibanAccountNo = cleanIban;
  } else {
    // Validate Domestic Indian Phone Format
    if (!cleanPhone || !/^\d{10}$/.test(cleanPhone)) {
      errors.push({ field: "phone", message: "Phone number must be a valid 10-digit number." });
    }
    payload.phone = cleanPhone;

    // Validate Domestic Indian Documents
    const cleanAadhaar = String(aadhaarCard || "").trim();
    if (!cleanAadhaar || !/^\d{12}$/.test(cleanAadhaar)) {
      errors.push({ field: "aadhaarCard", message: "Aadhaar Card number must be a valid 12-digit number." });
    }
    payload.aadhaarCard = cleanAadhaar;

    const cleanAadhaarPhoto = String(aadhaarCardPhoto || "").trim();
    if (!cleanAadhaarPhoto || (!cleanAadhaarPhoto.startsWith("http://") && !cleanAadhaarPhoto.startsWith("https://"))) {
      errors.push({ field: "aadhaarCardPhoto", message: "Aadhaar Card Photo is required and must be a valid URL." });
    }
    payload.aadhaarCardPhoto = cleanAadhaarPhoto;

    const cleanPan = String(panCard || "").trim().toUpperCase();
    if (!cleanPan || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      errors.push({ field: "panCard", message: "PAN Card must be a valid 10-character alphanumeric PAN format." });
    }
    payload.panCard = cleanPan;

    const cleanBankAcc = String(bankAccountNo || "").trim();
    if (!cleanBankAcc || !/^\d{9,18}$/.test(cleanBankAcc)) {
      errors.push({ field: "bankAccountNo", message: "Bank Account Number must be between 9 and 18 digits." });
    }
    payload.bankAccountNo = cleanBankAcc;

    const cleanBankIfsc = String(bankIfsc || "").trim().toUpperCase();
    if (!cleanBankIfsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanBankIfsc)) {
      errors.push({ field: "bankIfsc", message: "Bank IFSC code must be a valid 11-character code (e.g. SBIN0001234)." });
    }
    payload.bankIfsc = cleanBankIfsc;

    const cleanUpi = String(upiId || "").trim();
    if (!cleanUpi) {
      errors.push({ field: "upiId", message: "UPI ID is required." });
    } else if (!/^[a-zA-Z0-9.\-_]{3,256}@[a-zA-Z]{2,64}$/.test(cleanUpi)) {
      errors.push({ field: "upiId", message: "UPI ID must be a valid format (e.g. user@bank)." });
    }
    payload.upiId = cleanUpi;
  }

  // Validate category-specific fields
  if (category === "student") {
    const cleanSchool = String(schoolOrCollege || "").trim();
    if (!cleanSchool || cleanSchool.length > 255) {
      errors.push({ field: "schoolOrCollege", message: "School or college name is required (max 255 characters)." });
    }
    const cleanResult = String(schoolResult || "").trim();
    if (!cleanResult || cleanResult.length > 100) {
      errors.push({ field: "schoolResult", message: "School result is required (max 100 characters)." });
    }
    const cleanIdCard = String(schoolIdCard || "").trim();
    if (!cleanIdCard || cleanIdCard.length > 500) {
      errors.push({ field: "schoolIdCard", message: "School ID Card details are required (max 500 characters)." });
    }
    payload.schoolOrCollege = cleanSchool;
    payload.schoolResult = cleanResult;
    payload.schoolIdCard = cleanIdCard;
  } else if (category === "company") {
    const cleanCompanyName = String(companyName || "").trim();
    if (!cleanCompanyName || cleanCompanyName.length > 255) {
      errors.push({ field: "companyName", message: "Company Name is required (max 255 characters)." });
    }
    const cleanCompanyId = String(companyId || "").trim();
    if (!cleanCompanyId || cleanCompanyId.length > 100) {
      errors.push({ field: "companyId", message: "Company ID is required (max 100 characters)." });
    }
    payload.companyName = cleanCompanyName;
    payload.companyId = cleanCompanyId;
  } else if (category === "employee") {
    const cleanCompanyName = String(companyName || "").trim();
    if (!cleanCompanyName || cleanCompanyName.length > 255) {
      errors.push({ field: "companyName", message: "Company Name (Employer name) is required (max 255 characters)." });
    }
    const cleanCompanyId = String(companyId || "").trim();
    if (!cleanCompanyId || cleanCompanyId.length > 100) {
      errors.push({ field: "companyId", message: "Company ID is required (max 100 characters)." });
    }
    const cleanIdCard = String(schoolIdCard || "").trim();
    if (!cleanIdCard || cleanIdCard.length > 500) {
      errors.push({ field: "schoolIdCard", message: "Employee ID Card Photo Link is required." });
    }
    payload.companyName = cleanCompanyName;
    payload.companyId = cleanCompanyId;
    payload.schoolIdCard = cleanIdCard;
  }

  if (errors.length) {
    return next(new ApiError(400, "Validation failed", { errors }));
  }

  req.validatedBody = payload;
  return next();
};

module.exports = {
  validateRequiredFields,
  validateRegisterPayload,
  validateLoginPayload,
  validateOtpPayload,
  validateResendOtpPayload,
  validateRefreshTokenPayload,
  validateGoogleAuthPayload,
  validateUserProfileUpdatePayload,
  validateResumeMetadataPayload,
  validateProjectCreatePayload,
  validateProjectApplyPayload,
  validateProjectSelectionPayload,
  validateProjectReviewApplicantPayload,
  validateProjectStatusUpdatePayload,
  validateReviewCreatePayload,
  validatePaymentCreatePayload,
  validatePaymentReleasePayload,
  validatePaymentRefundPayload,
  validatePaymentVerifyPayload,
  validateAdminUserStatusPayload,
  validateAdminProjectModerationPayload,
  validateAdminPaymentReviewPayload,
  validateAdminDisputeCreatePayload,
  validateAdminDisputePatchPayload,
  validateProfileCompletionPayload,
};
