const request = require("supertest");
const { app, createVerifiedUser, loginUser } = require("../helpers/auth");
const { prisma } = require("../../src/config/db");

jest.mock("../../src/services/payment.service", () => {
  const actual = jest.requireActual("../../src/services/payment.service");
  return {
    ...actual,
    createRazorpayOrder: jest.fn(async ({ amountPaise, currency, receipt }) => ({
      id: `order_${receipt}`,
      amount: amountPaise,
      currency,
      receipt,
      status: "created",
    })),
  };
});

const { createRazorpayOrder } = require("../../src/services/payment.service");

describe("Payment create/release business rules", () => {
  it("enforces idempotent create and guarded release conditions", async () => {
    const recruiter = await createVerifiedUser({
      name: "Recruiter P",
      email: `recruiter.payment.${Date.now()}@freelnova.test`,
      role: "recruiter",
    });
    const freelancer = await createVerifiedUser({
      name: "Freelancer P",
      email: `freelancer.payment.${Date.now()}@freelnova.test`,
      role: "freelancer",
    });
    const admin = await createVerifiedUser({
      name: "Admin P",
      email: `admin.payment.${Date.now()}@freelnova.test`,
      role: "admin",
      adminRole: "SUPER_ADMIN",
    });

    const recruiterAuth = await loginUser({ email: recruiter.email });
    const freelancerAuth = await loginUser({ email: freelancer.email });
    const adminAuth = await loginUser({ email: admin.email });

    const createProjectRes = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${recruiterAuth.accessToken}`)
      .send({
        title: "Escrow-ready backend milestone project",
        description: "Need secure escrow and payout automation with webhooks and anti-replay protections.",
        category: "Backend",
        skills: ["node", "postgresql", "payments"],
        budgetMin: 500,
        budgetMax: 900,
        currency: "INR",
        timelineDays: 20,
        deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      });

    const projectId = createProjectRes.body?.data?.id;

    await request(app)
      .post(`/api/projects/${projectId}/apply`)
      .set("Authorization", `Bearer ${freelancerAuth.accessToken}`)
      .send({
        proposal: "I can deliver escrow lifecycle APIs with strict business rule validation and webhook security.",
        bidAmount: 700,
        deliveryDays: 18,
      });

    await request(app)
      .post(`/api/projects/${projectId}/select`)
      .set("Authorization", `Bearer ${recruiterAuth.accessToken}`)
      .send({ freelancerId: freelancer.id });

    const createPaymentPayload = {
      projectId,
      amount: 700,
      currency: "INR",
      idempotencyKey: `idem_freelnova_${Date.now()}`,
    };

    const createPaymentRes = await request(app)
      .post("/api/payments/create")
      .set("Authorization", `Bearer ${recruiterAuth.accessToken}`)
      .set("x-idempotency-key", createPaymentPayload.idempotencyKey)
      .send(createPaymentPayload);

    expect(createPaymentRes.statusCode).toBe(201);
    expect(createRazorpayOrder).toHaveBeenCalledTimes(1);

    const paymentId = createPaymentRes.body?.data?.payment?.id;
    expect(paymentId).toBeTruthy();

    const createPaymentAgainRes = await request(app)
      .post("/api/payments/create")
      .set("Authorization", `Bearer ${recruiterAuth.accessToken}`)
      .set("x-idempotency-key", createPaymentPayload.idempotencyKey)
      .send(createPaymentPayload);
    expect(createPaymentAgainRes.statusCode).toBe(200);

    const releaseBeforeCapture = await request(app)
      .post("/api/payments/release")
      .set("Authorization", `Bearer ${recruiterAuth.accessToken}`)
      .send({ paymentId, forceRelease: false, releaseNote: "release attempt before capture" });
    expect(releaseBeforeCapture.statusCode).toBe(400);

    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: "captured", escrowStatus: "held_in_escrow" },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "in_progress" },
    });

    const adminForceRelease = await request(app)
      .post("/api/payments/release")
      .set("Authorization", `Bearer ${adminAuth.accessToken}`)
      .send({ paymentId, forceRelease: true, releaseNote: "admin override release" });
    expect(adminForceRelease.statusCode).toBe(200);
    expect(adminForceRelease.body?.data?.payment?.escrowStatus).toBe("released");
  });
});
