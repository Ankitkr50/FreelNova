import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { adminApi } from "../api/admin.api.js";
import { useAuth } from "../hooks/useAuth.js";
import { ROLE_LABELS, ROLE_COLORS, ROLE_ICONS } from "../constants/permissions.js";

function AcceptStaffInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const { login } = useAuth();

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No invitation token was provided in the link. Please check your invitation email.");
      setLoading(false);
      return;
    }

    adminApi
      .getInvitationDetails(token)
      .then((res) => {
        setInviteData(res?.data?.data || null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.response?.data?.message || "Invalid or expired invitation link.");
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!password || password.length < 8) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminApi.acceptInvitation(token, { password, confirmPassword });
      const { user, accessToken, refreshToken } = res.data.data;

      // Log in the user
      login(accessToken, user, refreshToken);

      // Redirect to Super Admin Panel
      navigate("/admin");
    } catch (err) {
      setFormError(err?.response?.data?.message || "Failed to activate staff account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
        <div className="flex flex-col items-center gap-4 text-white">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-sm font-semibold text-slate-300">Verifying your staff invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-800/80 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 text-2xl font-bold">
            ⚠️
          </div>
          <h2 className="mt-4 text-xl font-bold text-white">Invitation Link Invalid</h2>
          <p className="mt-2 text-sm text-slate-400">{error}</p>
          <div className="mt-6">
            <button
              onClick={() => navigate("/login")}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-bold text-white transition hover:from-blue-500 hover:to-indigo-500 cursor-pointer shadow-lg shadow-blue-500/20"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const roleLabel = ROLE_LABELS[inviteData?.role] || inviteData?.role;
  const roleColor = ROLE_COLORS[inviteData?.role] || "border-blue-300 bg-blue-50 text-blue-700";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-4 py-12">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-slate-900/90 shadow-2xl backdrop-blur-2xl">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-7 text-center">
          <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-white backdrop-blur-sm">
            Staff Portal Onboarding
          </span>
          <h1 className="mt-3 text-2xl font-extrabold text-white">Join FreelNova Staff Team</h1>
          <p className="mt-1 text-xs text-blue-100">
            Invited by <span className="font-semibold text-white">{inviteData?.invitedBy}</span>
          </p>
        </div>

        <div className="p-8">
          {/* Staff Info Card */}
          <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Employee Name:</span>
              <span className="font-bold text-slate-200">{inviteData?.name}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Work Email:</span>
              <span className="font-mono text-slate-200">{inviteData?.email}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">Assigned Role:</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${roleColor}`}>
                {ROLE_ICONS[inviteData?.role] && (
                  <img src={ROLE_ICONS[inviteData?.role]} alt="Role Icon" className="h-3.5 w-3.5 object-contain shrink-0" />
                )}
                {roleLabel}
              </span>
            </div>
            {inviteData?.permissions?.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Assigned Permissions ({inviteData.permissions.length}):</span>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {inviteData.permissions.map((p) => (
                    <span key={p} className="rounded-md bg-slate-800 px-2 py-0.5 text-[9px] font-mono text-blue-300">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {formError && (
            <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 font-medium">
              ⚠️ {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5" htmlFor="staffPass">
                Create Account Password
              </label>
              <div className="relative">
                <input
                  id="staffPass"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:bg-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white bg-transparent border-0 cursor-pointer"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5" htmlFor="staffConfirmPass">
                Confirm Password
              </label>
              <input
                id="staffConfirmPass"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:bg-slate-800"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-extrabold text-white transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-500/25"
            >
              {submitting ? "Activating Staff Access..." : "Activate Account & Enter Portal"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AcceptStaffInvite;
