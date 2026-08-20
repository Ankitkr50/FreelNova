const { prisma } = require("../config/db");
const { generateNextLedgerId } = require("../utils/idGenerator");
const logger = require("../utils/logger");

/**
 * Records an immutable double-entry financial ledger record in PostgreSQL DB.
 */
const recordLedgerEntry = async (data) => {
  const {
    userId,
    projectId,
    paymentId,
    transactionType = "PAYMENT",
    grossAmount = 0,
    feeAmount = 0,
    netAmount = 0,
    currency = "INR",
    gatewayOrderId = null,
    gatewayPaymentId = null,
    idempotencyKey = null,
    referenceLedgerId = null,
    status = "COMPLETED",
    note = "",
    metadata = {},
  } = data;

  try {
    const ledgerId = await generateNextLedgerId(transactionType);

    const calculatedNet = netAmount !== 0 ? Number(netAmount) : Number(grossAmount) - Number(feeAmount);

    const entry = await prisma.financialLedger.create({
      data: {
        ledgerId,
        transactionType,
        grossAmount: Number(grossAmount),
        feeAmount: Number(feeAmount),
        netAmount: calculatedNet,
        currency,
        gatewayOrderId: gatewayOrderId ? String(gatewayOrderId) : null,
        gatewayPaymentId: gatewayPaymentId ? String(gatewayPaymentId) : null,
        idempotencyKey: idempotencyKey ? String(idempotencyKey) : null,
        userId: userId ? String(userId) : null,
        projectId: projectId ? String(projectId) : null,
        paymentId: paymentId ? String(paymentId) : null,
        referenceLedgerId: referenceLedgerId ? String(referenceLedgerId) : null,
        status: String(status),
        note: String(note),
        metadata,
      },
    });

    return entry;
  } catch (err) {
    logger.error("Failed to write to immutable database FinancialLedger:", err);
    return null;
  }
};

/**
 * Retrieves full audit ledger entries from database.
 */
const getFinancialLedgerEntries = async (filters = {}) => {
  const where = {};
  if (filters.userId) where.userId = filters.userId;
  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.transactionType) where.transactionType = filters.transactionType;

  const [totalEntries, ledger] = await Promise.all([
    prisma.financialLedger.count({ where }),
    prisma.financialLedger.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: filters.limit ? Number(filters.limit) : 100,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    }),
  ]);

  return {
    totalEntries,
    ledger,
  };
};

const listLedgerEntries = async (filters = {}) => {
  return getFinancialLedgerEntries(filters);
};

const runPaymentReconciliation = async () => {
  const [totalEntries, ledgers, payments] = await Promise.all([
    prisma.financialLedger.count(),
    prisma.financialLedger.findMany({ select: { grossAmount: true, feeAmount: true } }),
    prisma.payment.findMany({ where: { status: "captured" }, select: { amount: true } }),
  ]);

  const internalLedgerTotal = ledgers.reduce((acc, l) => acc + (l.grossAmount || 0), 0);
  const totalPlatformFees = ledgers.reduce((acc, l) => acc + (l.feeAmount || 0), 0);
  const totalPaymentsCaptured = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

  return {
    totalEntries,
    internalLedgerTotal,
    totalPlatformFees,
    totalPaymentsCaptured,
    discrepancy: Math.abs(internalLedgerTotal - totalPaymentsCaptured),
    reconciledAt: new Date().toISOString(),
  };
};

const createAdjustmentOrReversal = async ({ referenceLedgerId, transactionType = "ADJUSTMENT", amount, reason, adminUserId }) => {
  const entry = await recordLedgerEntry({
    referenceLedgerId,
    transactionType,
    grossAmount: Number(amount || 0),
    userId: adminUserId,
    note: reason || "Adjustment entry",
  });
  return entry;
};

module.exports = {
  recordLedgerEntry,
  getFinancialLedgerEntries,
  listLedgerEntries,
  runPaymentReconciliation,
  createAdjustmentOrReversal,
};
