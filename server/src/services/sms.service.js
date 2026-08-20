const logger = require("../utils/logger");

/**
 * Sends an SMS to a phone number (Sandbox mock fallback).
 * @param {string} to - Recipient phone number (e.g. +917004937544)
 * @param {string} body - Message body
 * @returns {Promise<boolean>}
 */
async function sendSms(to, body) {
  // Sandbox fallback: print it prominently in the server terminal logs
  console.log("\n=======================================================");
  console.log(`💬 [SANDBOX MOCK SMS] Code sent to: ${to}`);
  console.log(`💬 SMS Content: ${body}`);
  console.log("=======================================================\n");
  return false;
}

module.exports = {
  sendSms,
};
