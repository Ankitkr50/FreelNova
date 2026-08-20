const express = require("express");
const { protect, authorize } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/me", protect, (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      isEmailVerified: req.user.isEmailVerified,
    },
  });
});

router.get("/admin", protect, authorize("admin"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Admin access granted",
  });
});

router.get("/recruiter", protect, authorize("recruiter"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Recruiter access granted",
  });
});

router.get("/freelancer", protect, authorize("freelancer"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Freelancer access granted",
  });
});

module.exports = router;
