const { prisma } = require("./config/db");

async function checkRealRenderDb() {
  console.log("\n=== QUERYING REAL RENDER DB (ep-sparkling-fire-atgnakxb) ===");
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        userCode: true,
        role: true,
        createdAt: true,
      },
    });
    console.log(`TOTAL USERS FOUND: ${users.length}`);
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("DB Error:", err.message);
  } finally {
    process.exit(0);
  }
}

checkRealRenderDb();
