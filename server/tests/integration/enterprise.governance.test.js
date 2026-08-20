const request = require("supertest");
const { app, createVerifiedUser, loginUser } = require("../helpers/auth");
const { generateSecret, generateSync } = require("otplib");

describe("Enterprise Super Admin Platform Governance Suite", () => {
  it("manages active sessions, 2FA, immutable ledger, reconciliation, and support tickets", async () => {
    // 1. Create Super Admin
    const superAdmin = await createVerifiedUser({
      name: "Enterprise Super Admin",
      email: "enterprise.super@freelnova.test",
      role: "admin",
      adminRole: "SUPER_ADMIN",
    });
    const superAuth = await loginUser({ email: superAdmin.email });

    // 2. Active Session Management
    const sessionsRes = await request(app)
      .get("/api/admin/security/sessions")
      .set("Authorization", `Bearer ${superAuth.accessToken}`);
    expect(sessionsRes.statusCode).toBe(200);
    expect(sessionsRes.body.data.sessions).toBeDefined();

    // 3. 2FA Setup
    const mfaSetupRes = await request(app)
      .post("/api/admin/security/mfa/setup")
      .set("Authorization", `Bearer ${superAuth.accessToken}`);
    expect(mfaSetupRes.statusCode).toBe(200);
    expect(mfaSetupRes.body.data.qrCodeDataUrl).toBeDefined();
    expect(mfaSetupRes.body.data.manualEntryKey).toBeDefined();

    // Generate valid TOTP token with the secret key
    const secret = mfaSetupRes.body.data.manualEntryKey;
    const totpToken = generateSync({ secret });

    const mfaVerifyRes = await request(app)
      .post("/api/admin/security/mfa/verify")
      .set("Authorization", `Bearer ${superAuth.accessToken}`)
      .send({ code: totpToken });
    expect(mfaVerifyRes.statusCode).toBe(200);
    expect(mfaVerifyRes.body.data.recoveryCodes.length).toBe(8);

    // 4. Financial Ledger & Reconciliation
    const ledgerEntry = await require("../../src/services/ledger.service").recordLedgerEntry({
      transactionType: "PAYMENT",
      grossAmount: 5000,
      feeAmount: 750,
      gatewayOrderId: "order_test_recon_101",
      gatewayPaymentId: "pay_test_recon_101",
      note: "Test marketplace milestone payment",
    });
    expect(ledgerEntry.ledgerId).toBeDefined();

    const reconRes = await request(app)
      .get("/api/admin/ledger/reconciliation")
      .set("Authorization", `Bearer ${superAuth.accessToken}`);
    expect(reconRes.statusCode).toBe(200);
    expect(reconRes.body.data.internalLedgerTotal).toBeGreaterThan(0);

    // 5. Support Tickets
    const ticket = await require("../../src/config/db").prisma.supportTicket.create({
      data: {
        ticketNumber: "TKT-TEST-001",
        userId: superAdmin.id,
        category: "PAYMENT",
        priority: "HIGH",
        status: "OPEN",
        subject: "Escrow release assistance",
        description: "Need help verifying payment milestone delivery",
      },
    });

    const msgRes = await request(app)
      .post(`/api/admin/tickets/${ticket.id}/messages`)
      .set("Authorization", `Bearer ${superAuth.accessToken}`)
      .send({
        message: "Internal inspection note: client submitted proof of delivery.",
        isInternalNote: true,
      });
    expect(msgRes.statusCode).toBe(201);
    expect(msgRes.body.data.message.isInternalNote).toBe(true);

    // 6. Feature Flags
    const flagsRes = await request(app)
      .get("/api/admin/feature-flags")
      .set("Authorization", `Bearer ${superAuth.accessToken}`);
    expect(flagsRes.statusCode).toBe(200);
    expect(flagsRes.body.data.flags.length).toBeGreaterThan(0);
  });
});
