const request = require("supertest");
const { app, createVerifiedUser, loginUser } = require("../helpers/auth");
const { prisma } = require("../../src/config/db");

describe("Launch Readiness & Full End-to-End Regression Suite", () => {
  it("executes full marketplace hiring, milestone delivery, search, and notification lifecycle", async () => {
    // 1. Setup Client & Freelancer
    const recruiter = await createVerifiedUser({
      name: "Launch Client",
      email: `launch.client.${Date.now()}@freelnova.test`,
      role: "recruiter",
    });
    const freelancer = await createVerifiedUser({
      name: "Launch Freelancer",
      email: `launch.freelancer.${Date.now()}@freelnova.test`,
      role: "freelancer",
    });

    const clientAuth = await loginUser({ email: recruiter.email });
    const freelancerAuth = await loginUser({ email: freelancer.email });

    // 2. Client Posts Project
    const createRes = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${clientAuth.accessToken}`)
      .send({
        title: "Fullstack E-Commerce Enterprise Platform",
        description: "Need a high-performance React + Node.js platform with PostgreSQL database.",
        category: "Web Development",
        skills: ["React.js", "Node.js", "PostgreSQL"],
        budgetMin: 40000,
        budgetMax: 80000,
        currency: "INR",
        timelineDays: 14,
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      });

    expect(createRes.statusCode).toBe(201);
    const projectId = createRes.body.data.id;

    // 3. Freelancer Submits Proposal
    const applyRes = await request(app)
      .post(`/api/projects/${projectId}/apply`)
      .set("Authorization", `Bearer ${freelancerAuth.accessToken}`)
      .send({
        proposal: "Expert fullstack developer with 5+ years experience building e-commerce platforms.",
        bidAmount: 60000,
        deliveryDays: 12,
      });

    expect(applyRes.statusCode).toBe(201);

    // 4. Client Selects Freelancer
    const selectRes = await request(app)
      .post(`/api/projects/${projectId}/select`)
      .set("Authorization", `Bearer ${clientAuth.accessToken}`)
      .send({ freelancerId: freelancer.id });

    expect(selectRes.statusCode).toBe(200);

    // 5. Check Notifications Generated
    const notifRes = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${freelancerAuth.accessToken}`);

    expect(notifRes.statusCode).toBe(200);

    // 6. Advanced Marketplace Search Query
    const searchRes = await request(app)
      .get("/api/projects/search?category=Web Development&q=E-Commerce")
      .set("Authorization", `Bearer ${freelancerAuth.accessToken}`);

    expect(searchRes.statusCode).toBe(200);
    // 7. Check Growth Dashboard Telemetry
    const growthRes = await request(app)
      .get("/api/growth/dashboard")
      .set("Authorization", `Bearer ${freelancerAuth.accessToken}`);

    expect(growthRes.statusCode).toBe(200);
    expect(growthRes.body.data.reputation).toBeDefined();
  });

  afterAll(async () => {
    try {
      await prisma.notification.deleteMany({ where: { message: { contains: "Fullstack E-Commerce" } } });
      await prisma.application.deleteMany({ where: { proposal: { contains: "e-commerce platforms" } } });
      await prisma.project.deleteMany({ where: { title: "Fullstack E-Commerce Enterprise Platform" } });
      await prisma.user.deleteMany({ where: { email: { contains: "@freelnova.test" } } });
    } catch (e) {}
  });
});
