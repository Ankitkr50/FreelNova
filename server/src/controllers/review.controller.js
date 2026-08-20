const { prisma } = require("../config/db");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/apiError");

// Helper to validate UUIDs
const isValidUuid = (id) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

const createReview = catchAsync(async (req, res) => {
  const reviewerId = req.user.id || req.user._id;
  const { projectId, revieweeId, rating, comment } = req.validatedBody;

  if (!isValidUuid(projectId) || !isValidUuid(revieweeId)) {
    throw new ApiError(400, "Invalid id");
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      status: true,
      recruiterId: true,
      selectedFreelancer: true,
      title: true,
    },
  });

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  if (!["completed", "paid"].includes(project.status)) {
    throw new ApiError(400, "Reviews are allowed only after project completion");
  }

  if (!project.selectedFreelancer) {
    throw new ApiError(400, "Project has no selected freelancer");
  }

  const recruiterId = project.recruiterId;
  const freelancerId = project.selectedFreelancer;

  const isReviewerParticipant =
    reviewerId === recruiterId || reviewerId === freelancerId;
  if (!isReviewerParticipant) {
    throw new ApiError(403, "Only project participants can submit reviews");
  }

  const expectedRevieweeId = reviewerId === recruiterId ? freelancerId : recruiterId;
  if (revieweeId !== expectedRevieweeId) {
    throw new ApiError(400, "You can only review the other participant of this project");
  }

  if (reviewerId === revieweeId) {
    throw new ApiError(400, "You cannot review yourself");
  }

  const existingReview = await prisma.review.findUnique({
    where: {
      projectId_reviewerId: {
        projectId,
        reviewerId,
      },
    },
  });

  if (existingReview) {
    throw new ApiError(409, "You have already reviewed this project");
  }

  // Create Review in DB
  const review = await prisma.review.create({
    data: {
      projectId,
      reviewerId,
      revieweeId,
      rating,
      comment,
    },
  });

  // Aggregate user ratings
  const aggregations = await prisma.review.aggregate({
    _count: {
      rating: true,
    },
    _avg: {
      rating: true,
    },
    where: {
      revieweeId: revieweeId,
    },
  });

  const ratingAvg = aggregations._avg.rating || 0;
  const ratingCount = aggregations._count.rating || 0;

  // Update user profile with new rating aggregations
  await prisma.user.update({
    where: { id: revieweeId },
    data: {
      ratingAvg: Math.round(ratingAvg * 100) / 100,
      ratingCount: ratingCount,
    },
  });

  // Retrieve hydrated review details
  const hydratedReview = await prisma.review.findUnique({
    where: { id: review.id },
    select: {
      projectId: true,
      reviewerId: true,
      revieweeId: true,
      rating: true,
      comment: true,
      createdAt: true,
      reviewer: { select: { id: true, name: true, email: true, role: true } },
      reviewee: { select: { id: true, name: true, email: true, role: true, ratingAvg: true, ratingCount: true } },
    },
  });

  const mapped = {
    ...hydratedReview,
    reviewerId: hydratedReview.reviewer,
    revieweeId: hydratedReview.reviewee,
  };
  delete mapped.reviewer;
  delete mapped.reviewee;

  res.status(201).json({
    success: true,
    message: "Review submitted successfully",
    data: mapped,
  });
});

module.exports = {
  createReview,
};
