const { prisma } = require("../config/db");
const logger = require("../utils/logger");

/**
 * Helper to format numeric index into zero-padded code (e.g. 1 -> AID00000001, 5 -> FID00000005)
 */
function formatCode(prefix, index) {
  return `${prefix}${String(index).padStart(8, "0")}`;
}

/**
 * Generate next monotonically increasing atomic user code (FID or AID).
 * Uses PostgreSQL atomic increment via UserSequence model.
 */
async function generateNextUserCodeAtomic(role = "freelancer") {
  const isTargetAdmin = role === "admin" || role === "ADMIN" || role === "SUPER_ADMIN";
  const prefix = isTargetAdmin ? "AID" : "FID";

  let seq = await prisma.userSequence.findUnique({
    where: { name: prefix },
  });

  if (!seq) {
    const existingCodes = await prisma.user.findMany({
      where: {
        userCode: { startsWith: prefix },
      },
      select: { userCode: true },
    });

    let maxIndex = 0;
    for (const u of existingCodes) {
      if (u.userCode) {
        const match = u.userCode.match(new RegExp(`^${prefix}(\\d+)$`));
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxIndex) {
            maxIndex = num;
          }
        }
      }
    }

    const initialNextValue = maxIndex + 1;

    try {
      seq = await prisma.userSequence.create({
        data: {
          name: prefix,
          nextValue: initialNextValue + 1,
        },
      });
      return formatCode(prefix, initialNextValue);
    } catch (err) {
      seq = await prisma.userSequence.findUnique({ where: { name: prefix } });
    }
  }

  const updatedSeq = await prisma.userSequence.update({
    where: { name: prefix },
    data: {
      nextValue: { increment: 1 },
    },
  });

  const assignedValue = updatedSeq.nextValue - 1;
  return formatCode(prefix, assignedValue);
}

/**
 * Re-sequence all user codes in PostgreSQL database to close gaps and ensure gapless sequential order.
 * - Primary Super Admin (fn.freelnova@gmail.com) is permanently pinned to AID00000001.
 * - All other Admins are assigned AID00000002, AID00000003, ... ordered by creation time.
 * - All normal Users (Freelancers & Clients) are assigned FID00000001, FID00000002, ... ordered by creation time.
 */
async function resequenceUserPools() {
  try {
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

    await prisma.userSequence.upsert({
      where: { name: "AID" },
      update: { nextValue: adminCounter },
      create: { name: "AID", nextValue: adminCounter },
    });

    // 2. Process Normal Users Pool (Freelancers + Clients)
    const normalUsers = await prisma.user.findMany({
      where: { role: { not: "admin" } },
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, userCode: true, username: true },
    });

    // Pass 1: Clear userCodes with short temporary prefix to avoid unique constraint collisions
    for (let i = 0; i < normalUsers.length; i++) {
      const u = normalUsers[i];
      await prisma.user.update({
        where: { id: u.id },
        data: {
          userCode: `TMP_${String(i).padStart(4, "0")}`,
          username: u.username && u.username.toUpperCase().startsWith("FID") ? `TMP_UN_${String(i).padStart(4, "0")}` : u.username,
        },
      });
    }

    // Pass 2: Assign final sequential userCodes & default usernames
    let fidCounter = 1;
    for (const normalUser of normalUsers) {
      const targetCode = formatCode("FID", fidCounter);
      fidCounter++;

      const isDefaultUsername =
        !normalUser.username ||
        normalUser.username.toUpperCase().startsWith("FID") ||
        normalUser.username.toUpperCase().startsWith("AID") ||
        normalUser.username.startsWith("TMP_UN_") ||
        normalUser.username === normalUser.userCode;

      await prisma.user.update({
        where: { id: normalUser.id },
        data: {
          userCode: targetCode,
          username: isDefaultUsername ? null : normalUser.username,
        },
      });
    }

    await prisma.userSequence.upsert({
      where: { name: "FID" },
      update: { nextValue: fidCounter },
      create: { name: "FID", nextValue: fidCounter },
    });

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
  generateNextUserCodeAtomic,
  resequenceUserPools,
};
