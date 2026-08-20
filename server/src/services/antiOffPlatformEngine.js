/**
 * FreelNova — Anti-Off-Platform & Payment Protection Engine
 * Server-side anti-evasion normalization, contextual technical whitelisting,
 * and contact/payment circumvention detection.
 */

const TECHNICAL_WHITELIST_DOMAINS = [
  "github.com",
  "gitlab.com",
  "figma.com",
  "drive.google.com",
  "docs.google.com",
  "notion.so",
  "vercel.app",
  "netlify.app",
  "stackblitz.com",
  "codepen.io",
  "replit.com",
  "localhost",
  "127.0.0.1"
];

const SAFE_TEST_EMAILS = [
  "example.com",
  "test.com",
  "domain.com",
  "sample.org",
  "email.com"
];

// Spelled out digit converter
const WORD_TO_DIGIT = {
  zero: "0", one: "1", two: "2", three: "3", four: "4",
  five: "5", six: "6", seven: "7", eight: "8", nine: "9"
};

/**
 * Normalizes text to defeat obfuscation attempts (spaces, zero-width chars, spell-outs).
 */
function normalizeContent(rawText) {
  if (!rawText || typeof rawText !== "string") return "";

  let normalized = rawText;

  // 1. Remove zero-width characters and invisible unicode spaces
  normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, "");

  // 2. Lowercase for uniform analysis
  normalized = normalized.toLowerCase();

  // 3. Normalize common email & domain obfuscations
  normalized = normalized
    .replace(/\[\s*at\s*\]|\(\s*at\s*\)|\{\s*at\s*\}/gi, "@")
    .replace(/\[\s*dot\s*\]|\(\s*dot\s*\)|\{\s*dot\s*\}/gi, ".");

  // 4. Convert spelled out number words to digits (e.g. "nine eight seven" -> "987")
  Object.keys(WORD_TO_DIGIT).forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    normalized = normalized.replace(regex, WORD_TO_DIGIT[word]);
  });

  return normalized;
}

/**
 * Checks if the message content contains code snippets or technical documentation.
 */
function isTechnicalCodeSnippet(text) {
  if (!text) return false;
  // Markdown code block
  if (text.includes("```") || text.includes("`")) return true;
  
  const codeKeywords = ["const ", "let ", "var ", "function ", "import ", "export ", "class ", "return ", "async ", "await ", "regex", "validator", "<script>"];
  return codeKeywords.some(kw => text.toLowerCase().includes(kw));
}

/**
 * Inspects a chat message content for anti-off-platform violations.
 */
function inspectMessage(content, options = {}) {
  const { allowTechnicalLinks = true } = options;

  if (!content || typeof content !== "string") {
    return { isAllowed: true, isFlagged: false, reason: null, violationType: null };
  }

  const normalized = normalizeContent(content);
  const isCode = isTechnicalCodeSnippet(content);

  // De-spaced text for digit sequence checks (e.g. "9 8 7 6 5 4 3 2 1 0" -> "9876543210")
  const despacedDigits = normalized.replace(/[\s\-\._\(\)\+]+/g, "");

  // ── 1. PAYMENT CIRCUMVENTION DETECTION ─────────────────────────────────────
  const paymentKeywords = [
    "pay direct", "pay directly", "outside freelnova", "cheaper price",
    "gpay", "phonepe", "paytm", "upi id", "vpa", "ifsc code",
    "bank account", "account number", "account no", "routing number",
    "crypto wallet", "usdt", "btc address", "eth address", "binance id",
    "paypal.me", "wise.com", "revolut", "zelle", "venmo"
  ];

  const hasPaymentKeyword = paymentKeywords.some(kw => normalized.includes(kw));
  
  // UPI ID pattern: username@upi / phone@ybl / name@oksbi etc.
  const upiPattern = /[a-zA-Z0-9.\-_]{2,256}@(upi|ybl|oksbi|okaxis|okicici|paytm|icici|axl|ibl)/gi;
  const hasUpiId = upiPattern.test(normalized);

  if (hasPaymentKeyword || hasUpiId) {
    return {
      isAllowed: false,
      isFlagged: true,
      reason: "Direct payment instructions or external payment handles detected. Please use FreelNova Escrow for contract safety.",
      violationType: "PAYMENT_CIRCUMVENTION"
    };
  }

  // ── 2. CONTACT INFORMATION SHARING DETECTION ──────────────────────────────
  const offPlatformChannels = [
    "whatsapp", "wa.me", "wa.link", "t.me", "telegram", "signal",
    "discord.gg", "discordapp", "instagram", "insta handle", "ig:",
    "skype", "google meet", "zoom.us", "call me", "dm me", "message me on",
    "contact me at", "reach me at", "my number", "my phone", "my email"
  ];

  const hasOffPlatformChannel = offPlatformChannels.some(channel => normalized.includes(channel));

  // Phone number pattern: 10 consecutive digits
  const phonePattern = /\b\d{10}\b/g;
  const hasPhone = phonePattern.test(despacedDigits) || phonePattern.test(normalized.replace(/[^0-9]/g, ""));

  // Email pattern
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
  const emailMatches = normalized.match(emailRegex) || [];

  // Filter out test emails in technical code
  const nonTestEmails = emailMatches.filter(email => {
    return !SAFE_TEST_EMAILS.some(safeDomain => email.includes(safeDomain));
  });

  const hasEmail = nonTestEmails.length > 0;

  if (hasOffPlatformChannel || (hasPhone && !isCode) || (hasEmail && !isCode)) {
    return {
      isAllowed: false,
      isFlagged: true,
      reason: "Contact details (phone numbers, emails, or messaging handles) cannot be shared through chat. Keep communication on FreelNova.",
      violationType: "CONTACT_SHARING"
    };
  }

  // ── 3. TECHNICAL COLLABORATION WHITELIST CHECK ─────────────────────────────
  // If message contains URLs, check if they are in technical whitelist
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const foundUrls = content.match(urlRegex) || [];

  if (foundUrls.length > 0 && allowTechnicalLinks) {
    for (const url of foundUrls) {
      try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();
        const isWhitelisted = TECHNICAL_WHITELIST_DOMAINS.some(wDomain => host.includes(wDomain));
        
        if (!isWhitelisted) {
          // Flag non-whitelisted external links for moderation review
          return {
            isAllowed: true,
            isFlagged: true,
            reason: `External link (${host}) included in message. Flagged for security review.`,
            violationType: "EXTERNAL_LINK"
          };
        }
      } catch (e) {
        // Invalid URL syntax, ignore
      }
    }
  }

  return { isAllowed: true, isFlagged: false, reason: null, violationType: null };
}

module.exports = {
  inspectMessage,
  normalizeContent,
  TECHNICAL_WHITELIST_DOMAINS
};
