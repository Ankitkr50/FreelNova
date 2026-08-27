const jwt = require("jsonwebtoken");
const { prisma } = require("../config/db");
const ApiError = require("../utils/apiError");
const catchAsync = require("../utils/catchAsync");
const env = require("../config/env");
const { LRUCache } = require("../utils/cache");
const sessionService = require("../services/session.service");

/**
 * User identity cache.
 *
 * Why this matters at scale:
 *   Without cache: 10,000 concurrent users = up to 10,000 MongoDB reads/second
 *   just to verify "who is this person?" on every API request.
 *
 *   With a 60-second TTL cache: the same 10k users generate ~1 DB read per
 *   user per minute — a ~60× reduction in auth-related DB load.
 *
 * Invalidation: call `userCache.del(userId)` on logout or password change.
 * The cache is exported so controllers can call it directly.
 *
 * To scale beyond a single server: replace with Redis HSET/HGET.
 */
const userCache = new LRUCache({
  maxSize: 5_000, // Hold up to 5,000 users in memory simultaneously.
  ttlMs: 60_000,  // 60-second TTL — short enough to reflect bans/suspensions quickly.
});

// Purge expired cache entries every 2 minutes.
// Purge interval is not needed since Redis TTL expires naturally

const protect = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    throw new ApiError(401, "Authorization token is missing");
  }

  // Step 1: Verify JWT signature cryptographically (no DB, pure CPU).
  let decoded;
  try {
    decoded = jwt.verify(token, env.jwtAccessSecret);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new ApiError(401, "Access token expired");
    }
    throw new ApiError(401, `Invalid access token: ${error.message}`);
  }

  const userId = decoded.sub;

  // Step 2: Try cache before hitting PostgreSQL.
  let user = await userCache.get(userId);

  if (!user) {
    // Cache miss — fetch from DB and populate cache.
    user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new ApiError(401, "User not found in database");
    }
    delete user.password; // remove sensitive field before caching
    await userCache.set(userId, user);
  }

  // Guard: suspended/blocked users must be rejected even if cached.
  if (user.moderationStatus && user.moderationStatus !== "active") {
    // Evict from cache so subsequent requests re-check the DB.
    await userCache.del(userId);
    throw new ApiError(403, "Account suspended or blocked");
  }

  // Guard: suspended staff members must be rejected immediately
  if (user.role === "admin" && user.staffStatus === "SUSPENDED") {
    await userCache.del(userId);
    throw new ApiError(403, "Your Staff Account has been suspended. Please contact Super Admin for assistance.");
  }

  // Guard: Check if specific session was revoked
  if (user.role === "admin") {
    const sessionActive = await sessionService.isSessionActive(token);
    if (!sessionActive) {
      throw new ApiError(401, "Session has been revoked or expired");
    }
    sessionService.touchSession(token);
  }

  req.user = user;
  next();
});

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return next(new ApiError(403, "Insufficient permissions"));
  }
  return next();
};

/**
 * Ensures the user is an active Administrator or Staff member.
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new ApiError(403, "Access restricted to administrators"));
  }
  if (req.user.staffStatus && req.user.staffStatus !== "ACTIVE") {
    return next(new ApiError(403, `Staff access is ${req.user.staffStatus.toLowerCase()}`));
  }
  return next();
};

/**
 * Checks for a specific granular admin permission.
 * SUPER_ADMIN role (or legacy super admin) bypasses all permission checks.
 */
const requireAdminPermission = (...requiredPermissions) => (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new ApiError(403, "Access restricted to administrators"));
  }

  if (req.user.staffStatus && req.user.staffStatus !== "ACTIVE") {
    return next(new ApiError(403, `Staff access is ${req.user.staffStatus.toLowerCase()}`));
  }

  const isSuperAdmin =
    req.user.adminRole === "SUPER_ADMIN" ||
    (!req.user.adminRole && (req.user.email === "fn.freelnova@gmail.com" || req.user.role === "admin"));

  // Super Admin bypasses all granular permission checks
  if (isSuperAdmin) {
    return next();
  }

  const userPermissions = Array.isArray(req.user.adminPermissions) ? req.user.adminPermissions : [];

  // Check if user has at least one of the required permissions (OR logic for flexibility)
  const hasPermission = requiredPermissions.some((perm) => userPermissions.includes(perm));

  if (!hasPermission) {
    return next(
      new ApiError(
        403,
        `Forbidden: Missing required permission (${requiredPermissions.join(" or ")})`
      )
    );
  }

  return next();
};

const verifyProfileCompleted = (req, res, next) => {
  if (req.user && req.user.role !== "admin") {
    if (!req.user.profileCompleted) {
      return next(new ApiError(403, "Please complete your profile details (Student, Company, or Employee) first before starting projects"));
    }
  }
  return next();
};

module.exports = {
  protect,
  authorize,
  requireAdmin,
  requireAdminPermission,
  verifyProfileCompleted,
  userCache, // Exported so controllers can invalidate on logout / password change.
};


