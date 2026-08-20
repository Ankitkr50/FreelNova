const request = require("supertest");
const { app, createVerifiedUser, loginUser } = require("../helpers/auth");

describe("Project apply/select transitions", () => {
  it("supports apply then select flow and blocks duplicate apply", async () => {
    const recruiter = await createVerifiedUser({
      name: "Recruiter A",
      email: "recruiter.project@skillbridge.test",
      role: "recruiter",
    });
    const freelancer = await createVerifiedUser({
      name: "Freelancer A",
      email: "freelancer.project@skillbridge.test",
      role: "freelancer",
    });

    const recruiterAuth = await loginUser({ email: recruiter.email });
    const freelancerAuth = await loginUser({ email: freelancer.email });

    const createProjectRes = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${recruiterAuth.accessToken}`)
      .send({
        title: "Build payment-ready recruiter dashboard",
        description:
          "Need a complete recruiter dashboard with robust auth, timeline, and applicant management.",
        category: "Web Development",
        skills: ["react", "node", "mongodb"],
        budgetMin: 200,
        budgetMax: 500,
        currency: "INR",
        timelineDays: 14,
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      });

    expect(createProjectRes.statusCode).toBe(201);
    const projectId = createProjectRes.body?.data?.id || createProjectRes.body?.data?._id;
    expect(projectId).toBeTruthy();

    const applyPayload = {
      proposal:
        "I have built similar recruiter marketplaces with production auth and workflow handling.",
      bidAmount: 300,
      deliveryDays: 12,
    };

    const applyRes = await request(app)
      .post(`/api/projects/${projectId}/apply`)
      .set("Authorization", `Bearer ${freelancerAuth.accessToken}`)
      .send(applyPayload);
    expect(applyRes.statusCode).toBe(201);

    const duplicateApplyRes = await request(app)
      .post(`/api/projects/${projectId}/apply`)
      .set("Authorization", `Bearer ${freelancerAuth.accessToken}`)
      .send(applyPayload);
    expect(duplicateApplyRes.statusCode).toBe(409);

    const selectRes = await request(app)
      .post(`/api/projects/${projectId}/select`)
      .set("Authorization", `Bearer ${recruiterAuth.accessToken}`)
      .send({
        freelancerId: freelancer.id || freelancer._id?.toString(),
        startNow: true,
      });

    expect(selectRes.statusCode).toBe(200);
    expect(selectRes.body?.data?.project?.status).toBe("in_progress");
    const selFreelancerId = selectRes.body?.data?.project?.selectedFreelancer?.id || selectRes.body?.data?.project?.selectedFreelancer?._id || selectRes.body?.data?.project?.selectedFreelancer;
    expect(selFreelancerId).toBe(freelancer.id || freelancer._id?.toString());
  });
});


