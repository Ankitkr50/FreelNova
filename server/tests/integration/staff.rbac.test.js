const request = require("supertest");
const { app, createVerifiedUser, loginUser } = require("../helpers/auth");
const { ADMIN_ROLES, ROLE_PERMISSIONS } = require("../../src/constants/permissions");

describe("Admin RBAC & Staff Management System", () => {
  it("enforces granular permissions across roles and supports invitation workflow", async () => {
    // 1. Create Super Admin
    const timestamp = Date.now();
    const superAdmin = await createVerifiedUser({
      name: "Super Administrator",
      email: `superadmin.${timestamp}@freelnova.test`,
      role: "admin",
      adminRole: ADMIN_ROLES.SUPER_ADMIN,
    });
    const superAdminAuth = await loginUser({ email: superAdmin.email });

    // 2. Create Finance Admin
    const financeAdmin = await createVerifiedUser({
      name: "Finance Officer",
      email: `finance.${timestamp}@freelnova.test`,
      role: "admin",
      adminRole: ADMIN_ROLES.FINANCE_ADMIN,
      adminPermissions: ROLE_PERMISSIONS[ADMIN_ROLES.FINANCE_ADMIN],
    });
    const financeAuth = await loginUser({ email: financeAdmin.email });

    // 3. Create Moderator
    const moderator = await createVerifiedUser({
      name: "Content Moderator",
      email: "moderator.rbac@freelnova.test",
      role: "admin",
      adminRole: ADMIN_ROLES.MODERATOR,
      adminPermissions: ROLE_PERMISSIONS[ADMIN_ROLES.MODERATOR],
    });
    const moderatorAuth = await loginUser({ email: moderator.email });

    // 4. Test Super Admin can access staff list
    const superStaffRes = await request(app)
      .get("/api/admin/staff")
      .set("Authorization", `Bearer ${superAdminAuth.accessToken}`);
    expect(superStaffRes.statusCode).toBe(200);
    expect(superStaffRes.body.success).toBe(true);
    expect(superStaffRes.body.data.staff).toBeDefined();

    // 5. Test Finance Admin is FORBIDDEN (403) from staff management
    const financeStaffRes = await request(app)
      .get("/api/admin/staff")
      .set("Authorization", `Bearer ${financeAuth.accessToken}`);
    expect(financeStaffRes.statusCode).toBe(403);

    // 6. Test Moderator is FORBIDDEN (403) from payments
    const modPaymentsRes = await request(app)
      .get("/api/admin/payments")
      .set("Authorization", `Bearer ${moderatorAuth.accessToken}`);
    expect(modPaymentsRes.statusCode).toBe(403);

    // 7. Super Admin invites a new Support Staff member
    const inviteRes = await request(app)
      .post("/api/admin/staff/invite")
      .set("Authorization", `Bearer ${superAdminAuth.accessToken}`)
      .send({
        name: "Pooja Support",
        email: "pooja.support@freelnova.test",
        role: ADMIN_ROLES.SUPPORT_STAFF,
        permissions: ROLE_PERMISSIONS[ADMIN_ROLES.SUPPORT_STAFF],
      });
    expect(inviteRes.statusCode).toBe(201);
    const inviteToken = inviteRes.body.data.token || (inviteRes.body.data.inviteUrl ? new URL(inviteRes.body.data.inviteUrl).searchParams.get("token") : null);
    expect(inviteToken).toBeTruthy();

    // 8. Public validation of invitation token
    const tokenDetailsRes = await request(app)
      .get(`/api/admin/staff/invitations/${inviteToken}`);
    expect(tokenDetailsRes.statusCode).toBe(200);
    expect(tokenDetailsRes.body.data.email).toBe("pooja.support@freelnova.test");
    expect(tokenDetailsRes.body.data.role).toBe(ADMIN_ROLES.SUPPORT_STAFF);

    // 9. Candidate accepts invitation and sets password
    const acceptRes = await request(app)
      .post("/api/admin/staff/accept-invite")
      .send({
        token: inviteToken,
        password: "SuperSecureStaffPassword123!",
      });
    expect(acceptRes.statusCode).toBe(200);
    expect(acceptRes.body.data.accessToken).toBeDefined();
    expect(acceptRes.body.data.user.adminRole).toBe(ADMIN_ROLES.SUPPORT_STAFF);

    // 10. Test System Health endpoint
    const healthRes = await request(app)
      .get("/api/admin/system/health")
      .set("Authorization", `Bearer ${superAdminAuth.accessToken}`);
    expect(healthRes.statusCode).toBe(200);
    expect(healthRes.body.data.database.status).toBe("healthy");

    // 11. Test Audit Logs endpoint
    const auditRes = await request(app)
      .get("/api/admin/audit-logs")
      .set("Authorization", `Bearer ${superAdminAuth.accessToken}`);
    expect(auditRes.statusCode).toBe(200);
    expect(auditRes.body.data.logs.length).toBeGreaterThan(0);
  });
});
