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
 * Uses PostgreSQL atomic increment via UserSequence model to ensure:
 * - High concurrency safety & zero collisions
 * - Deleted IDs are NEVER reused (Requirement #4, #5, #7, #10)
 * - Display IDs remain permanent and immutable
 */
async function generateNextUserCodeAtomic(role = "freelancer") {
  const isTargetAdmin = role === "admin" || role === "ADMIN" || role === "SUPER_ADMIN";
  const prefix = isTargetAdmin ? "AID" : "FID";

  let seq = await prisma.userSequence.findUnique({
    where: { name: prefix },
  });

  if (!seq) {
    // Find highest existing numerical suffix in DB to initialize sequence safely without overwriting
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
      // If concurrent initialization occurred, fallback to update
      seq = await prisma.userSequence.findUnique({ where: { name: prefix } });
    }
  }

  // PostgreSQL atomic column increment
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
 * Deprecated gap-closing resequencer.
 * Retained as a safe no-op to preserve immutable production user IDs (Requirement #11, #14).
 */
async function resequenceUserPools() {
  logger.info("resequence_user_pools_skipped", {
    reason: "Display IDs are permanent and immutable. Gap closure is disabled for data integrity.",
  });
}

module.exports = {
  formatCode,
  generateNextUserCodeAtomic,
  resequenceUserPools,
};
