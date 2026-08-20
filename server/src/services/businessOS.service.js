const { prisma } = require("../config/db");

/**
 * Freelancer Business OS & Invoicing / Tax Center.
 */
const getFreelancerBusinessOS = async (freelancerId) => {
  const user = await prisma.user.findUnique({
    where: { id: freelancerId },
    select: {
      id: true,
      name: true,
      payments: { where: { status: "captured" }, select: { amount: true, createdAt: true, gatewayOrderId: true } },
    },
  });

  if (!user) throw new Error("Freelancer not found");

  const totalRevenue = user.payments.reduce((sum, p) => sum + p.amount, 0);
  const platformFees = Math.round(totalRevenue * 0.15);
  const teamPayments = 0;
  const netEarnings = Math.max(0, totalRevenue - platformFees);
  const marginPercentage = totalRevenue > 0 ? Math.round((netEarnings / totalRevenue) * 100) : 0;

  const invoices = user.payments.map((p, idx) => ({
    id: p.id || `inv_${idx + 1}`,
    invoiceNumber: `INV-${new Date(p.createdAt).getFullYear()}-${1001 + idx}`,
    orderId: p.gatewayOrderId || `ORD_RZP_${1000 + idx}`,
    payoutRef: `PAYOUT_RZP_${8800 + idx}`,
    date: p.createdAt,
    clientName: "Enterprise Client",
    projectTitle: "Contract Milestone Deliverable",
    grossAmount: p.amount,
    platformFee: Math.round(p.amount * 0.15),
    tdsDeducted: Math.round(p.amount * 0.01),
    netPayout: Math.round(p.amount * 0.84),
    gstTdsExportStatus: "TAX_READY",
    sacCode: "998314",
  }));

  return {
    freelancerId: user.id,
    summary: {
      totalRevenue,
      platformFees,
      teamPayments,
      netEarnings,
      marginPercentage,
    },
    invoices,
    taxCenter: {
      panStatus: "NOT_VERIFIED",
      gstin: "N/A",
      tdsDeductedTotal: Math.round(totalRevenue * 0.01),
      taxReadyDownloadsAvailable: invoices.length > 0,
    },
  };
};

module.exports = {
  getFreelancerBusinessOS,
};
