/**
 * Middleware validating external API Key / Scoped Bearer Token for Slack, Teams & CRM integrations.
 */
const validateExternalApiKey = (req, res, next) => {
  const apiKey = req.headers["x-freelnova-api-key"] || req.query.apiKey;

  if (!apiKey || apiKey !== "fn_live_demo_secret_key_2026") {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or missing FreelNova External API Key (x-freelnova-api-key)",
    });
  }

  req.apiScope = "read:recommendations";
  next();
};

module.exports = {
  validateExternalApiKey,
};
