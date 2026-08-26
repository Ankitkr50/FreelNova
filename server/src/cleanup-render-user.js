const { prisma } = require("./config/db");

async function cleanupUser() {
  try {
    const res = await prisma.user.deleteMany({
      where: {
        email: { equals: "ankitkumar829301@gmail.com", mode: "insensitive" },
      },
    });
    console.log(`\n✅ Cleaned up ${res.count} user account(s) for ankitkumar829301@gmail.com!\n`);
  } catch (err) {
    console.error("Cleanup error:", err.message);
  } finally {
    process.exit(0);
  }
}

cleanupUser();
