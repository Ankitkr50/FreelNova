import http from "./http";
import { getRefreshToken } from "../utils/authStorage.js";

const normalizeAuthResponse = (response) => {
  const root = response?.data || {};
  const data = root?.data || root;

  return {
    ...response,
    data: {
      ...root,
      message: root?.message || data?.message || "",
      accessToken: data?.accessToken || root?.accessToken || "",
      refreshToken: data?.refreshToken || root?.refreshToken || "",
      user: data?.user || root?.user || null,
      serverOtp: data?.serverOtp || root?.serverOtp || "",
    },
  };
};

export const authApi = {
  register: (payload) =>
    http.post("/auth/register", {
      name: payload.fullName || payload.name,
      email: payload.email,
      password: payload.password,
      role: payload.role,
    }),
  login: async (payload) => normalizeAuthResponse(await http.post("/auth/login", payload)),
  googleAuth: async (payload) =>
    normalizeAuthResponse(
      await http.post("/auth/google", {
        credential: payload.credential,
        role: payload.role,
        isRegister: payload.isRegister,
      }),
    ),
  // OTP-based email verification
  verifyEmail: (payload) =>
    http.post("/auth/verify", { email: payload.email, otp: payload.otp }),
  resendOtp: (payload) =>
    http.post("/auth/resend-otp", { email: payload.email }),
  sendLoginOtp: (payload) =>
    http.post("/auth/send-login-otp", { email: payload.email, otp: payload.otp }),
  changePassword: (payload) =>
    http.put("/auth/change-password", {
      oldPassword: payload.oldPassword,
      newPassword: payload.newPassword,
    }),
  forgotPassword: (payload) =>
    http.post("/auth/forgot-password", { email: payload.email }),
  resetPassword: (payload) =>
    http.post("/auth/reset-password", {
      email: payload.email,
      otp: payload.otp,
      newPassword: payload.newPassword,
    }),
  // Logout is fire-and-forget — always clear local session even if server returns an error
  logout: async () => {
    try {
      await http.post("/auth/logout", { refreshToken: getRefreshToken() });
    } catch {
      // Intentionally swallowed — local session is always cleared regardless.
    }
  },
  me: async () => {
    const response = await http.get("/users/profile");
    const profile = response?.data?.data || null;
    return {
      ...response,
      data: {
        ...response.data,
        user: profile
          ? {
              id: profile._id || profile.id,
              name: profile.name,
              email: profile.email,
              role: profile.role,
              isEmailVerified: profile.isEmailVerified,
            }
          : null,
      },
    };
  },
};


