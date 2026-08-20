-- CreateEnum
CREATE TYPE "Role" AS ENUM ('freelancer', 'recruiter', 'admin');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('active', 'suspended', 'blocked');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('posted', 'applied', 'selected', 'in_progress', 'completed', 'paid', 'cancelled');

-- CreateEnum
CREATE TYPE "ProjectModerationStatus" AS ENUM ('approved', 'flagged', 'removed');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('submitted', 'shortlisted', 'rejected', 'selected', 'withdrawn');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('created', 'authorized', 'captured', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('pending', 'held_in_escrow', 'released', 'disputed', 'refunded');

-- CreateEnum
CREATE TYPE "PaymentReviewStatus" AS ENUM ('pending', 'approved', 'flagged', 'rejected');

-- CreateEnum
CREATE TYPE "DisputeType" AS ENUM ('payment', 'quality', 'timeline', 'communication', 'other');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('open', 'in_review', 'resolved', 'rejected', 'closed');

-- CreateEnum
CREATE TYPE "DisputePriority" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('pro_monthly', 'pro_yearly');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('created', 'active', 'cancelled', 'expired', 'failed', 'refunded');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'freelancer',
    "authProvider" VARCHAR(50) NOT NULL DEFAULT 'local',
    "googleId" VARCHAR(255),
    "bio" TEXT NOT NULL DEFAULT '',
    "headline" VARCHAR(200) NOT NULL DEFAULT '',
    "location" VARCHAR(200) NOT NULL DEFAULT '',
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experienceYears" INTEGER NOT NULL DEFAULT 0,
    "education" VARCHAR(300) NOT NULL DEFAULT '',
    "experience" TEXT NOT NULL DEFAULT '',
    "portfolioLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resumeUrl" VARCHAR(1000) NOT NULL DEFAULT '',
    "resumeName" VARCHAR(255) NOT NULL DEFAULT '',
    "resumeMimeType" VARCHAR(100) NOT NULL DEFAULT '',
    "resumeSize" INTEGER NOT NULL DEFAULT 0,
    "resumePublicId" VARCHAR(255) NOT NULL DEFAULT '',
    "resumeUploadedAt" TIMESTAMPTZ,
    "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'active',
    "moderationNote" VARCHAR(500) NOT NULL DEFAULT '',
    "moderatedBy" UUID,
    "moderatedAt" TIMESTAMPTZ,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailOtp" VARCHAR(256),
    "emailOtpExpiresAt" TIMESTAMPTZ,
    "emailOtpAttempts" INTEGER NOT NULL DEFAULT 0,
    "refreshToken" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "budgetMin" DOUBLE PRECISION NOT NULL,
    "budgetMax" DOUBLE PRECISION NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "timelineDays" INTEGER NOT NULL,
    "deadline" TIMESTAMPTZ NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'posted',
    "recruiterId" UUID NOT NULL,
    "selectedFreelancer" UUID,
    "applicationCount" INTEGER NOT NULL DEFAULT 0,
    "moderationStatus" "ProjectModerationStatus" NOT NULL DEFAULT 'approved',
    "moderationNote" VARCHAR(500) NOT NULL DEFAULT '',
    "moderatedBy" UUID,
    "moderatedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "freelancerId" UUID NOT NULL,
    "recruiterId" UUID NOT NULL,
    "proposal" TEXT NOT NULL,
    "bidAmount" DOUBLE PRECISION NOT NULL,
    "deliveryDays" INTEGER NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'submitted',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "recruiterId" UUID NOT NULL,
    "freelancerId" UUID NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "gatewayOrderId" VARCHAR(255) NOT NULL,
    "gatewayReceipt" VARCHAR(255) NOT NULL DEFAULT '',
    "gatewayPaymentId" VARCHAR(255) NOT NULL DEFAULT '',
    "idempotencyKey" VARCHAR(255) NOT NULL DEFAULT '',
    "status" "PaymentStatus" NOT NULL DEFAULT 'created',
    "escrowStatus" "EscrowStatus" NOT NULL DEFAULT 'pending',
    "reviewStatus" "PaymentReviewStatus" NOT NULL DEFAULT 'pending',
    "reviewNote" VARCHAR(500) NOT NULL DEFAULT '',
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTimeline" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "event" VARCHAR(120) NOT NULL,
    "status" VARCHAR(60) NOT NULL DEFAULT '',
    "note" VARCHAR(500) NOT NULL DEFAULT '',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "eventId" VARCHAR(255) NOT NULL,
    "eventType" VARCHAR(255) NOT NULL,
    "payloadHash" VARCHAR(255) NOT NULL,
    "processedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gatewayOrderId" VARCHAR(255) NOT NULL DEFAULT '',
    "gatewayPaymentId" VARCHAR(255) NOT NULL DEFAULT '',
    "signature" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "paymentId" UUID,
    "raisedBy" UUID NOT NULL,
    "againstUserId" UUID,
    "type" "DisputeType" NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'open',
    "priority" "DisputePriority" NOT NULL DEFAULT 'medium',
    "resolutionNote" VARCHAR(2000) NOT NULL DEFAULT '',
    "assignedAdminId" UUID,
    "resolvedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputeTimeline" (
    "id" UUID NOT NULL,
    "disputeId" UUID NOT NULL,
    "event" VARCHAR(120) NOT NULL,
    "note" VARCHAR(500) NOT NULL DEFAULT '',
    "actorId" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "recipientId" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "message" VARCHAR(1000) NOT NULL,
    "entityType" VARCHAR(50) NOT NULL DEFAULT '',
    "entityId" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "reviewerId" UUID NOT NULL,
    "revieweeId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'created',
    "gatewayOrderId" VARCHAR(255) NOT NULL,
    "gatewayPaymentId" VARCHAR(255) NOT NULL DEFAULT '',
    "gatewaySignature" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" VARCHAR(255) NOT NULL DEFAULT '',
    "expiresAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionTimeline" (
    "id" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "event" VARCHAR(120) NOT NULL,
    "status" VARCHAR(60) NOT NULL DEFAULT '',
    "note" VARCHAR(500) NOT NULL DEFAULT '',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_authProvider_idx" ON "User"("authProvider");

-- CreateIndex
CREATE INDEX "User_moderationStatus_idx" ON "User"("moderationStatus");

-- CreateIndex
CREATE INDEX "Project_category_idx" ON "Project"("category");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_moderationStatus_idx" ON "Project"("moderationStatus");

-- CreateIndex
CREATE INDEX "Project_recruiterId_idx" ON "Project"("recruiterId");

-- CreateIndex
CREATE INDEX "Application_projectId_idx" ON "Application"("projectId");

-- CreateIndex
CREATE INDEX "Application_freelancerId_idx" ON "Application"("freelancerId");

-- CreateIndex
CREATE INDEX "Application_recruiterId_idx" ON "Application"("recruiterId");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Application_projectId_freelancerId_key" ON "Application"("projectId", "freelancerId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_gatewayOrderId_key" ON "Payment"("gatewayOrderId");

-- CreateIndex
CREATE INDEX "Payment_projectId_idx" ON "Payment"("projectId");

-- CreateIndex
CREATE INDEX "Payment_recruiterId_idx" ON "Payment"("recruiterId");

-- CreateIndex
CREATE INDEX "Payment_freelancerId_idx" ON "Payment"("freelancerId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_escrowStatus_idx" ON "Payment"("escrowStatus");

-- CreateIndex
CREATE INDEX "Payment_reviewStatus_idx" ON "Payment"("reviewStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_recruiterId_projectId_idempotencyKey_key" ON "Payment"("recruiterId", "projectId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentTimeline_paymentId_idx" ON "PaymentTimeline"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_gatewayOrderId_idx" ON "PaymentWebhookEvent"("gatewayOrderId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_gatewayPaymentId_idx" ON "PaymentWebhookEvent"("gatewayPaymentId");

-- CreateIndex
CREATE INDEX "Dispute_projectId_idx" ON "Dispute"("projectId");

-- CreateIndex
CREATE INDEX "Dispute_paymentId_idx" ON "Dispute"("paymentId");

-- CreateIndex
CREATE INDEX "Dispute_raisedBy_idx" ON "Dispute"("raisedBy");

-- CreateIndex
CREATE INDEX "Dispute_againstUserId_idx" ON "Dispute"("againstUserId");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE INDEX "Dispute_priority_idx" ON "Dispute"("priority");

-- CreateIndex
CREATE INDEX "DisputeTimeline_disputeId_idx" ON "DisputeTimeline"("disputeId");

-- CreateIndex
CREATE INDEX "Notification_recipientId_idx" ON "Notification"("recipientId");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Review_projectId_idx" ON "Review"("projectId");

-- CreateIndex
CREATE INDEX "Review_reviewerId_idx" ON "Review"("reviewerId");

-- CreateIndex
CREATE INDEX "Review_revieweeId_idx" ON "Review"("revieweeId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_projectId_reviewerId_key" ON "Review"("projectId", "reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_gatewayOrderId_key" ON "Subscription"("gatewayOrderId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "SubscriptionTimeline_subscriptionId_idx" ON "SubscriptionTimeline"("subscriptionId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_moderatedBy_fkey" FOREIGN KEY ("moderatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_selectedFreelancer_fkey" FOREIGN KEY ("selectedFreelancer") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_moderatedBy_fkey" FOREIGN KEY ("moderatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTimeline" ADD CONSTRAINT "PaymentTimeline_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_raisedBy_fkey" FOREIGN KEY ("raisedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_againstUserId_fkey" FOREIGN KEY ("againstUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeTimeline" ADD CONSTRAINT "DisputeTimeline_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeTimeline" ADD CONSTRAINT "DisputeTimeline_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_revieweeId_fkey" FOREIGN KEY ("revieweeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionTimeline" ADD CONSTRAINT "SubscriptionTimeline_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
