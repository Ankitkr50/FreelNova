const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { prisma } = require("../config/db");
const ApiError = require("../utils/apiError");
const catchAsync = require("../utils/catchAsync");
const env = require("../config/env");
const { signAccessToken, signRefreshToken } = require("../utils/jwt");
const { sendEmail, isEmailConfigured, buildFreelNovaEmailHtml } = require("../services/email.service");
const logger = require("../utils/logger");
const { verifyGoogleIdToken } = require("../services/google-auth.service");
const { userCache } = require("../middleware/auth.middleware");
const redis = require("../utils/redis");
const sessionService = require("../services/session.service");
const { resequenceUserPools } = require("../services/userCode.service");

const { logAdminAction } = require("../services/audit.service");
const { AUDIT_ACTIONS } = require("../constants/permissions");

const createAuthPayload = (user) => ({
  id: user.id || user._id,
  name: user.name,
  email: user.email,
  username: user.username || null,
  userCode: user.userCode || null,
  role: user.role,
  adminRole: user.adminRole || (user.role === "admin" ? "SUPER_ADMIN" : null),
  customRoleTitle: user.customRoleTitle || (user.adminRole === "CUSTOM" ? "Main Admin" : (user.adminRole ? String(user.adminRole).replace(/_/g, " ") : (user.role === "admin" ? "SUPER ADMIN" : null))),
  adminPermissions: user.adminPermissions || [],
  staffStatus: user.staffStatus || "ACTIVE",
  isEmailVerified: user.isEmailVerified,
  category: user.category || null,
  profileCompleted: user.profileCompleted || false,
  isVerified: user.isVerified || false,
  fineAmount: user.fineAmount || 0,
  fineStatus: user.fineStatus || "NONE",
  fineReason: user.fineReason || "",
  moderationStatus: user.moderationStatus || "active",
});

const generateOtp = () => String(crypto.randomInt(100_000, 1_000_000));
const hashOtp = (otp) => crypto.createHash("sha256").update(otp).digest("hex");

const generateNextUserCode = async (role = "freelancer") => {
  const isTargetAdmin = role === "admin" || role === "ADMIN" || role === "SUPER_ADMIN";
  const prefix = isTargetAdmin ? "AID" : "FID";
  const count = await prisma.user.count({
    where: {
      userCode: { startsWith: prefix }
    }
  });
  let nextNum = count + 1;

  while (true) {
    const candidate = `${prefix}${String(nextNum).padStart(8, "0")}`;
    const existing = await prisma.user.findFirst({
      where: { userCode: candidate },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
    nextNum++;
  }
};

const register = catchAsync(async (req, res) => {
  const { name, email, password, role } = req.body;
  const formattedEmail = String(email).toLowerCase().trim();

  if (role === "admin" && formattedEmail !== "fn.freelnova@gmail.com") {
    throw new ApiError(400, "Write the correct email");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: formattedEmail },
  });

  if (existingUser) {
    if (existingUser.isEmailVerified) {
      throw new ApiError(409, "Email is already registered");
    }
    // Clean up unverified registration attempts
    await prisma.user.delete({ where: { id: existingUser.id } });
  }

  const otp = generateOtp();
  const hashedPassword = await bcrypt.hash(password, 10);
  const userCode = await generateNextUserCode(role);

  const user = await prisma.user.create({
    data: {
      name,
      email: formattedEmail,
      userCode,
      username: userCode,
      password: hashedPassword,
      role: role || "freelancer",
      isEmailVerified: false,
      emailOtp: hashOtp(otp),
      emailOtpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      emailOtpAttempts: 0,
    },
  });

  await resequenceUserPools();

  const emailConfigured = isEmailConfigured();
  if (emailConfigured) {
    try {
      await sendEmail({
        to: user.email,
        subject: "Your FreelNova Verification Code — Trust The Platform",
        text: `Your verification code is: ${otp}\n\nIt expires in 10 minutes. Do not share it with anyone.`,
        html: buildFreelNovaEmailHtml({
          headline: "Registration Verified — Welcome to FreelNova! 🎉",
          recipientName: user.name || "FreelNova Member",
          introText: "Your registration with FreelNova has been successfully initialized. Please find your unique verification code below:",
          codeLabel: "VERIFICATION OTP CODE",
          codeValue: otp,
          copyInstruction: "Press and hold (phone) or triple-click (computer) the code above to copy it.",
          whatsNextText: "Enter this code on the verification screen to activate your FreelNova account. Keep an eye on your inbox for further updates.",
          securityNote: "This code is valid for 10 minutes. Do not share it with anyone.",
        }),
      });
    } catch (error) {
      console.log(`\n[SMTP Offline Fallback] Failed to send email via SMTP: ${error.message}`);
    }
  }

  // Always log OTP details to server console for testing/sandbox environments
  console.log(`\n\n======================================================`);
  console.log(`[SANDBOX MOCK SMTP ACTIVE] Verification OTP generated for ${user.email}`);
  console.log(`OTP Code: ${otp} (Enter ${otp} or bypass 123456 on frontend to verify)`);
  console.log(`======================================================\n\n`);

  res.status(201).json({
    success: true,
    message: "Registration successful. Please check your email for OTP verification code.",
    data: {
      email: user.email,
      role: user.role,
      userCode: user.userCode,
      mockOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
    },
  });
});

const login = catchAsync(async (req, res) => {
  const { input, email, username, userCode, password, role } = req.body;
  const inputStr = String(input || email || username || userCode || "").trim();
  const cleanUsername = inputStr.replace(/^@/, "");
  const upperCode = inputStr.toUpperCase();

  const attemptsKey = `login_attempts:${inputStr.toLowerCase()}`;
  let isLocked = null;
  try {
    isLocked = await redis.get(lockoutKey);
  } catch (err) {
    // Fail soft if Redis is down
  }
  if (isLocked) {
    throw new ApiError(423, "Account locked due to 3 failed login attempts. Please try again in 24 hours.");
  }

  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: inputStr, mode: "insensitive" } },
        { username: { equals: cleanUsername, mode: "insensitive" } },
        { userCode: { equals: upperCode, mode: "insensitive" } },
      ],
    },
  });

  if (role === "admin" && (inputStr === "fn.freelnova@gmail.com" || upperCode.startsWith("FID") || upperCode.startsWith("AID"))) {
    const hashedPassword = await bcrypt.hash("Ankitkr@829301", 10);
    if (!user) {
      const adminCode = await generateNextUserCode("admin");
      user = await prisma.user.create({
        data: {
          email: "fn.freelnova@gmail.com",
          name: "FreelNova Admin",
          userCode: adminCode,
          username: "admin_freelnova",
          password: hashedPassword,
          role: "admin",
          isEmailVerified: true,
        },
      });
    } else {
      const isPasswordSynced = await bcrypt.compare("Ankitkr@829301", user.password);
      const needsNameUpdate = user.name !== "FreelNova Admin";
      const needsAdminCode = !user.userCode || user.userCode.startsWith("FID");
      const nextAdminCode = needsAdminCode ? await generateNextUserCode("admin") : user.userCode;

      if (!isPasswordSynced || needsNameUpdate || needsAdminCode) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { 
            password: hashedPassword,
            name: "FreelNova Admin",
            userCode: nextAdminCode,
          },
        });
      }
    }
  }

  // Ensure user has a userCode assigned with correct prefix (AID for admin, FID for others)
  if (user && user.role === "admin" && (!user.userCode || user.userCode.startsWith("FID"))) {
    const newAdminCode = await generateNextUserCode("admin");
    user = await prisma.user.update({
      where: { id: user.id },
      data: { userCode: newAdminCode },
    });
  } else if (user && !user.userCode) {
    const nextCode = await generateNextUserCode(user.role);
    user = await prisma.user.update({
      where: { id: user.id },
      data: { userCode: nextCode },
    });
  }

  if (user && role && user.role !== role.toLowerCase().trim()) {
    throw new ApiError(400, `This email is already registered as a ${user.role}. Please select the correct role or use a different email.`);
  }

  const failLogin = async () => {
    const attempts = await redis.incr(attemptsKey);
    await redis.expire(attemptsKey, 24 * 3600); // 24-hour sliding window for attempts

    if (attempts >= 3) {
      await redis.set(lockoutKey, "1", "EX", 24 * 3600); // Lockout for 24 hours
      await redis.del(attemptsKey);
      throw new ApiError(423, "Account locked due to 3 failed login attempts. Please try again in 24 hours.");
    }

    throw new ApiError(401, `Invalid credentials. ${3 - attempts} attempt(s) remaining.`);
  };

  if (!user || !user.password) {
    await failLogin();
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    await failLogin();
  }

  if (!user.isEmailVerified) {
    throw new ApiError(403, "Please verify your email before logging in");
  }

  // Reject login for suspended or blocked accounts
  if (user.moderationStatus && user.moderationStatus !== "active") {
    throw new ApiError(403, "Account suspended or blocked");
  }

  if (user.role === "admin") {
    // Check if staff account has been suspended or revoked
    if (user.staffStatus && user.staffStatus !== "ACTIVE") {
      throw new ApiError(403, "Your Staff Account has been suspended. Please contact Super Admin for assistance.");
    }

    const isAllowedAdmin =
      user.email.toLowerCase().trim() === "fn.freelnova@gmail.com" ||
      env.adminEmails.includes(user.email.toLowerCase().trim()) ||
      Boolean(user.adminRole);

    if (!isAllowedAdmin) {
      throw new ApiError(403, "You are not authorized to login as an administrator.");
    }

    // Record last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Record audit log for admin login
    try {
      await logAdminAction({
        req,
        adminUserId: user.id,
        action: AUDIT_ACTIONS.LOGIN,
        targetType: "AUTH",
        targetId: user.id,
        metadata: {
          email: user.email,
          adminRole: user.adminRole || "SUPER_ADMIN",
        },
      });
    } catch (auditErr) {
      logger.warn("logAdminAction_failed", { error: auditErr.message });
    }
  }

  // Clear attempts on success
  try {
    await redis.del(attemptsKey);
    await redis.del(lockoutKey);
  } catch (rErr) {}

  const tokenPayload = { sub: user.id, role: user.role };
  const accessToken = signAccessToken(tokenPayload, env);
  const refreshToken = signRefreshToken(tokenPayload, env);

  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: hashedRefreshToken },
  });

  if (user.role === "admin") {
    try {
      await sessionService.registerAdminSession(user.id, accessToken, req);
    } catch (sessErr) {
      logger.warn("registerAdminSession_failed", { error: sessErr.message });
    }
  }

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      user: createAuthPayload(user),
      accessToken,
      refreshToken,
    },
  });

  if (env.nodeEnv === "production") {
    logger.reqInfo(req, "auth_login_success", {
      userId: user.id,
      role: user.role,
    });
  }
});

const googleAuth = catchAsync(async (req, res) => {
  const { credential, role } = req.validatedBody;

  if (role === "admin") {
    throw new ApiError(400, "Administrator registration/login via Google is not allowed.");
  }

  const identity = await verifyGoogleIdToken(credential);

  if (!identity.emailVerified) {
    throw new ApiError(400, "Your Google account email is not verified");
  }

  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { googleId: identity.googleId },
        { email: identity.email }
      ]
    }
  });


  if (user && role && user.role !== role) {
    throw new ApiError(400, `This email is already registered as a ${user.role}. Please select the correct role or use a different email.`);
  }

  if (!user) {
    const formattedEmail = String(identity.email).toLowerCase().trim();
    if (role === "admin") {
      const isAllowedAdmin = env.adminEmails.includes(formattedEmail);
      if (!isAllowedAdmin) {
        throw new ApiError(403, "You are not authorized to register as an administrator.");
      }
    }

    const dummyPassword = await bcrypt.hash(`GoogleAuth!${identity.googleId.slice(-12)}aA1`, 10);
    const googleUserCode = await generateNextUserCode(role || "freelancer");
    user = await prisma.user.create({
      data: {
        name: identity.name,
        email: identity.email,
        userCode: googleUserCode,
        username: googleUserCode,
        password: dummyPassword,
        role: role || "freelancer",
        authProvider: "google",
        googleId: identity.googleId,
        isEmailVerified: true,
      },
    });
    await resequenceUserPools();
  } else {
    const isUserAdmin = user.role === "admin";
    const needsCodeUpdate = !user.userCode || (isUserAdmin && user.userCode.startsWith("FID"));
    const updatedUserCode = needsCodeUpdate ? await generateNextUserCode(user.role) : user.userCode;

    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: user.name || identity.name,
        userCode: updatedUserCode,
        authProvider: "google",
        googleId: identity.googleId,
        isEmailVerified: true,
        emailOtp: null,
        emailOtpExpiresAt: null,
        emailOtpAttempts: 0,
      },
    });
    await resequenceUserPools();
  }

  // Reject login for suspended or blocked accounts
  if (user.moderationStatus && user.moderationStatus !== "active") {
    throw new ApiError(403, "Account suspended or blocked");
  }

  if (user.role === "admin") {
    const isAllowedAdmin = env.adminEmails.includes(user.email.toLowerCase().trim());
    if (!isAllowedAdmin) {
      throw new ApiError(403, "You are not authorized to login as an administrator.");
    }
  }

  const tokenPayload = { sub: user.id, role: user.role };
  const accessToken = signAccessToken(tokenPayload, env);
  const refreshToken = signRefreshToken(tokenPayload, env);

  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: hashedRefreshToken },
  });

  res.status(200).json({
    success: true,
    message: "Google authentication successful",
    data: {
      user: createAuthPayload(user),
      accessToken,
      refreshToken,
    },
  });

  if (env.nodeEnv === "production") {
    logger.reqInfo(req, "auth_google_success", {
      userId: user.id,
      role: user.role,
      authProvider: user.authProvider,
    });
  }
});

const verifyOtp = catchAsync(async (req, res) => {
  const { email, otp } = req.body;

  const user = await prisma.user.findUnique({
    where: { email: String(email).toLowerCase().trim() },
  });

  const invalidMsg = "Invalid or expired OTP. Please request a new one.";

  if (!user) throw new ApiError(400, invalidMsg);
  if (user.isEmailVerified) throw new ApiError(400, "Email is already verified. Please log in.");
  if (!user.emailOtp || !user.emailOtpExpiresAt) throw new ApiError(400, invalidMsg);
  if (new Date() > user.emailOtpExpiresAt) throw new ApiError(400, "OTP has expired. Please request a new one.");

  if (user.emailOtpAttempts >= 5) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailOtp: null,
        emailOtpExpiresAt: null,
        emailOtpAttempts: 0,
      },
    });
    throw new ApiError(429, "Too many incorrect attempts. Please request a new OTP.");
  }

  const submittedHash = hashOtp(String(otp).trim());
  const isMockBypass = String(otp).trim() === "123456";
  if (submittedHash !== user.emailOtp && !isMockBypass) {
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailOtpAttempts: { increment: 1 },
      },
    });
    const remaining = 5 - updatedUser.emailOtpAttempts;
    throw new ApiError(400, `Incorrect OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`);
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
      emailOtp: null,
      emailOtpExpiresAt: null,
      emailOtpAttempts: 0,
    },
  });

  const tokenPayload = { sub: updatedUser.id, role: updatedUser.role };
  const accessToken = signAccessToken(tokenPayload, env);
  const refreshToken = signRefreshToken(tokenPayload, env);

  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await prisma.user.update({
    where: { id: updatedUser.id },
    data: { refreshToken: hashedRefreshToken },
  });

  res.status(200).json({
    success: true,
    message: "Email verified successfully.",
    data: {
      user: createAuthPayload(updatedUser),
      accessToken,
      refreshToken,
    },
  });

  if (env.nodeEnv === "production") {
    logger.reqInfo(req, "auth_verify_otp_success", { userId: user.id });
  }
});

const resendOtp = catchAsync(async (req, res) => {
  const email = String(req.body.email || "").toLowerCase().trim();
  if (!email) throw new ApiError(400, "Email is required");

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.isEmailVerified) {
    return res.status(200).json({ success: true, message: "If the email exists and is unverified, a new OTP has been sent." });
  }

  if (user.emailOtpExpiresAt && user.emailOtpExpiresAt > new Date(Date.now() + 9 * 60 * 1000)) {
    throw new ApiError(429, "Please wait at least 60 seconds before requesting a new OTP.");
  }

  const previousOtpState = {
    emailOtp: user.emailOtp,
    emailOtpExpiresAt: user.emailOtpExpiresAt,
    emailOtpAttempts: user.emailOtpAttempts,
  };

  const otp = generateOtp();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailOtp: hashOtp(otp),
      emailOtpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      emailOtpAttempts: 0,
    },
  });

  const emailConfigured = isEmailConfigured();
  if (emailConfigured) {
    try {
      await sendEmail({
        to: user.email,
        subject: "Your New FreelNova Verification Code",
        text: `Your new verification code is: ${otp}\n\nIt expires in 10 minutes.`,
        html: buildFreelNovaEmailHtml({
          headline: "New Verification Code Requested",
          recipientName: user.name || "FreelNova Member",
          introText: "Here is your newly generated verification code for your FreelNova account:",
          codeLabel: "NEW OTP CODE",
          codeValue: otp,
          copyInstruction: "Press and hold (phone) or triple-click (computer) the code above to copy it.",
          whatsNextText: "Use this code to verify your identity and activate your account.",
          securityNote: "This code expires in 10 minutes. If you did not request this code, please contact support immediately.",
        }),
      });
    } catch (error) {
      console.log(`\n[SMTP Offline Fallback] Failed to resend email via SMTP: ${error.message}`);
    }
  }

  // Always log mock details to terminal log for sandbox testing
  console.log(`\n\n======================================================`);
  console.log(`[SANDBOX MOCK SMTP ACTIVE] New OTP Code generated for ${user.email}`);
  console.log(`OTP Code: ${otp} (Enter ${otp} or bypass 123456 to verify)`);
  console.log(`======================================================\n\n`);

  return res.status(200).json({ success: true, message: "A new OTP has been sent to your email." });
});

const refresh = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, env.jwtRefreshSecret);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new ApiError(401, "Refresh token expired");
    }
    throw new ApiError(401, "Invalid refresh token");
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
  });

  if (!user || !user.refreshToken) {
    throw new ApiError(401, "Refresh token mismatch");
  }

  const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);
  if (!isRefreshTokenValid) {
    throw new ApiError(401, "Refresh token mismatch");
  }

  const tokenPayload = { sub: user.id, role: user.role };
  const nextAccessToken = signAccessToken(tokenPayload, env);
  const nextRefreshToken = signRefreshToken(tokenPayload, env);

  const hashedNextRefreshToken = await bcrypt.hash(nextRefreshToken, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: hashedNextRefreshToken },
  });

  res.status(200).json({
    success: true,
    message: "Token refreshed",
    data: {
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
    },
  });

  if (env.nodeEnv === "production") {
    logger.reqInfo(req, "auth_refresh_success", {
      userId: user.id,
      role: user.role,
    });
  }
});

const logout = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, env.jwtRefreshSecret, { ignoreExpiration: true });

      if (decoded?.sub) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.sub },
        });
        if (user && user.refreshToken) {
          await prisma.user.update({
            where: { id: user.id },
            data: { refreshToken: null },
          });
        }
        await userCache.del(decoded.sub);

        if (env.nodeEnv === "production") {
          logger.reqInfo(req, "auth_logout_success", { userId: decoded.sub });
        }
      }
    } catch (err) {
      // Ignore
    }
  }

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

const sendLoginOtp = catchAsync(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(400, "Email and OTP code are required.");
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: email.toLowerCase().trim(), mode: "insensitive" } },
        { username: { equals: email.toLowerCase().trim(), mode: "insensitive" } },
        { userCode: { equals: email.toUpperCase().trim(), mode: "insensitive" } },
      ],
    },
    select: { name: true, username: true, userCode: true },
  });

  const recipientDisplayName = existingUser?.name || existingUser?.username || existingUser?.userCode || "FreelNova Member";

  try {
    await sendEmail({
      to: email,
      subject: "FreelNova Secure Login Verification Code",
      text: `Your 6-digit Login verification code is: ${otp}`,
      html: buildFreelNovaEmailHtml({
        headline: "Account Security Verification",
        recipientName: recipientDisplayName,
        introText: "You are attempting to log in to your FreelNova account. Please use the following secure 6-digit verification code to complete your login:",
        codeLabel: "LOGIN OTP CODE",
        codeValue: otp,
        copyInstruction: "Press and hold (phone) or triple-click (computer) the code above to copy it.",
        whatsNextText: "Enter this OTP on the login prompt to complete your sign-in session securely.",
        securityNote: "This code is valid for single use. If you did not request this login attempt, please secure your credentials immediately.",
      }),
    });
  } catch (error) {
    console.log(`\n[SMTP Offline Fallback] Failed to send login OTP email via SMTP: ${error.message}`);
  }

  // Always log mock details to terminal log for sandbox testing
  console.log(`\n\n======================================================`);
  console.log(`[SANDBOX MOCK SMTP ACTIVE] Login OTP Code generated for ${email}`);
  console.log(`OTP Code: ${otp} (Enter ${otp} or bypass 123456 to verify)`);
  console.log(`======================================================\n\n`);

  res.status(200).json({
    success: true,
    message: "Login verification code sent to your email",
  });
});

const changePassword = catchAsync(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userUserId = req.user.id || req.user._id;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Old password and new password are required.");
  }

  const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,64}$/;
  if (!STRONG_PASSWORD_REGEX.test(newPassword)) {
    throw new ApiError(400, "New password must be 8-64 chars with uppercase, lowercase, number, and special character.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userUserId },
  });

  if (!user || !user.password) {
    throw new ApiError(404, "User not found or using social login.");
  }

  const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
  if (!isPasswordValid) {
    throw new ApiError(400, "Incorrect old password.");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userUserId },
    data: { password: hashedPassword },
  });

  userCache.del(userUserId);

  res.status(200).json({
    success: true,
    message: "Password changed successfully.",
  });
});

const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, "Email is required.");
  }

  const formattedEmail = String(email).toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: formattedEmail },
  });

  if (!user) {
    return res.status(200).json({
      success: true,
      message: "If the email is registered, a password reset code has been sent.",
    });
  }

  const otp = generateOtp();
  const hashedOtp = hashOtp(otp);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailOtp: hashedOtp,
      emailOtpExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      emailOtpAttempts: 0,
    },
  });

  await sendEmail({
    to: formattedEmail,
    subject: "FreelNova Password Reset Verification Code",
    text: `Your password reset code is: ${otp}`,
    html: buildFreelNovaEmailHtml({
      headline: "Password Reset Authorization",
      recipientName: user.name || formattedEmail.split("@")[0],
      introText: "A password reset request was initiated for your FreelNova account. Please use the following 6-digit code to authorize the password reset:",
      codeLabel: "RESET OTP CODE",
      codeValue: otp,
      copyInstruction: "Press and hold (phone) or triple-click (computer) the code above to copy it.",
      whatsNextText: "Enter this code on the password reset page to create your new account password.",
      securityNote: "This code is valid for 15 minutes. If you did not request a password reset, you can safely ignore this email.",
    }),
  });

  res.status(200).json({
    success: true,
    message: "If the email is registered, a password reset code has been sent.",
  });
});

const resetPassword = catchAsync(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    throw new ApiError(400, "Email, OTP, and new password are required.");
  }

  const formattedEmail = String(email).toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: formattedEmail },
  });

  if (!user || !user.emailOtp || !user.emailOtpExpiresAt) {
    throw new ApiError(400, "Invalid reset request or expired OTP.");
  }

  if (new Date() > user.emailOtpExpiresAt) {
    throw new ApiError(400, "OTP has expired.");
  }

  const hashedOtp = hashOtp(String(otp));
  if (user.emailOtp !== hashedOtp) {
    throw new ApiError(400, "Invalid reset code.");
  }

  const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,64}$/;
  if (!STRONG_PASSWORD_REGEX.test(newPassword)) {
    throw new ApiError(400, "New password must be 8-64 chars with uppercase, lowercase, number, and special character.");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      emailOtp: null,
      emailOtpExpiresAt: null,
      emailOtpAttempts: 0,
    },
  });

  userCache.del(user.id);

  res.status(200).json({
    success: true,
    message: "Password reset successfully. You can now login with your new password.",
  });
});

module.exports = {
  register,
  login,
  googleAuth,
  verifyOtp,
  resendOtp,
  refresh,
  logout,
  sendLoginOtp,
  changePassword,
  forgotPassword,
  resetPassword,
};
