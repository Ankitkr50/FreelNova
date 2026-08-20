const request = require("supertest");
const app = require("../../src/app");
const { prisma } = require("../../src/config/db");
const redis = require("../../src/utils/redis");

async function runLockoutSmokeTest() {
  console.log("Starting Account Lockout Policy and Brute-Force Protection Smoke Test...");
  const randomSuffix = Math.floor(Math.random() * 1000000);
  const testEmail = `lockout_user_${randomSuffix}@example.com`.toLowerCase();
  const testPassword = "Password@123";

  try {
    // 1. Clean up potential old remnants
    const lockoutKey = `lockout:${testEmail}`;
    const attemptsKey = `attempts:${testEmail}`;
    await redis.del(lockoutKey);
    await redis.del(attemptsKey);

    // 2. Register test user
    console.log("Step 1: Registering test user...");
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Lockout Test User",
        email: testEmail,
        password: testPassword,
        role: "freelancer",
      });
    if (regRes.status !== 201) throw new Error(`Registration failed: ${regRes.status} ${regRes.text}`);

    // Verify OTP to active user
    console.log("Step 2: Activating email via sandbox OTP...");
    const verifyRes = await request(app)
      .post("/api/auth/verify")
      .send({
        email: testEmail,
        otp: "123456",
      });
    if (verifyRes.status !== 200) throw new Error(`Email verification failed: ${verifyRes.status} ${verifyRes.text}`);

    // 3. First failed login attempt
    console.log("Step 3: Simulating 1st failed login attempt...");
    const fail1 = await request(app)
      .post("/api/auth/login")
      .send({ email: testEmail, password: "WrongPassword1" });
    console.log("1st Fail Status:", fail1.status, "Body:", fail1.body.message);
    if (fail1.status !== 401) throw new Error("1st failed attempt should return 401");
    if (!fail1.body.message.includes("2 attempt(s) remaining")) {
      throw new Error(`Unexpected message: ${fail1.body.message}`);
    }

    // 4. Second failed login attempt
    console.log("Step 4: Simulating 2nd failed login attempt...");
    const fail2 = await request(app)
      .post("/api/auth/login")
      .send({ email: testEmail, password: "WrongPassword2" });
    console.log("2nd Fail Status:", fail2.status, "Body:", fail2.body.message);
    if (fail2.status !== 401) throw new Error("2nd failed attempt should return 401");
    if (!fail2.body.message.includes("1 attempt(s) remaining")) {
      throw new Error(`Unexpected message: ${fail2.body.message}`);
    }

    // 5. Third failed login attempt -> Locks account
    console.log("Step 5: Simulating 3rd failed login attempt...");
    const fail3 = await request(app)
      .post("/api/auth/login")
      .send({ email: testEmail, password: "WrongPassword3" });
    console.log("3rd Fail Status:", fail3.status, "Body:", fail3.body.message);
    if (fail3.status !== 423) throw new Error("3rd failed attempt should trigger lockout (423)");
    if (!fail3.body.message.includes("Account locked due to 3 failed login attempts")) {
      throw new Error(`Unexpected message: ${fail3.body.message}`);
    }

    // 6. Verification that correct password fails while locked out
    console.log("Step 6: Simulating login with correct password during active lockout...");
    const failLockedSuccess = await request(app)
      .post("/api/auth/login")
      .send({ email: testEmail, password: testPassword });
    console.log("Login during lockout status:", failLockedSuccess.status, "Body:", failLockedSuccess.body.message);
    if (failLockedSuccess.status !== 423) throw new Error("Correct password should fail with 423 during active lockout");

    // 7. Reset lockout keys to test successful login
    console.log("Step 7: Resetting lockout keys in Redis to simulate unlock...");
    await redis.del(lockoutKey);
    await redis.del(attemptsKey);

    // 8. Successful login check
    console.log("Step 8: Simulating successful login...");
    const successLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: testEmail, password: testPassword });
    console.log("Successful Login Status:", successLogin.status);
    if (successLogin.status !== 200) throw new Error("Login failed after unlocking");

    // Clean up
    console.log("\n=======================================================");
    console.log("🎉 ACCOUNT LOCKOUT SMOKE TEST COMPLETED AND PASSED!");
    console.log("=======================================================\n");

  } catch (error) {
    console.error("\n❌ Account lockout smoke test failed:", error);
    process.exit(1);
  } finally {
    try {
      const lockoutKey = `lockout:${testEmail}`;
      const attemptsKey = `attempts:${testEmail}`;
      await redis.del(lockoutKey);
      await redis.del(attemptsKey);
      await prisma.user.deleteMany({ where: { email: testEmail } });
    } catch (e) {}
    await prisma.$disconnect();
    process.exit(0);
  }
}

runLockoutSmokeTest();
