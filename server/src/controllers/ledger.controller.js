const ApiError = require("../utils/apiError");
const catchAsync = require("../utils/catchAsync");
const ledgerService = require("../services/ledger.service");
const { logAdminAction } = require("../services/audit.service");

/**
 * List ledger records
 */
const getLedgerEntries = catchAsync(async (req, res) => {
  const { page = 1, limit = 30, transactionType, search, startDate, endDate } = req.query;

  const result = await ledgerService.listLedgerEntries({
    page,
    limit,
    transactionType,
    search,
    startDate,
    endDate,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Run Payment Reconciliation Report
 */
const getReconciliationReport = catchAsync(async (req, res) => {
  const report = await ledgerService.runPaymentReconciliation();

  res.status(200).json({
    success: true,
    data: report,
  });
});

/**
 * Create Financial Adjustment / Reversal
 */
const createAdjustment = catchAsync(async (req, res) => {
  const { referenceLedgerId, transactionType, amount, reason } = req.body;

  if (!referenceLedgerId || !reason) {
    throw new ApiError(400, "Reference ledger ID and reason are required.");
  }

  const entry = await ledgerService.createAdjustmentOrReversal({
    referenceLedgerId,
    transactionType: transactionType || "ADJUSTMENT",
    amount,
    reason,
    adminUserId: req.user.id,
  });

  await logAdminAction({
    adminUserId: req.user.id,
    action: "FINANCIAL_ADJUSTMENT_CREATED",
    targetType: "FINANCIAL_LEDGER",
    targetId: entry.ledgerId,
    metadata: { referenceLedgerId, transactionType, amount, reason },
    req,
  });

  res.status(201).json({
    success: true,
    message: "Financial adjustment entry successfully appended to ledger.",
    data: { entry },
  });
});

module.exports = {
  getLedgerEntries,
  getReconciliationReport,
  createAdjustment,
};
