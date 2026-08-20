const { prisma } = require("../config/db");

/**
 * Standard Sequential 8-Digit Zero-Padded Entity ID Generator
 *
 * Prefixes:
 *   - Project:              PID00000001
 *   - Support Ticket:       TKT00000001
 *   - Refund / Reversal:    REF00000001
 *   - Financial Ledger:     LED00000001
 *   - Dispute:              DIS00000001
 *   - Payout / Withdrawal:  WID00000001
 *   - Payment / Escrow:     PAY00000001
 *   - Staff Invitation:     INV00000001
 */

async function generateNextProjectCode() {
  const count = await prisma.project.count();
  return `PID${String(count + 1).padStart(8, "0")}`;
}

async function generateNextTicketNumber(category = "") {
  const count = await prisma.supportTicket.count();
  if (category && category.toUpperCase() === "REFUND") {
    return `REF${String(count + 1).padStart(8, "0")}`;
  }
  return `TKT${String(count + 1).padStart(8, "0")}`;
}

async function generateNextLedgerId(transactionType = "") {
  const count = await prisma.financialLedger.count();
  if (transactionType && (transactionType === "REFUND" || transactionType === "REVERSAL")) {
    return `REF${String(count + 1).padStart(8, "0")}`;
  }
  return `LED${String(count + 1).padStart(8, "0")}`;
}

async function generateNextDisputeCode() {
  const count = await prisma.dispute.count();
  return `DIS${String(count + 1).padStart(8, "0")}`;
}

async function generateNextPayoutCode() {
  const count = await prisma.withdrawalRequest ? await prisma.withdrawalRequest.count() : 0;
  return `WID${String(count + 1).padStart(8, "0")}`;
}

async function generateNextPaymentCode() {
  const count = await prisma.payment.count();
  return `PAY${String(count + 1).padStart(8, "0")}`;
}

module.exports = {
  generateNextProjectCode,
  generateNextTicketNumber,
  generateNextLedgerId,
  generateNextDisputeCode,
  generateNextPayoutCode,
  generateNextPaymentCode,
};
