const { prisma } = require("./config/db");
const { userCache } = require("./middleware/auth.middleware");

async function updateSuperAdminUsername() {
  console.log("\n=== UPDATING SUPER ADMIN USERNAME IN DATABASE ===");
  try {
    const updated = await prisma.user.updateMany({
      where: { email: "fn.freelnova@gmail.com" },
      data: {
        username: "admin_freelnova",
        userCode: "AID00000001",
      },
    });
    console.log(`✅ UPDATED ${updated.count} RECORD(S) IN DB!`);

    await userCache.clear();
    console.log("✅ USER CACHE CLEARED!");

    const admin = await prisma.user.findFirst({
      where: { email: "fn.freelnova@gmail.com" },
      select: { id: true, name: true, email: true, username: true, userCode: true, role: true },
    });
    console.log("CURRENT SUPER ADMIN RECORD IN DB:");
    console.log(JSON.stringify(admin, null, 2));
    console.log("================================================\n");
  } catch (err) {
    console.error("Update error:", err.message);
  } finally {
    process.exit(0);
  }
}

updateSuperAdminUsername();
