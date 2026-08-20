const { prisma } = require("../../src/config/db");

jest.setTimeout(120000);

beforeAll(async () => {
  try {
    await prisma.$connect();
  } catch (error) {
    throw new Error(
      [
        "Test database connection failed.",
        `Original error: ${error.message}`,
      ].join(" ")
    );
  }
});

afterEach(async () => {
  try {
    await prisma.user.deleteMany({
      where: { email: { contains: ".test" } },
    });
  } catch (e) {
    // Ignore cleanup errors
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});
