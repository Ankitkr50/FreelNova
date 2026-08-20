const express = require("express");
const reviewController = require("../controllers/review.controller");
const { protect } = require("../middleware/auth.middleware");
const { validateReviewCreatePayload } = require("../middleware/validate.middleware");

const router = express.Router();

router.post("/", protect, validateReviewCreatePayload, reviewController.createReview);

module.exports = router;
