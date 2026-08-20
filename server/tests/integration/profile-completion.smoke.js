const request = require("supertest");
const app = require("../../src/app");
const { prisma } = require("../../src/config/db");

async function runSmokeTest() {
  console.log("Starting Onboarding, Admin Verification, Pricing, and Commission Smoke Test...");
  const randomSuffix = Math.floor(Math.random() * 1000000);
  const testEmail = `freelancer_${randomSuffix}@example.com`;
  const adminEmail = `admin_${randomSuffix}@example.com`;
  const testPassword = "Password@123";

  let testUserId = null;
  let adminUserId = null;
  let recruiterEmail = `recruiter_${randomSuffix}@example.com`;
  let recruiterId = null;
  let projectId = null;
  let paymentId = null;

  try {
    // 1. Register a user (freelancer)
    console.log("Step 1: Registering user...");
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test Freelancer",
        email: testEmail,
        password: testPassword,
        role: "freelancer"
      });

    console.log("Register response:", regRes.status, regRes.body.message);
    if (regRes.status !== 201) throw new Error("Registration failed");

    // Verify OTP
    console.log("Step 2: Verifying OTP...");
    const verifyRes = await request(app)
      .post("/api/auth/verify")
      .send({
        email: testEmail,
        otp: "123456" // Sandbox bypass code
      });

    console.log("Verify response:", verifyRes.status, verifyRes.body.message);
    if (verifyRes.status !== 200) throw new Error("OTP Verification failed");

    testUserId = verifyRes.body.data.user.id;
    const token = verifyRes.body.data.accessToken;

    // 3. Try to apply to a project -> verify it is blocked because profile is not completed
    console.log("Step 3: Trying to apply for a project (should block: profile not completed)...");
    const applyRes1 = await request(app)
      .post("/api/projects/a0000000-0000-0000-0000-000000000000/apply")
      .set("Authorization", `Bearer ${token}`)
      .send({
        proposal: "I want to do this project.",
        bidAmount: 500,
        deliveryDays: 5
      });

    console.log("Apply response 1 status:", applyRes1.status);
    if (applyRes1.status !== 403 || !applyRes1.body.message.includes("complete your profile details")) {
      throw new Error(`Expected 403 Forbidden with profile details warning, but got ${applyRes1.status}: ${JSON.stringify(applyRes1.body)}`);
    }
    console.log("Success: Blocked due to incomplete profile as expected.");

    // 4. Complete the profile as a Student
    console.log("Step 4: Completing profile as a Student...");
    const compRes = await request(app)
      .put("/api/users/profile/complete")
      .set("Authorization", `Bearer ${token}`)
      .send({
        category: "student",
        phone: "9876543210",
        aadhaarCard: "123456789012",
        aadhaarCardPhoto: "https://cdn.skillbridge.local/aadhaar/test_aadhaar.png",
        panCard: "ABCDE1234F",
        schoolOrCollege: "IIT Delhi",
        schoolResult: "9.5 CGPA",
        schoolIdCard: "ID-12345",
        bankAccountNo: "123456789012",
        bankIfsc: "SBIN0001234",
        bankName: "State Bank of India"
      });

    console.log("Complete profile status:", compRes.status, compRes.body.message);
    if (compRes.status !== 200 || compRes.body.data.profileCompleted !== true) {
      throw new Error("Profile completion failed");
    }
    console.log("Success: Profile completed successfully.");

    // 5. Try to apply again -> verify it is STILL blocked because isVerified is false
    console.log("Step 5: Trying to apply again (should block: pending admin verification)...");
    const applyRes2 = await request(app)
      .post("/api/projects/a0000000-0000-0000-0000-000000000000/apply")
      .set("Authorization", `Bearer ${token}`)
      .send({
        proposal: "I want to do this project.",
        bidAmount: 500,
        deliveryDays: 5
      });

    console.log("Apply response 2 status:", applyRes2.status);
    if (applyRes2.status !== 403 || !applyRes2.body.message.includes("pending admin verification")) {
      throw new Error(`Expected 403 Forbidden with pending admin verification warning, but got ${applyRes2.status}: ${JSON.stringify(applyRes2.body)}`);
    }
    console.log("Success: Blocked due to unverified status as expected.");

    // 6. Create an Admin user via Prisma, login, and verify the freelancer
    console.log("Step 6: Seeding and logging in as an admin...");
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    const adminUser = await prisma.user.create({
      data: {
        name: "Test Admin",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
        isEmailVerified: true
      }
    });
    adminUserId = adminUser.id;

    const { signAccessToken } = require("../../src/utils/jwt");
    const env = require("../../src/config/env");
    const adminToken = signAccessToken({
      sub: adminUserId,
      role: "admin"
    }, env);

    // Verify the test user's profile via admin status update PATCH endpoint
    console.log("Step 6b: Verifying user via admin endpoint...");
    const verifyPatchRes = await request(app)
      .patch(`/api/admin/users/${testUserId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        isVerified: true,
        moderationStatus: "active",
        moderationNote: "Verified by smoke test admin"
      });

    console.log("Admin verify response:", verifyPatchRes.status, verifyPatchRes.body.message);
    if (verifyPatchRes.status !== 200 || verifyPatchRes.body.data.isVerified !== true) {
      throw new Error("Admin verification update failed");
    }
    console.log("Success: User verified by admin successfully.");

    // 7. Try to apply again -> should bypass verification guard (returns 404 project not found)
    console.log("Step 7: Trying to apply again (should not block with 403)...");
    const applyRes3 = await request(app)
      .post("/api/projects/a0000000-0000-0000-0000-000000000000/apply")
      .set("Authorization", `Bearer ${token}`)
      .send({
        proposal: "I want to do this project.",
        bidAmount: 500,
        deliveryDays: 5
      });

    console.log("Apply response 3 status:", applyRes3.status);
    if (applyRes3.status === 403) {
      throw new Error("Expected 404/other error, but still blocked with 403");
    }
    console.log("Success: Apply is no longer blocked after admin verification.");

    // 8. Verify subscription pricing configs
    console.log("Step 8: Checking subscription order pricing configurations...");
    const subMonthlyOrder = await request(app)
      .post("/api/subscriptions/create-order")
      .set("Authorization", `Bearer ${token}`)
      .send({ plan: "pro_monthly" });

    console.log("Monthly order pricing status:", subMonthlyOrder.status);
    if (subMonthlyOrder.status !== 201 || subMonthlyOrder.body.data.amount !== 109900) {
      throw new Error(`Expected Monthly subscription price of 109900 paise (1099 INR), got: ${JSON.stringify(subMonthlyOrder.body)}`);
    }
    console.log("Success: Monthly subscription cost is correctly 1099 INR.");

    const subYearlyOrder = await request(app)
      .post("/api/subscriptions/create-order")
      .set("Authorization", `Bearer ${token}`)
      .send({ plan: "pro_yearly" });

    console.log("Yearly order pricing status:", subYearlyOrder.status);
    if (subYearlyOrder.status !== 201 || subYearlyOrder.body.data.amount !== 799900) {
      throw new Error(`Expected Yearly subscription price of 799900 paise (7999 INR), got: ${JSON.stringify(subYearlyOrder.body)}`);
    }
    console.log("Success: Yearly subscription cost is correctly 7999 INR.");

    // 9. Verify dynamic commission rate statistics
    console.log("Step 9: Verifying dynamic commission rates...");
    
    // Create temporary recruiter user
    const recruiter = await prisma.user.create({
      data: {
        name: "Test Recruiter",
        email: recruiterEmail,
        password: hashedPassword,
        role: "recruiter",
        isEmailVerified: true
      }
    });
    recruiterId = recruiter.id;

    // Create temporary project
    const project = await prisma.project.create({
      data: {
        title: "Test Project",
        description: "Test description",
        category: "student",
        budgetMin: 100,
        budgetMax: 2000,
        currency: "INR",
        timelineDays: 10,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        recruiterId: recruiterId,
        status: "in_progress"
      }
    });
    projectId = project.id;

    // Create a captured payment in DB for the user
    const payment = await prisma.payment.create({
      data: {
        freelancerId: testUserId,
        recruiterId: recruiterId,
        projectId: projectId,
        amount: 1000,
        currency: "INR",
        status: "captured",
        escrowStatus: "held_in_escrow",
        gatewayOrderId: "smoke_order_id",
        gatewayPaymentId: "smoke_pay_id"
      }
    });
    paymentId = payment.id;

    // Check stats as non-subscribed user (should be 15% commission rate -> 150 INR tax)
    const statsRes1 = await request(app)
      .get("/api/payments/stats")
      .set("Authorization", `Bearer ${token}`);

    console.log("Stats response (Unsubscribed):", statsRes1.status, "Tax Amount:", statsRes1.body.data.taxAmount);
    if (statsRes1.body.data.taxAmount !== 150 || statsRes1.body.data.netAmount !== 850) {
      throw new Error(`Expected 15% commission tax (150 INR / 850 net), got: ${JSON.stringify(statsRes1.body.data)}`);
    }
    console.log("Success: Correctly computed 15% commission rate for basic user.");

    // Add an active subscription in DB for the user
    await prisma.subscription.create({
      data: {
        userId: testUserId,
        plan: "pro_monthly",
        amount: 1099,
        currency: "INR",
        gatewayOrderId: "smoke_sub_gate_order",
        status: "active",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    // Check stats again (should be 10% commission rate -> 100 INR tax)
    const statsRes2 = await request(app)
      .get("/api/payments/stats")
      .set("Authorization", `Bearer ${token}`);

    console.log("Stats response (Subscribed):", statsRes2.status, "Tax Amount:", statsRes2.body.data.taxAmount);
    if (statsRes2.body.data.taxAmount !== 100 || statsRes2.body.data.netAmount !== 900) {
      throw new Error(`Expected 10% commission tax (100 INR / 900 net), got: ${JSON.stringify(statsRes2.body.data)}`);
    }
    console.log("Success: Correctly computed 10% commission rate for Pro member.");

    // 10. Verify directory priority sorting
    console.log("Step 10: Verifying freelancer directory sorting priority...");
    const testEmail2 = `freelancer2_${randomSuffix}@example.com`;
    const testUser2 = await prisma.user.create({
      data: {
        name: "Test Verified User",
        email: testEmail2,
        password: hashedPassword,
        role: "freelancer",
        isEmailVerified: true,
        profileCompleted: true,
        isVerified: true,
        moderationStatus: "active"
      }
    });

    const listRes = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${token}`);

    console.log("Directory response status:", listRes.status);
    if (listRes.status !== 200) {
      throw new Error(`Failed to fetch freelancers: ${JSON.stringify(listRes.body)}`);
    }

    const fetchedFreelancers = listRes.body.data || [];
    const indexElite = fetchedFreelancers.findIndex(u => u.id === testUserId);
    const indexVerified = fetchedFreelancers.findIndex(u => u.id === testUser2.id);

    console.log(`Elite Pro Freelancer Index: ${indexElite}, Verified Freelancer Index: ${indexVerified}`);
    if (indexElite === -1 || indexVerified === -1) {
      throw new Error("Could not find registered test freelancers in directory response");
    }
    if (indexElite > indexVerified) {
      throw new Error(`Priority sorting failed: Elite freelancer (${indexElite}) should rank higher than Verified freelancer (${indexVerified})`);
    }
    console.log("Success: Correctly verified priority directory sorting (Elite Pro ranks before Verified).");

    // Step 11: Registering and onboarding an International freelancer
    console.log("Step 11: Registering and onboarding an International freelancer...");
    const intEmail = `intl_${randomSuffix}@example.com`;
    const intRegisterRes = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test International Freelancer",
        email: intEmail,
        password: testPassword,
        role: "freelancer"
      });

    if (intRegisterRes.status !== 201) {
      throw new Error(`International Registration failed: ${JSON.stringify(intRegisterRes.body)}`);
    }

    // Verify email (OTP)
    const intVerifyRes = await request(app)
      .post("/api/auth/verify")
      .send({
        email: intEmail,
        otp: "123456"
      });

    if (intVerifyRes.status !== 200) {
      throw new Error("International OTP verification failed");
    }

    const intToken = intVerifyRes.body.data.accessToken;

    // Complete profile as international user
    const intCompRes = await request(app)
      .put("/api/users/profile/complete")
      .set("Authorization", `Bearer ${intToken}`)
      .send({
        category: "student",
        phone: "+14155552671",
        isInternational: true,
        passportOrNationalId: "P9876543",
        passportPhoto: "https://cdn.skillbridge.local/passport/test_passport.png",
        taxIdNumber: "TIN-987654321",
        swiftBic: "BARCGB2L",
        ibanAccountNo: "GB29BARC20201555555555",
        bankName: "Barclays Bank",
        schoolOrCollege: "Oxford University",
        schoolResult: "First Class",
        schoolIdCard: "ID-INT-09",
        timezone: "GMT"
      });

    console.log("International Complete profile status:", intCompRes.status, intCompRes.body.message);
    if (intCompRes.status !== 200 || intCompRes.body.data.profileCompleted !== true) {
      throw new Error(`International Profile completion failed: ${JSON.stringify(intCompRes.body)}`);
    }
    if (intCompRes.body.data.isInternational !== true || intCompRes.body.data.timezone !== "GMT") {
      throw new Error("International payload parameters failed to persist correctly");
    }
    console.log("Success: International Profile completed and verified successfully.");

    // Clean up all test data
    console.log("Cleaning up test data...");
    if (paymentId) await prisma.payment.deleteMany({ where: { id: paymentId } });
    if (projectId) await prisma.project.deleteMany({ where: { id: projectId } });
    if (recruiterId) await prisma.user.deleteMany({ where: { id: recruiterId } });
    await prisma.subscription.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.user.deleteMany({ where: { email: testEmail2 } });
    await prisma.user.deleteMany({ where: { email: intEmail } });
    await prisma.user.deleteMany({ where: { email: adminEmail } });
    console.log("All test data cleaned up successfully.");

    console.log("\n=======================================================");
    console.log("🎉 ALL NEW SMOKE TESTS COMPLETED AND PASSED SUCCESSFULLY!");
    console.log("=======================================================\n");

  } catch (error) {
    console.error("\n❌ Smoke test failed:", error);
    // Cleanup anyway
    try {
      const testEmail2 = `freelancer2_${randomSuffix}@example.com`;
      const intEmail = `intl_${randomSuffix}@example.com`;
      if (paymentId) await prisma.payment.deleteMany({ where: { id: paymentId } });
      if (projectId) await prisma.project.deleteMany({ where: { id: projectId } });
      if (recruiterId) await prisma.user.deleteMany({ where: { id: recruiterId } });
      await prisma.subscription.deleteMany({ where: { userId: testUserId } });
      await prisma.user.deleteMany({ where: { email: testEmail } });
      await prisma.user.deleteMany({ where: { email: testEmail2 } });
      await prisma.user.deleteMany({ where: { email: intEmail } });
      await prisma.user.deleteMany({ where: { email: adminEmail } });
    } catch (e) {}
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

runSmokeTest();
