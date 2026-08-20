const { prisma } = require("../config/db");
const logger = require("../utils/logger");
const { userCache } = require("../middleware/auth.middleware");

/**
 * Helper to format numeric ID into zero-padded code (e.g. 1 -> AID00000001, 2 -> FID00000002)
 */
function formatCode(prefix, index) {
  return `${prefix}${String(index).padStart(8, "0")}`;
}

/**
 * Re-sequence all user codes in PostgreSQL database to close gaps and ensure gapless sequential order.
 * - Primary Super Admin (fn.freelnova@gmail.com) is permanently pinned to AID00000001.
 * - All other Admins are assigned AID00000002, AID00000003, ... ordered by creation time.
 * - All normal Users (Freelancers & Clients) are assigned FID00000001, FID00000002, ... ordered by creation time.
 */
async function resequenceUserPools() {
  try {
    await userCache.clear();

    // 1. Process Admins / Staff Pool
    const staffAdmins = await prisma.user.findMany({
      where: { role: "admin" },
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, userCode: true },
    });

    let adminCounter = 2; // AID00000001 reserved for Primary Super Admin
    for (const admin of staffAdmins) {
      let targetCode;
      if (admin.email === "fn.freelnova@gmail.com") {
        targetCode = "AID00000001";
      } else {
        targetCode = formatCode("AID", adminCounter);
        adminCounter++;
      }

      if (admin.userCode !== targetCode) {
        await prisma.user.update({
          where: { id: admin.id },
          data: { userCode: targetCode },
        });
      }
    }

    // 2. Process Normal Users Pool (Freelancers + Clients)
    const normalUsers = await prisma.user.findMany({
      where: { role: { not: "admin" } },
      orderBy: { createdAt: "asc" },
      select: { id: true, userCode: true },
    });

    let fidCounter = 1;
    for (const normalUser of normalUsers) {
      const targetCode = formatCode("FID", fidCounter);
      fidCounter++;

      if (normalUser.userCode !== targetCode) {
        await prisma.user.update({
          where: { id: normalUser.id },
          data: { userCode: targetCode },
        });
      }
    }

    logger.info("resequence_user_pools_success", {
      totalAdmins: staffAdmins.length,
      totalUsers: normalUsers.length,
    });
  } catch (err) {
    logger.error("resequence_user_pools_error", { error: err.message });
  }
}

module.exports = {
  formatCode,
  resequenceUserPools,
};
