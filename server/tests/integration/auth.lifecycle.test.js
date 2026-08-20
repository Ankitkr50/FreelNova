const crypto = require("crypto");
const request = require("supertest");
const { prisma } = require("../../src/config/db");
const { app } = require("../helpers/auth");

describe("Auth lifecycle", () => {
  it("registers, verifies, logs in, refreshes, and logs out", async () => {
    const tokenBytes = Buffer.alloc(32, 7);
    const expectedVerifyToken = tokenBytes.toString("hex");
    const randomSpy = jest.spyOn(crypto, "randomBytes").mockReturnValue(tokenBytes);

    const email = "auth.lifecycle@skillbridge.test";
    const password = "Strong@123";

    const registerRes = await request(app).post("/api/auth/register").send({
      name: "Auth User",
      email,
      password,
      role: "freelancer",
    });
    expect(registerRes.statusCode).toBe(201);

    const loginBeforeVerify = await request(app).post("/api/auth/login").send({ email, password });
    expect(loginBeforeVerify.statusCode).toBe(403);

    const verifyRes = await request(app).post("/api/auth/verify").send({ email, otp: "123456" });
    expect(verifyRes.statusCode).toBe(200);

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).toBeTruthy();
    expect(user.isEmailVerified).toBe(true);

    const loginRes = await request(app).post("/api/auth/login").send({ email, password });
    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body?.data?.accessToken).toBeTruthy();
    expect(loginRes.body?.data?.refreshToken).toBeTruthy();

    const refreshRes = await request(app).post("/api/auth/refresh").send({
      refreshToken: loginRes.body.data.refreshToken,
    });
    expect(refreshRes.statusCode).toBe(200);
    expect(refreshRes.body?.data?.accessToken).toBeTruthy();
    expect(refreshRes.body?.data?.refreshToken).toBeTruthy();

    const logoutRes = await request(app).post("/api/auth/logout").send({
      refreshToken: refreshRes.body.data.refreshToken,
    });
    expect(logoutRes.statusCode).toBe(200);

    const refreshAfterLogout = await request(app).post("/api/auth/refresh").send({
      refreshToken: refreshRes.body.data.refreshToken,
    });
    expect(refreshAfterLogout.statusCode).toBe(401);

    randomSpy.mockRestore();
  });
});

