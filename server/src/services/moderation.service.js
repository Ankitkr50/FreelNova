const { prisma } = require('../config/db');

/**
 * Text normalization helper to un-obfuscate hidden numbers and email tokens
 */
function normalizeText(text = "") {
  let str = text.toLowerCase();

  // Replace word digits to numbers
  const numberWords = {
    zero: "0", one: "1", two: "2", three: "3", four: "4",
    five: "5", six: "6", seven: "7", eight: "8", nine: "9"
  };
  Object.keys(numberWords).forEach(word => {
    const reg = new RegExp(`\\b${word}\\b`, "g");
    str = str.replace(reg, numberWords[word]);
  });

  // Normalize email [at], (at), @ variants
  str = str.replace(/\s*[\(\[\{]?\s*at\s*[\)\]\}]?\s*/gi, "@");
  str = str.replace(/\s*[\(\[\{]?\s*dot\s*[\)\]\}]?\s*/gi, ".");

  return str;
}

/**
 * Extract digits string from text while ignoring spaced digits
 */
function extractAggregatedDigits(normalizedText) {
  const digitsOnly = normalizedText.replace(/[^\d]/g, "");
  return digitsOnly;
}

/**
 * Redact sensitive content for admin logging (e.g. 9876543210 -> ********10)
 */
function redactSensitiveString(str = "") {
  if (!str) return "";
  if (str.length <= 4) return "****";
  return "*".repeat(str.length - 2) + str.slice(-2);
}

/**
 * Optional AI Context Classifier using Gemini REST API
 */
async function classifyWithGemini(text) {
  if (!process.env.GEMINI_API_KEY) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const payload = {
      contents: [{
        parts: [{
          text: `Analyze if the following chat message from a freelancer marketplace user is attempting to share personal contact details (phone, email, WhatsApp, Telegram, UPI, bank) or bypass the platform. Respond ONLY in JSON format: {"isBypass": boolean, "category": string, "reason": string}\n\nMessage: "${text}"`
        }]
      }]
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (resultText.includes('"isBypass": true') || resultText.includes('"isBypass":true')) {
      return { isBypass: true };
    }
  } catch (e) {
    // Non-blocking
  }
  return null;
}

/**
 * Core Moderation Engine
 */
async function moderateMessage({ text = "", contentType = "TEXT", attachment = null, senderId, receiverId, conversationId }) {
  const rawText = text || "";
  const normalized = normalizeText(rawText);
  const digitsOnly = extractAggregatedDigits(normalized);

  const categories = [];
  let riskLevel = "LOW";
  let action = "ALLOW";
  let reason = "";
  let confidence = 0.95;
  let redactedEvidence = "";

  // 1. Safe project Whitelist Check
  const safeKeywords = ["github", "gitlab", "figma", "notion", "google drive", "dropbox", "freelnova", "milestone", "deadline", "deliverable", "requirement"];
  const containsSafeKeyword = safeKeywords.some(kw => normalized.includes(kw));

  // 2. Deterministic Regex Pattern Detection

  // A. Phone / Mobile Number Detection (10+ digits or spaced digits)
  const phonePattern = /(\+?\d{1,4}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/;
  const isSpaced10DigitPhone = digitsOnly.length >= 10 && (
    normalized.includes("call") ||
    normalized.includes("phone") ||
    normalized.includes("mobile") ||
    normalized.includes("contact") ||
    normalized.includes("num") ||
    normalized.includes("wa") ||
    /(\d\s+){9}\d/.test(rawText)
  );

  if (phonePattern.test(normalized) || isSpaced10DigitPhone || /(\b\d{10}\b)/.test(digitsOnly)) {
    categories.push("CONTACT_PHONE");
    riskLevel = "HIGH";
    action = "BLOCK";
    reason = "Direct phone/mobile contact number detected.";
    redactedEvidence = redactSensitiveString(digitsOnly.slice(-10));
  }

  // B. Email Address Detection
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  if (emailPattern.test(normalized)) {
    categories.push("CONTACT_EMAIL");
    riskLevel = "HIGH";
    action = "BLOCK";
    reason = "Direct email address detected.";
    redactedEvidence = redactSensitiveString(normalized.match(emailPattern)?.[0] || "");
  }

  // C. WhatsApp Contact Detection
  if (normalized.includes("whatsapp") || normalized.includes("wa.me") || normalized.includes("wa number") || normalized.includes("contact on wa")) {
    categories.push("CONTACT_WHATSAPP");
    riskLevel = "HIGH";
    action = "BLOCK";
    reason = "WhatsApp off-platform contact handle detected.";
    redactedEvidence = "WhatsApp reference";
  }

  // D. Telegram / Off-platform Social Handles
  if (normalized.includes("telegram") || normalized.includes("t.me") || /@\w{4,}/.test(rawText)) {
    if (!containsSafeKeyword && (normalized.includes("dm me") || normalized.includes("reach me") || normalized.includes("telegram"))) {
      categories.push("CONTACT_TELEGRAM");
      riskLevel = "HIGH";
      action = "BLOCK";
      reason = "Telegram / off-platform social handle detected.";
      redactedEvidence = "Social handle reference";
    }
  }

  // E. UPI ID & Bank Payment Credentials
  const upiPattern = /[a-zA-Z0-9.\-_]+@(oksbi|okhdfcbank|okicici|paytm|ybl|ibl|upi|axisbank|barodampay)/i;
  const ifscPattern = /[A-Z]{4}0[A-Z0-9]{6}/;
  const paymentKeywords = ["pay directly", "send payment", "my upi", "google pay", "phonepe", "paytm", "gpay", "scan qr", "bank transfer"];

  if (upiPattern.test(normalized) || ifscPattern.test(rawText) || (paymentKeywords.some(pk => normalized.includes(pk)) && digitsOnly.length >= 8)) {
    categories.push("UPI_ID");
    categories.push("BANK_DETAILS");
    riskLevel = "CRITICAL";
    action = "BLOCK";
    reason = "Direct off-platform payment credential or UPI ID detected.";
    redactedEvidence = redactSensitiveString(normalized.match(upiPattern)?.[0] || "Payment Credentials");
  }

  // F. External Contact / Payment Bypass Phrases
  const bypassPhrases = ["reach me outside", "chat outside", "talk outside", "pay me outside", "direct deal", "off platform"];
  if (bypassPhrases.some(bp => normalized.includes(bp))) {
    categories.push("PLATFORM_BYPASS");
    riskLevel = "CRITICAL";
    action = "BLOCK";
    reason = "Explicit platform bypass request detected.";
    redactedEvidence = "Off-platform bypass attempt";
  }

  // 3. Image OCR / Attachment Inspection
  if (contentType === "IMAGE" || (attachment && attachment.mimeType?.startsWith("image/"))) {
    const fileName = (attachment?.fileName || attachment?.originalName || "").toLowerCase();
    const isPaymentQRName = fileName.includes("qr") || fileName.includes("upi") || fileName.includes("payment") || fileName.includes("paytm") || fileName.includes("gpay");
    
    if (isPaymentQRName) {
      categories.push("QR_PAYMENT");
      riskLevel = "CRITICAL";
      action = "BLOCK";
      reason = "Payment QR Code or contact image detected.";
      redactedEvidence = "Payment QR Image";
    }
  }

  // 4. Fallback AI Contextual Analysis for Borderline Cases using Gemini REST
  if (action === "ALLOW" && normalized.length > 15) {
    const aiResult = await classifyWithGemini(rawText);
    if (aiResult && aiResult.isBypass) {
      categories.push("SUSPICIOUS_TEXT");
      riskLevel = "HIGH";
      action = "BLOCK";
      reason = "AI Contextual Security Layer detected off-platform contact/payment sharing.";
      redactedEvidence = "Contextual bypass text";
    }
  }

  const isBlocked = action === "BLOCK";

  // 5. Persist Security Event Log if HIGH or CRITICAL
  if (isBlocked && conversationId && senderId) {
    try {
      await prisma.chatModerationEvent.create({
        data: {
          senderId,
          receiverId: receiverId || null,
          conversationId,
          contentType: contentType || "TEXT",
          category: categories[0] || "PLATFORM_BYPASS",
          riskLevel,
          confidence,
          action,
          reason,
          redactedText: redactedEvidence || redactSensitiveString(rawText),
          status: "PENDING"
        }
      });
    } catch (err) {
      console.error("Failed to log ChatModerationEvent:", err.message);
    }
  }

  return {
    allowed: !isBlocked,
    riskLevel,
    categories: categories.length > 0 ? categories : ["SAFE"],
    confidence,
    action,
    reason: isBlocked ? "⚠️ This message appears to contain direct contact or payment information. For your security, FreeNova does not allow sharing these details in chat." : ""
  };
}

module.exports = {
  moderateMessage,
  normalizeText,
  redactSensitiveString
};
