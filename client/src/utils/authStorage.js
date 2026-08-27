export const TOKEN_KEY = "freelnova_access_token";
export const REFRESH_TOKEN_KEY = "freelnova_refresh_token";
export const USER_KEY = "freelnova_user";

export function getAccessToken() {
  const val = localStorage.getItem(TOKEN_KEY);
  if (!val || val === "null" || val === "undefined") return null;
  return val;
}

export function getRefreshToken() {
  const val = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!val || val === "null" || val === "undefined") return null;
  return val;
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function setAuthSession({ accessToken, refreshToken, user }) {
  if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

