const path = require("path");

const ALLOWED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".zip", ".txt", ".md", ".json"];
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB max

/**
 * Validates file upload extension, size, and sanitizes filename against path traversal.
 */
const sanitizeAndValidateFile = (originalFilename, sizeBytes) => {
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new Error("File size exceeds 25 MB limit");
  }

  const ext = path.extname(originalFilename || "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`File type ${ext} is not allowed for security reasons.`);
  }

  const sanitizedBasename = path.basename(originalFilename).replace(/[^a-zA-Z0-9_.-]/g, "_");
  const secureFilename = `${Date.now()}_${sanitizedBasename}`;

  return {
    secureFilename,
    signedUrl: `https://vault.freelnova.com/files/${secureFilename}`,
    allowed: true,
  };
};

module.exports = {
  sanitizeAndValidateFile,
};
