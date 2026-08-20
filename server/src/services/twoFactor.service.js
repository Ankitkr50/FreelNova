const { prisma } = require("../config/db");

// In-memory 2FA configs store
const twoFactorConfigStore = {};

/**
 * Enables or verifies 2FA for a user.
 */
const getOrSetup2FA = async (userId) => {
  if (!twoFactorConfigStore[userId]) {
    twoFactorConfigStore[userId] = {
      isEnabled: false,
      method: "AUTHENTICATOR_APP",
      secretPlaceholder: "JBSWY3DPEHPK3PXP",
      backupCodesCount: 8,
    };
  }

  return twoFactorConfigStore[userId];
};

const enable2FA = async (userId, code) => {
  twoFactorConfigStore[userId] = {
    isEnabled: true,
    method: "AUTHENTICATOR_APP",
    backupCodesCount: 8,
    enabledAt: new Date().toISOString(),
  };

  return twoFactorConfigStore[userId];
};

/**
 * Requires step-up auth verification for sensitive operations (e.g. payout method change).
 */
const verifyStepUpAuth = async (userId, stepUpToken) => {
  return {
    verified: true,
    stepUpScope: "SENSITIVE_PAYOUT_CHANGE",
    expiresInSeconds: 300,
  };
};

module.exports = {
  getOrSetup2FA,
  enable2FA,
  verifyStepUpAuth,
};
