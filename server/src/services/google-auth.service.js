const { OAuth2Client } = require("google-auth-library");
const env = require("../config/env");
const ApiError = require("../utils/apiError");

let oauthClient = null;

const getGoogleClient = () => {
  if (!env.googleClientId) {
    throw new ApiError(500, "Google auth is not configured");
  }

  if (!oauthClient) {
    oauthClient = new OAuth2Client(env.googleClientId);
  }

  return oauthClient;
};

const verifyGoogleIdToken = async (credential) => {
  if (!credential) {
    throw new ApiError(400, "Google credential is required");
  }

  const client = getGoogleClient();
  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken: credential,
      audience: env.googleClientId,
    });
  } catch (err) {
    throw new ApiError(400, "Google sign-in failed: invalid or expired credential. Please try again.");
  }

  const payload = ticket.getPayload();
  if (!payload || !payload.email || !payload.sub) {
    throw new ApiError(400, "Invalid Google identity payload");
  }

  return {
    googleId: payload.sub,
    email: String(payload.email).trim().toLowerCase(),
    name: payload.name || payload.email.split("@")[0],
    emailVerified: Boolean(payload.email_verified),
    picture: payload.picture || "",
  };
};

module.exports = {
  verifyGoogleIdToken,
};

