import axios from "axios";
import { clearAuthSession, getAccessToken, getRefreshToken, setAuthSession } from "../utils/authStorage.js";

const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").trim().replace(/\/+$/, "");
const baseURL = rawBaseUrl.endsWith("/api") ? rawBaseUrl : `${rawBaseUrl}/api`;

const http = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15000,
});

http.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Prevent double /api/api/ pathing if config.url starts with /api/
  if (config.url && config.url.startsWith("/api/")) {
    config.url = config.url.replace(/^\/api/, "");
  }

  return config;
});

let refreshPromise = null;

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config || {};
    const status = error?.response?.status;
    const requestUrl = originalRequest?.url || "";
    const msg = String(error?.response?.data?.message || "");

    if (status === 403 && (msg.toLowerCase().includes("suspended") || msg.toLowerCase().includes("revoked") || msg.toLowerCase().includes("staff account"))) {
      window.dispatchEvent(new CustomEvent("staff_suspended"));
    }

    if (
      status !== 401 ||
      originalRequest._retry ||
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/google") ||
      requestUrl.includes("/auth/register")
    ) {
      return Promise.reject(error);
    }

    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();

    if (!accessToken && !refreshToken) {
      return Promise.reject(error);
    }

    if (!refreshToken) {
      if (accessToken) {
        clearAuthSession();
      }
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = http
        .post("/auth/refresh", { refreshToken })
        .then((res) => {
          const payload = res?.data?.data || {};
          const nextAccessToken = payload.accessToken;
          const nextRefreshToken = payload.refreshToken;
          if (!nextAccessToken || !nextRefreshToken) {
            throw new Error("Invalid refresh token response");
          }

          setAuthSession({
            accessToken: nextAccessToken,
            refreshToken: nextRefreshToken,
          });

          return nextAccessToken;
        })
        .catch((refreshError) => {
          const activeRefreshToken = getRefreshToken();
          if (!activeRefreshToken || activeRefreshToken === refreshToken) {
            clearAuthSession();
          }
          throw refreshError;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    try {
      const nextToken = await refreshPromise;
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${nextToken}`;
      return http(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);

export default http;

