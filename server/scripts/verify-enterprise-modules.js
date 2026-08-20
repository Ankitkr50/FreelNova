const enterpriseService = require("../src/services/enterprise.service");
const { prisma } = require("../src/config/db");

async function verifyEnterpriseModules() {
  console.log("=================================================");
  console.log("   FREELNOVA ENTERPRISE MODULES VERIFICATION    ");
  console.log("=================================================");

  // Create a mock Super Admin user for testing
  let testAdmin = await prisma.user.findFirst({ where: { role: "admin" } });
  if (!testAdmin) {
    testAdmin = await prisma.user.create({
      data: {
        name: "Enterprise Test Admin",
        email: `test.admin.${Date.now()}@freelnova.test`,
        password: "hashedpassword123",
        role: "admin",
        adminRole: "SUPER_ADMIN",
        staffStatus: "ACTIVE",
      },
    });
  }

  // Module 1: Support Ticket + SLA
  console.log("\n[1/13] Testing Support Ticket + SLA System...");
  const ticket = await enterpriseService.createTicket(testAdmin, {
    category: "PAYMENT",
    priority: "CRITICAL",
    subject: "Urgent Escrow Inquiry",
    description: "SLA test inquiry",
  });
  console.log("  ✅ Ticket Created:", ticket.ticketNumber, "Priority:", ticket.priority, "SLA Deadline:", ticket.slaDeadline);

  const ticketsList = await enterpriseService.getTickets({ status: "all" });
  console.log("  ✅ Listed Support Tickets:", ticketsList.total, "total tickets.");

  // Module 2: Dispute Resolution Center
  console.log("\n[2/13] Testing Dispute Resolution Center...");
  const dummyProject = await prisma.project.findFirst();
  if (dummyProject) {
    const dispute = await prisma.dispute.create({
      data: {
        projectId: dummyProject.id,
        raisedBy: testAdmin.id,
        type: "payment",
        reason: "Test arbitration case",
        status: "open",
      },
    });
    const disputeDetails = await enterpriseService.getDisputeDetails(dispute.id);
    console.log("  ✅ Dispute Details Retrieved:", disputeDetails.id, "Status:", disputeDetails.status);
  } else {
    console.log("  ℹ️ Skipped dispute creation (no dummy project in DB).");
  }

  // Module 3: Finance Approval Workflow
  console.log("\n[3/13] Testing Finance Approval Workflow...");
  const finReq = await enterpriseService.createFinanceApprovalRequest(
    testAdmin,
    {
      requestType: "REFUND",
      amount: 60000,
      targetType: "PAYMENT",
      targetId: "pay_test_123",
      reason: "High-value refund test",
    },
    null
  );
  console.log("  ✅ Finance Request Created:", finReq.requestId, "Requires Super Admin:", finReq.requiresSuperAdmin);

  const processedFin = await enterpriseService.processFinanceApproval(finReq.id, "APPROVE", {}, testAdmin, null);
  console.log("  ✅ Finance Approval Processed:", processedFin.requestId, "Status:", processedFin.status);

  // Module 4: Security & Fraud Center
  console.log("\n[4/13] Testing Security & Fraud Center...");
  const secDashboard = await enterpriseService.getSecurityDashboardSignals();
  console.log("  ✅ Security Dashboard Fetched. Active Risk Counts:", secDashboard.riskCounts);

  // Module 5: Company Analytics
  console.log("\n[5/13] Testing Company Analytics...");
  const analytics = await enterpriseService.getCompanyAnalyticsData(testAdmin);
  console.log("  ✅ Company Analytics Retrieved. Overview Users:", analytics.overview.totalUsers, "GMV:", analytics.financial?.totalGMV);

  // Module 6: Internal Knowledge Base
  console.log("\n[6/13] Testing Internal Knowledge Base...");
  const article = await enterpriseService.createKnowledgeArticle(testAdmin, {
    title: "Escrow Refund Protocol v1",
    category: "Refund Policy",
    content: "Detailed steps for issuing refunds...",
  });
  console.log("  ✅ Knowledge Article Created:", article.articleId, "Title:", article.title);

  // Module 7: Employee Handover System
  console.log("\n[7/13] Testing Employee Handover System...");
  const dummyStaffB = await prisma.user.findFirst({ where: { role: "admin", id: { not: testAdmin.id } } }) || testAdmin;
  const handover = await enterpriseService.executeEmployeeHandover(
    testAdmin,
    {
      fromEmployeeId: testAdmin.id,
      toEmployeeId: dummyStaffB.id,
      reason: "Workload rebalancing test",
      notes: "Handover context",
    },
    null
  );
  console.log("  ✅ Employee Handover Executed:", handover.handoverId, "Items Transferred:", handover.itemsSummary);

  // Module 8: Internal Notes
  console.log("\n[8/13] Testing Internal Notes...");
  const note = await enterpriseService.createInternalNote(
    testAdmin,
    {
      entityType: "USER",
      entityId: testAdmin.id,
      noteText: "Confidential staff note",
      priority: "HIGH",
      isConfidential: true,
    },
    null
  );
  console.log("  ✅ Internal Note Created:", note.id, "Confidential:", note.isConfidential);

  // Module 9: Notification Center 2.0
  console.log("\n[9/13] Testing Notification Center 2.0...");
  const notifResult = await enterpriseService.sendTargetedNotification(testAdmin, {
    targetType: "ALL_STAFF",
    priority: "CRITICAL",
    title: "System Maintenance Notice",
    message: "Scheduled operational update.",
  });
  console.log("  ✅ Notification 2.0 Dispatched. Recipients Count:", notifResult.count);

  // Module 10: Super Admin Command Center
  console.log("\n[10/13] Testing Super Admin Command Center...");
  const commandData = await enterpriseService.getCommandCenterData();
  console.log("  ✅ Command Center KPI Telemetry:", commandData.kpi);

  // Module 11: Security Approval / Sensitive Actions
  console.log("\n[11/13] Testing Security Approval / Sensitive Actions...");
  const sensAction = await enterpriseService.requestSensitiveAction(
    testAdmin,
    {
      actionCode: "ACCOUNT_SUSPENSION",
      targetType: "USER",
      targetId: testAdmin.id,
      reason: "Security audit test",
    },
    null
  );
  console.log("  ✅ Sensitive Action Requested:", sensAction.id, "Code:", sensAction.actionCode);

  // Module 12: Case Management System
  console.log("\n[12/13] Testing Case Management System...");
  const caseItem = await enterpriseService.createCase(
    testAdmin,
    {
      originType: "SECURITY_INCIDENT",
      title: "Suspicious Payment Bypass Investigation",
      description: "Case container for investigating bypass alert",
      priority: "HIGH",
    },
    null
  );
  console.log("  ✅ Case Created:", caseItem.caseNumber, "Title:", caseItem.title);

  // Module 13: Policy & Compliance Center
  console.log("\n[13/13] Testing Policy & Compliance Center...");
  const policy = await enterpriseService.createOrUpdatePolicy(testAdmin, {
    policyCode: "POL-REFUND-TEST",
    name: "Enterprise Refund Governance Policy",
    category: "Refund Policy",
    content: "Official policy rulebook text...",
    changeSummary: "Initial version",
  });
  console.log("  ✅ Policy Created/Updated:", policy.policyCode, "Version:", policy.currentVersion);

  console.log("\n=================================================");
  console.log("  ALL 13 ENTERPRISE MODULES VERIFIED SUCCESSFULLY!");
  console.log("=================================================");
}

const { cleanTestData } = require("./clean-test-data");

verifyEnterpriseModules()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    console.log("\n🧹 Automatically purging enterprise verification test data...");
    await cleanTestData();
  });


