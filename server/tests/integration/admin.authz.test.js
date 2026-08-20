const request = require("supertest");
const { app, createVerifiedUser, loginUser } = require("../helpers/auth");

describe("Admin moderation endpoint auth checks", () => {
  it("enforces admin-only access for moderation endpoints", async () => {
    const admin = await createVerifiedUser({
      name: "Admin A",
      email: "admin.authz@skillbridge.test",
      role: "admin",
    });
    const recruiter = await createVerifiedUser({
      name: "Recruiter A",
      email: "recruiter.authz@skillbridge.test",
      role: "recruiter",
    });
    const targetUser = await createVerifiedUser({
      name: "Target User",
      email: "target.authz@skillbridge.test",
      role: "freelancer",
    });

    const adminAuth = await loginUser({ email: admin.email });
    const recruiterAuth = await loginUser({ email: recruiter.email });

    const noTokenRes = await request(app).get("/api/admin/users");
    expect(noTokenRes.statusCode).toBe(401);

    const recruiterRes = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${recruiterAuth.accessToken}`);
    expect(recruiterRes.statusCode).toBe(403);

    const adminRes = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${adminAuth.accessToken}`);
    expect(adminRes.statusCode).toBe(200);

    const recruiterPatch = await request(app)
      .patch(`/api/admin/users/${targetUser.id || targetUser._id}/status`)
      .set("Authorization", `Bearer ${recruiterAuth.accessToken}`)
      .send({
        moderationStatus: "suspended",
        moderationNote: "policy violation",
      });
    expect(recruiterPatch.statusCode).toBe(403);

    const adminPatch = await request(app)
      .patch(`/api/admin/users/${targetUser.id || targetUser._id}/status`)
      .set("Authorization", `Bearer ${adminAuth.accessToken}`)
      .send({
        moderationStatus: "suspended",
        moderationNote: "policy violation",
      });
    expect(adminPatch.statusCode).toBe(200);
    expect(adminPatch.body?.data?.moderationStatus).toBe("suspended");
  });
});

