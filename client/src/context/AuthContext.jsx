import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  setAuthSession,
} from "../utils/authStorage.js";
import { profileApi } from "../api/profile.api.js";
import { subscriptionsApi } from "../api/subscriptions.api.js";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => getAccessToken());
  const [refreshToken, setRefreshToken] = useState(() => getRefreshToken());
  const [user, setUser] = useState(() => getStoredUser());
  const [isStaffSuspended, setIsStaffSuspended] = useState(false);
  const [activeSubscription, setActiveSubscription] = useState(() => localStorage.getItem("sb_active_subscription"));

  useEffect(() => {
    const handleSuspended = () => {
      if (user?.email !== "fn.freelnova@gmail.com") {
        setIsStaffSuspended(true);
      }
    };
    window.addEventListener("staff_suspended", handleSuspended);
    return () => window.removeEventListener("staff_suspended", handleSuspended);
  }, [user]);

  useEffect(() => {
    if (token) {
      profileApi.getProfile()
        .then((response) => {
          const profile = response?.data?.profile;
          if (profile) {
            if (profile.role === "admin" && profile.staffStatus === "SUSPENDED" && profile.email !== "fn.freelnova@gmail.com") {
              setIsStaffSuspended(true);
            } else {
              setIsStaffSuspended(false);
            }
            setUser((prevUser) => {
              const updated = {
                ...(prevUser || {}),
                ...profile,
                name: profile.name || prevUser?.name,
                username: profile.username || prevUser?.username,
                userCode: profile.userCode || prevUser?.userCode || (profile.role === "admin" ? "AID00000001" : "FID00000001"),
                role: profile.role || prevUser?.role,
                adminRole: profile.adminRole,
                customRoleTitle: profile.customRoleTitle,
                adminPermissions: profile.adminPermissions || [],
                staffStatus: profile.staffStatus || "ACTIVE",
              };
              setAuthSession({ accessToken: token, refreshToken, user: updated });
              return updated;
            });
          }
        })
        .catch((err) => {
          console.error("Failed to sync profile on mount:", err);
          const msg = String(err?.response?.data?.message || "");
          if (err?.response?.status === 403 && (msg.toLowerCase().includes("suspended") || msg.toLowerCase().includes("staff account"))) {
            if (user?.email !== "fn.freelnova@gmail.com") {
              setIsStaffSuspended(true);
            }
          }
        });

      // Sync active subscription status from backend database to local storage & state
      subscriptionsApi.getMySubscription()
        .then((response) => {
          const subscription = response?.data?.data?.subscription;
          if (subscription && subscription.status === "active") {
            localStorage.setItem("sb_active_subscription", subscription.plan);
            setActiveSubscription(subscription.plan);
          } else {
            localStorage.removeItem("sb_active_subscription");
            setActiveSubscription(null);
          }
        })
        .catch((err) => {
          console.error("Failed to sync subscription on mount:", err);
        });
    } else {
      localStorage.removeItem("sb_active_subscription");
      setActiveSubscription(null);
    }
  }, [token, refreshToken]);

  const login = (nextToken, nextUser = null, nextRefreshToken = null) => {
    try {
      queryClient.clear();
    } catch (e) {}
    setAuthSession({
      accessToken: nextToken,
      refreshToken: nextRefreshToken,
      user: nextUser,
    });
    setToken(nextToken || null);
    setRefreshToken(nextRefreshToken || null);
    setUser(nextUser || null);

    // Sync subscription on login
    if (nextToken) {
      subscriptionsApi.getMySubscription()
        .then((response) => {
          const subscription = response?.data?.data?.subscription;
          if (subscription && subscription.status === "active") {
            localStorage.setItem("sb_active_subscription", subscription.plan);
            setActiveSubscription(subscription.plan);
          } else {
            localStorage.removeItem("sb_active_subscription");
            setActiveSubscription(null);
          }
        })
        .catch(() => {});
    }
  };

  const logout = () => {
    try {
      queryClient.clear();
    } catch (e) {}
    clearAuthSession();
    localStorage.removeItem("sb_active_subscription");
    setActiveSubscription(null);
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  const persistUser = useCallback((nextUser) => {
    setAuthSession({ accessToken: token, refreshToken, user: nextUser });
    setUser(nextUser);
  }, [refreshToken, token]);

  const isProUser = activeSubscription === "pro_monthly" || activeSubscription === "pro_yearly";

  const userWithPro = useMemo(() => {
    if (!user) return null;
    return {
      ...user,
      isPro: isProUser,
      proTier: activeSubscription,
    };
  }, [user, isProUser, activeSubscription]);

  const value = useMemo(
    () => ({
      user: userWithPro,
      token,
      refreshToken,
      isAuthenticated: Boolean(token),
      login,
      logout,
      setUser: persistUser,
    }),
    [token, refreshToken, userWithPro, persistUser],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {isStaffSuspended && user?.email !== "fn.freelnova@gmail.com" && (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-slate-950/95 backdrop-blur-2xl p-4 select-none">
          <div className="max-w-md w-full rounded-3xl border border-rose-500/30 bg-slate-900/95 p-8 text-center shadow-[0_25px_80px_rgba(225,29,72,0.4)] animate-in fade-in zoom-in duration-300">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-500 text-4xl shadow-inner">
              🚫
            </div>
            <span className="mt-4 inline-block rounded-full bg-rose-500/10 border border-rose-500/30 px-3.5 py-1 text-xs font-mono font-extrabold uppercase tracking-widest text-rose-400">
              Account Suspended
            </span>
            <h2 className="mt-3 text-2xl font-black text-white tracking-tight">
              Staff Access Revoked
            </h2>
            <p className="mt-3 text-sm text-slate-300 leading-relaxed">
              Your staff administration privileges have been suspended by the Primary Super Administrator. You can no longer view or manage platform data.
            </p>

            <div className="mt-6 rounded-2xl bg-rose-950/50 border border-rose-900/60 p-4 text-left">
              <p className="text-xs font-bold text-rose-300 uppercase tracking-wider">Instructions</p>
              <p className="mt-1 text-xs text-rose-200/90 leading-relaxed">
                Please contact the Primary Super Administrator (<span className="font-mono font-bold text-rose-300">fn.freelnova@gmail.com</span>) to restore your access.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <a
                href="mailto:fn.freelnova@gmail.com?subject=Staff Account Reactivation Request"
                className="w-full rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 py-3 text-xs font-bold text-white shadow-lg shadow-rose-600/30 hover:from-rose-500 hover:to-rose-600 transition cursor-pointer text-center"
              >
                📧 Contact Super Admin
              </a>
              <button
                type="button"
                onClick={() => {
                  setIsStaffSuspended(false);
                  logout();
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                Sign Out of Account
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export default AuthContext;

