export const calculateProfileCompletion = (user) => {
  if (!user) return 0;
  let totalScore = 0;
  const isClient = user.role === "recruiter" || user.role === "client";

  const nameVal = user.name || user.fullName;
  const emailVal = user.email;
  const phoneVal = user.phone || user.phoneNumber;
  const headlineVal = user.headline;
  const locationVal = user.location;
  const bioVal = user.bio;

  // 1. Basic Info (Name, Email, Phone, Headline, Location) - 20 points
  if (nameVal) totalScore += 4;
  if (emailVal) totalScore += 4;
  if (phoneVal) totalScore += 4;
  if (headlineVal) totalScore += 4;
  if (locationVal) totalScore += 4;

  // 2. Bio / Summary - 10 points
  if (bioVal && bioVal.trim().length > 5) totalScore += 10;

  if (isClient) {
    if (user.companyName) totalScore += 25;
    if (user.companyId) totalScore += 25;
    if (user.category) totalScore += 20;
  } else {
    // 3. Technical Skills - 10 points
    if (user.skills && user.skills.length > 0) totalScore += 10;

    // 4. Hourly Rate - 10 points
    if (user.hourlyRate && Number(user.hourlyRate) > 0) totalScore += 10;

    // 5. Experience / Education - 10 points
    if (user.experienceYears || user.education || user.schoolOrCollege) totalScore += 10;

    // 6. Work Experience History - 10 points
    if ((user.workExperience && user.workExperience.length > 0) || (user.experience && user.experience.length > 0)) totalScore += 10;

    // 7. Portfolio Links - 5 points
    if (user.portfolioLinks && user.portfolioLinks.length > 0) totalScore += 5;

    // 8. Works & Gigs Portfolio - 10 points
    if (user.portfolioItems && user.portfolioItems.length > 0) totalScore += 10;

    // 9. Onboarding Verification Details (Aadhaar, PAN, Category, Drive link) - 10 points
    const hasVerificationDoc = user.aadhaarCard || user.panCard || user.aadhaarCardPhoto || user.verificationId || user.driveLink;
    if (hasVerificationDoc || user.category) totalScore += 10;

    // 10. Payout & Bank Details (Bank Name, Account No, IFSC, UPI ID) - 5 points
    if (user.bankAccountNo || user.upiId || user.bankName || user.bankHolderName || user.bankIfsc) totalScore += 5;
  }

  return Math.min(totalScore, 100);
};

export const getMissingFields = (user) => {
  if (!user) return [];
  const missing = [];
  const isClient = user.role === "recruiter" || user.role === "client";

  const nameVal = user.name || user.fullName;
  const phoneVal = user.phone || user.phoneNumber;

  if (!nameVal) missing.push("Full Name");
  if (!phoneVal) missing.push("Phone Number");
  if (!user.headline) missing.push("Headline");
  if (!user.location) missing.push("Location");
  if (!user.bio || user.bio.trim().length < 5) missing.push("Bio / Summary");

  if (isClient) {
    if (!user.companyName) missing.push("Company Name");
    if (!user.companyId) missing.push("Company ID");
    if (!user.category) missing.push("Category");
  } else {
    if (!user.skills || user.skills.length === 0) missing.push("Skills Tags");
    if (!user.hourlyRate || Number(user.hourlyRate) === 0) missing.push("Hourly Rate");
    if (!user.experienceYears && !user.education && !user.schoolOrCollege) missing.push("Total Experience / Education");
    if ((!user.workExperience || user.workExperience.length === 0) && (!user.experience || user.experience.length === 0)) missing.push("Work Experience History");
    if (!user.portfolioLinks || user.portfolioLinks.length === 0) missing.push("Portfolio Links");
    if (!user.portfolioItems || user.portfolioItems.length === 0) missing.push("Works & Gigs Portfolio");
    const hasVerificationDoc = user.aadhaarCard || user.panCard || user.aadhaarCardPhoto || user.verificationId || user.driveLink;
    if (!user.category && !hasVerificationDoc) missing.push("Verification Details");
    if (!user.bankAccountNo && !user.upiId && !user.bankName) missing.push("Payout & Bank Details");
  }

  return missing;
};
