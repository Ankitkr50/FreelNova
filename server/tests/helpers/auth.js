const request = require("supertest");
const bcrypt = require("bcryptjs");
const { prisma } = require("../../src/config/db");
const app = require("../../src/app");

const defaultPassword = "Strong@123";

const createVerifiedUser = async ({
  name,
  email,
  role = "freelancer",
  adminRole,
  adminPermissions = [],
  password = defaultPassword,
} = {}) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const userEmail = email || `${role}.${Date.now()}@freelnova.test`;

  return prisma.user.upsert({
    where: { email: userEmail },
    update: {
      name: name || `${role}-user`,
      role,
      adminRole: adminRole || (role === "admin" ? "SUPER_ADMIN" : null),
      adminPermissions: adminPermissions || [],
      staffStatus: "ACTIVE",
      isEmailVerified: true,
      profileCompleted: true,
      password: hashedPassword,
    },
    create: {
      name: name || `${role}-user`,
      email: userEmail,
      role,
      adminRole: adminRole || (role === "admin" ? "SUPER_ADMIN" : null),
      adminPermissions: adminPermissions || [],
      staffStatus: "ACTIVE",
      isEmailVerified: true,
      profileCompleted: true,
      password: hashedPassword,
    },
  });
};

const loginUser = async ({ email, password = defaultPassword }) => {
  const response = await request(app).post("/api/auth/login").send({ email, password });
  if (response.statusCode !== 200) {
    throw new Error(`Login failed for ${email}: ${response.statusCode} ${response.text}`);
  }

  return {
    response,
    accessToken: response.body?.data?.accessToken,
    refreshToken: response.body?.data?.refreshToken,
  };
};

module.exports = {
  app,
  defaultPassword,
  createVerifiedUser,
  loginUser,
};
