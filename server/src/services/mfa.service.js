const { generateSecret, generateURI, verifySync } = require("otplib");
const QRCode = require("qrcode");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

/**
 * Generate MFA secret and QR code for user
 */
async function generateMfaSetup(user) {
  const secret = generateSecret();
  const issuer = "FreelNova Enterprise";
  const otpauth = generateURI({
    secret,
    label: user.email,
    issuer,
  });

  const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

  return {
    secret,
    otpauth,
    qrCodeDataUrl,
  };
}

/**
 * Verify 6-digit TOTP token against secret
 */
function verifyTotpToken(token, secret) {
  if (!token || !secret) return false;
  try {
    const result = verifySync({
      token: String(token).trim(),
      secret: String(secret).trim(),
    });
    return Boolean(result?.valid);
  } catch (err) {
    return false;
  }
}

/**
 * Generate 8 secure one-time recovery codes
 */
async function generateRecoveryCodes() {
  const rawCodes = [];
  const hashedCodes = [];

  for (let i = 0; i < 8; i++) {
    const raw = crypto.randomBytes(4).toString("hex").toUpperCase();
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4)}`;
    rawCodes.push(formatted);

    const hashed = await bcrypt.hash(formatted, 8);
    hashedCodes.push(hashed);
  }

  return {
    rawCodes,
    hashedCodes,
  };
}

/**
 * Validate and consume a recovery code
 */
async function consumeRecoveryCode(hashedCodes = [], inputCode) {
  if (!inputCode || !Array.isArray(hashedCodes) || hashedCodes.length === 0) {
    return { valid: false, remainingCodes: hashedCodes };
  }

  const cleanInput = inputCode.trim().toUpperCase();

  for (let i = 0; i < hashedCodes.length; i++) {
    const match = await bcrypt.compare(cleanInput, hashedCodes[i]);
    if (match) {
      const remainingCodes = [...hashedCodes];
      remainingCodes.splice(i, 1);
      return { valid: true, remainingCodes };
    }
  }

  return { valid: false, remainingCodes: hashedCodes };
}

module.exports = {
  generateMfaSetup,
  verifyTotpToken,
  generateRecoveryCodes,
  consumeRecoveryCode,
};
