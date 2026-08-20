// In-memory OAuth applications & tokens store
const oauthAppsStore = {};
const oauthTokensStore = {};

/**
 * Creates an OAuth 2.0 Client Application for third-party developers.
 */
const createOAuthApplication = async (userId, payload) => {
  const { appName, redirectUri, requestedScopes = ["talent:read", "projects:read"] } = payload;

  const clientId = `fn_client_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const clientSecret = `fn_secret_${Math.random().toString(36).substr(2, 12)}`;

  const app = {
    id: `oauth-app-${Date.now()}`,
    userId,
    appName: String(appName).trim(),
    clientId,
    clientSecret,
    redirectUri,
    scopes: requestedScopes,
    createdAt: new Date().toISOString(),
  };

  if (!oauthAppsStore[userId]) oauthAppsStore[userId] = [];
  oauthAppsStore[userId].unshift(app);

  return app;
};

/**
 * Issues an OAuth 2.0 Access Token for authorized third-party requests.
 */
const issueOAuthAccessToken = async (clientId, clientSecret, scope) => {
  const token = `fn_access_token_${Date.now()}_${Math.random().toString(36).substr(2, 10)}`;

  oauthTokensStore[token] = {
    clientId,
    scope: scope || "talent:read",
    expiresInSeconds: 3600,
    createdAt: new Date().toISOString(),
  };

  return {
    accessToken: token,
    tokenType: "Bearer",
    expiresInSeconds: 3600,
    scope: oauthTokensStore[token].scope,
  };
};

module.exports = {
  createOAuthApplication,
  issueOAuthAccessToken,
};
