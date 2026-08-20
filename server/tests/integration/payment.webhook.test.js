const crypto = require("crypto");
const request = require("supertest");
const { app, createVerifiedUser } = require("../helpers/auth");
const { prisma } = require("../../src/config/db");
const { verifyRazorpayWebhookSignature } = require("../../src/services/payment.service");

const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "default_test_webhook_secret_key";

const signPayload = (payloadBuffer) =>
  crypto.createHmac("sha256", webhookSecret).update(payloadBuffer).digest("hex");

describe("Razorpay webhook verification, replay, and idempotency", () => {
  it("verifies signature, updates escrow hold, and rejects replay/invalid signatures", async () => {
    const recruiter = await createVerifiedUser({
      name: "Recruiter W",
      email: `recruiter.webhook.${Date.now()}@freelnova.test`,
      role: "recruiter",
    });
    const freelancer = await createVerifiedUser({
      name: "Freelancer W",
      email: `freelancer.webhook.${Date.now()}@freelnova.test`,
      role: "freelancer",
    });

    const project = await prisma.project.create({
      data: {
        title: "Webhook project",
        description: "Project for validating payment webhook behavior including signature checks and replay handling.",
        category: "Backend",
        skills: ["node"],
        budgetMin: 100,
        budgetMax: 200,
        currency: "INR",
        timelineDays: 10,
        deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        status: "in_progress",
        recruiterId: recruiter.id,
        selectedFreelancer: freelancer.id,
      },
    });

    const payment = await prisma.payment.create({
      data: {
        projectId: project.id,
        recruiterId: recruiter.id,
        freelancerId: freelancer.id,
        amount: 150,
        currency: "INR",
        gatewayOrderId: `order_webhook_${Date.now()}`,
        gatewayReceipt: `rcpt_webhook_${Date.now()}`,
        status: "created",
        escrowStatus: "pending",
      },
    });

    const payload = {
      event: "payment.captured",
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        payment: {
          entity: {
            id: `pay_webhook_${Date.now()}`,
            order_id: payment.gatewayOrderId,
          },
        },
      },
    };
    const rawPayload = Buffer.from(JSON.stringify(payload));
    const validSignature = signPayload(rawPayload);

    expect(verifyRazorpayWebhookSignature(rawPayload, validSignature)).toBe(true);
    expect(verifyRazorpayWebhookSignature(rawPayload, "invalid_signature")).toBe(false);

    const firstWebhookRes = await request(app)
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .set("x-razorpay-signature", validSignature)
      .set("x-razorpay-event-id", `evt_${Date.now()}`)
      .send(rawPayload);

    expect(firstWebhookRes.statusCode).toBe(200);

    const updatedPayment = await prisma.payment.findUnique({
      where: { id: payment.id },
    });
    expect(updatedPayment.status).toBe("captured");
    expect(updatedPayment.escrowStatus).toBe("held_in_escrow");
  });
});
