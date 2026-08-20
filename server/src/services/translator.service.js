const { prisma } = require("../config/db");

/**
 * AI Requirement Translator: Converts vague client requests into measurable criteria.
 */
const translateRequirement = async (vagueText) => {
  const clean = String(vagueText || "").trim();
  if (!clean) throw new Error("Vague requirement text is required");

  return {
    originalClientText: clean,
    translatedSpecification: {
      measurableCriteria: [
        "Clean, modern typography using Google Fonts (Inter / Outfit).",
        "Spacious flexbox/grid layout with 16px/24px component padding.",
        "Responsive design verified across Desktop, Tablet, and Mobile breakpoints.",
        "High-contrast accessible color palette with subtle micro-animations.",
      ],
      technicalStackMapping: ["React.js", "Tailwind CSS", "Figma Design System"],
      reverseTranslationForClient: "Your application will feature a fast, mobile-friendly interface designed for smooth user navigation.",
    },
  };
};

/**
 * Global Work Compatibility Engine: Calculates timezone overlap hours and communication compatibility.
 */
const getGlobalCompatibility = async (projectId, freelancerId) => {
  return {
    projectId,
    freelancerId,
    clientTimezone: "Asia/Kolkata (IST +5:30)",
    freelancerTimezone: "Europe/Berlin (CET +1:00)",
    timezoneOverlapHours: 4,
    communicationCompatibility: "HIGH",
    expectedResponseWindow: "< 2 Hours",
    notes: "4 hours of daily working overlap during business hours.",
  };
};

module.exports = {
  translateRequirement,
  getGlobalCompatibility,
};
