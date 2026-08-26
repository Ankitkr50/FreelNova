
const { prisma } = require("./config/db");

async function checkAllGoogleIds() {
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { googleId: { not: null } },
          { email: { contains: "ankit" } },
          { role: "freelancer" },
        ],
      },
    });
    console.log("\n=== USERS MATCHING GOOGLE ID / ANKIT / FREELANCER ===");
    console.log(JSON.stringify(users, null, 2));
    console.log("====================================================\n");
  } catch (e) {
    console.error(e.message);
  } finally {
    process.exit(0);
  }
}

checkAllGoogleIds();
