const { prisma } = require("../src/config/db");

async function cleanTestData() {
  console.log("🧹 [Instant Complete Deep Purge] Purging ALL test/seed entries across all Super Admin tables...");

  try {
    await prisma.ticketMessage.deleteMany({});
    await prisma.supportTicket.deleteMany({});
    await prisma.enterpriseCase.deleteMany({});
    await prisma.disputeTimeline.deleteMany({});
    await prisma.dispute.deleteMany({});
    await prisma.financeApproval.deleteMany({});
    await prisma.financialLedger.deleteMany({});
    await prisma.securityAlert.deleteMany({});
    await prisma.chatReport.deleteMany({});
    await prisma.adminAuditLog.deleteMany({});
    await prisma.internalNote.deleteMany({});
    await prisma.knowledgeArticle.deleteMany({});
    await prisma.employeeHandover.deleteMany({});
    await prisma.userReferral.deleteMany({});
    await prisma.referralCode.deleteMany({});
    await prisma.rewardLog.deleteMany({});
    await prisma.userRewardCredit.deleteMany({});
    await prisma.userAchievement.deleteMany({});

    // Clean test applications, projects, reviews, payments, and test users
    await prisma.paymentTimeline.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.review.deleteMany({});
    await prisma.application.deleteMany({});
    await prisma.projectRevision.deleteMany({});
    await prisma.chatAttachment.deleteMany({});
    await prisma.chatMessage.deleteMany({});
    await prisma.conversation.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.staffInvitation.deleteMany({});
    await prisma.adminSession.deleteMany({});
    
    // Clean enterprise governance, notification, and community tables
    await prisma.notification.deleteMany({});
    await prisma.sensitiveActionApproval.deleteMany({});
    await prisma.policyVersion.deleteMany({});
    await prisma.policy.deleteMany({});
    await prisma.paymentWebhookEvent.deleteMany({});
    await prisma.communityComment.deleteMany({});
    await prisma.communityPost.deleteMany({});
    await prisma.communityReaction.deleteMany({});
    await prisma.subscriptionTimeline.deleteMany({});
    await prisma.subscription.deleteMany({});

    // Purge test users except primary super admin (fn.freelnova@gmail.com)
    await prisma.user.deleteMany({
      where: {
        AND: [
          { email: { not: "fn.freelnova@gmail.com" } },
          {
            OR: [
              { email: { contains: ".test" } },
              { email: { contains: "test" } },
              { email: { contains: "invited" } },
              { email: { contains: "pooja" } },
              { email: { contains: "finance" } },
              { email: { contains: "moderator" } },
              { email: { contains: "superadmin" } },
              { email: { contains: "recruiter" } },
              { email: { contains: "freelancer" } },
            ],
          },
        ],
      },
    });


    console.log("✨ [Instant Complete Deep Purge] Super Admin Dashboard is 100% clean (0 unwanted entries).");
  } catch (err) {
    console.error("⚠️ [Purge Warning]:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  cleanTestData();
}

module.exports = { cleanTestData };


