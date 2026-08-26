const { prisma } = require("../src/config/db");
const { generateNextUserCodeAtomic } = require("../src/services/userCode.service");

describe("User Identity & Atomic ID Generation Tests", () => {
  beforeAll(async () => {
    // Ensure database connection
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("Atomic sequence generates monotonic zero-padded FIDs without reuse", async () => {
    const fid1 = await generateNextUserCodeAtomic("freelancer");
    const fid2 = await generateNextUserCodeAtomic("freelancer");
    expect(fid1).toMatch(/^FID\d{8}$/);
    expect(fid2).toMatch(/^FID\d{8}$/);

    const num1 = parseInt(fid1.replace("FID", ""), 10);
    const num2 = parseInt(fid2.replace("FID", ""), 10);
    expect(num2).toBe(num1 + 1);
  });

  test("Atomic sequence generates monotonic zero-padded AIDs for admin", async () => {
    const aid1 = await generateNextUserCodeAtomic("admin");
    const aid2 = await generateNextUserCodeAtomic("admin");
    expect(aid1).toMatch(/^AID\d{8}$/);
    expect(aid2).toMatch(/^AID\d{8}$/);

    const num1 = parseInt(aid1.replace("AID", ""), 10);
    const num2 = parseInt(aid2.replace("AID", ""), 10);
    expect(num2).toBe(num1 + 1);
  });

  test("Concurrent ID generations produce unique non-colliding codes", async () => {
    const promises = Array.from({ length: 10 }, () => generateNextUserCodeAtomic("freelancer"));
    const results = await Promise.all(promises);

    const uniqueSet = new Set(results);
    expect(uniqueSet.size).toBe(10);
  });
});
