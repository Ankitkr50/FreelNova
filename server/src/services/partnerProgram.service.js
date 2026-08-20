// In-memory partner applications store
const partnersStore = [];

/**
 * Registers an enterprise or technology partner application.
 */
const registerPartnerProgram = async (userId, payload) => {
  const { partnerName, partnerType = "AGENCY" } = payload;

  const partnerId = `partner-${Date.now()}`;
  const partner = {
    id: partnerId,
    userId,
    partnerName: String(partnerName).trim(),
    partnerType, // AGENCY | RECRUITER | SAAS_TECH_PARTNER
    attributionCode: `FN_PARTNER_${partnerName.toUpperCase().replace(/\s+/g, "_")}`,
    status: "APPROVED",
    totalAttributedHires: 14,
    createdAt: new Date().toISOString(),
  };

  partnersStore.unshift(partner);
  return partner;
};

module.exports = {
  registerPartnerProgram,
};
