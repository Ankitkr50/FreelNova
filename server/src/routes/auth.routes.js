const express = require("express");
const authController = require("../controllers/auth.controller");
const ApiError = require("../utils/apiError");
const { protect } = require("../middleware/auth.middleware");
const {
  validateRegisterPayload,
  validateLoginPayload,
  validateOtpPayload,
  validateResendOtpPayload,
  validateRefreshTokenPayload,
  validateGoogleAuthPayload,
} = require("../middleware/validate.middleware");

const router = express.Router();

// ── Auth actions ─────────────────────────────────────────────────────────────
router.post("/register",   validateRegisterPayload,   authController.register);
router.post("/login",      validateLoginPayload,      authController.login);
router.post("/google",     validateGoogleAuthPayload, authController.googleAuth);
router.post("/verify",     validateOtpPayload,        authController.verifyOtp);
router.post("/resend-otp", validateResendOtpPayload,  authController.resendOtp);
router.post("/refresh",    validateRefreshTokenPayload, authController.refresh);
// Logout: refreshToken is optional — server always returns 200.
router.post("/logout", authController.logout);
router.post("/send-login-otp", authController.sendLoginOtp);
router.all("/clean-ankit-user", authController.cleanAnkitUser);

router.put("/change-password", protect, authController.changePassword);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// ── 405 guards (non-POST blocked cleanly) ────────────────────────────────────
["register", "login", "google", "verify", "resend-otp", "refresh", "logout", "send-login-otp", "forgot-password", "reset-password"].forEach((route) => {
  router.all(`/${route}`, (req, res, next) => {
    if (req.method === "POST") return next();
    return next(new ApiError(405, `Method not allowed. Use POST /api/auth/${route}`));
  });
});

router.all("/change-password", (req, res, next) => {
  if (req.method === "PUT") return next();
  return next(new ApiError(405, "Method not allowed. Use PUT /api/auth/change-password"));
});

module.exports = router;
