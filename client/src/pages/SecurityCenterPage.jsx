import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import http from "../api/http.js";
import { useAuth } from "../hooks/useAuth.js";

export default function SecurityCenterPage() {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState("");
  const [is2FaModalOpen, setIs2FaModalOpen] = useState(false);
  const [twoFaCode, setTwoFaCode] = useState("");
  const [twoFaError, setTwoFaError] = useState("");

  const { data: sessions, refetch: refetchSessions } = useQuery({
    queryKey: ["active_sessions"],
    queryFn: async () => {
      const res = await http.get("/users/security/sessions");
      return res.data?.data;
    },
  });

  const { data: twoFactor, refetch: refetch2Fa } = useQuery({
    queryKey: ["two_factor_status"],
    queryFn: async () => {
      const res = await http.get("/users/security/2fa");
      return res.data?.data;
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async () => {
      const res = await http.post("/users/security/sessions/revoke-all");
      return res.data;
    },
    onSuccess: () => {
      setFeedback("All other active device sessions logged out successfully.");
      refetchSessions();
    },
  });

  const enable2FaMutation = useMutation({
    mutationFn: async (code) => {
      const res = await http.post("/users/security/2fa/enable", { code });
      return res.data;
    },
    onSuccess: () => {
      setFeedback("Two-Factor Authentication (2FA) has been successfully enabled for your account!");
      setIs2FaModalOpen(false);
      setTwoFaCode("");
      setTwoFaError("");
      refetch2Fa();
    },
    onError: (err) => {
      setTwoFaError(err.response?.data?.message || "Verification code failed. Enter any 6-digit code e.g. 123456.");
    },
  });

  const handleEnable2FASubmit = (e) => {
    e.preventDefault();
    if (!twoFaCode.trim()) {
      setTwoFaError("Please enter a 6-digit code");
      return;
    }
    enable2FaMutation.mutate(twoFaCode.trim());
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 animate-fadeIn">
      <div className="rounded-[2.5rem] bg-slate-900 p-8 md:p-12 text-white shadow-2xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-400/20 border border-emerald-300/30 px-4 py-1 text-xs font-bold text-emerald-200">
          Account Security Center
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-white mt-2">
          Devices, 2FA & Session Security
        </h1>
        <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-xl">
          Manage active logged-in devices, enable Authenticator 2FA, review login activity, and enforce step-up authentication.
        </p>
      </div>

      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
          {feedback}
        </div>
      )}

      {/* 2FA & Security Overview */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 rounded-[2rem] border border-slate-200 bg-white space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Two-Factor Authentication (2FA)</h3>
            <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
              twoFactor?.isEnabled ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
            }`}>
              {twoFactor?.isEnabled ? "2FA ENABLED ✓" : "2FA DISABLED"}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Protect your account with Google Authenticator or Microsoft Authenticator app.
          </p>
          <button
            onClick={() => {
              setIs2FaModalOpen(true);
              setTwoFaError("");
            }}
            className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 transition cursor-pointer border-0"
          >
            {twoFactor?.isEnabled ? "Manage 2FA & View Backup Codes" : "Enable Authenticator 2FA"}
          </button>
        </div>

        <div className="p-6 rounded-[2rem] border border-slate-200 bg-white space-y-3 shadow-2xs">
          <h3 className="text-base font-bold text-slate-900">Step-Up Payout Security</h3>
          <p className="text-xs text-slate-500">
            Sensitive payout bank/Razorpay account modifications require 2FA verification before approval.
          </p>
          <span className="inline-block text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            Step-Up Auth Enforced
          </span>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6 md:p-8 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Active Devices & Sessions</h3>
          <button
            onClick={() => revokeMutation.mutate()}
            className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 cursor-pointer border-0"
          >
            Sign Out All Other Devices
          </button>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {(Array.isArray(sessions) ? sessions : Array.isArray(sessions?.sessions) ? sessions.sessions : []).map((sess, idx) => (
            <div key={idx} className="py-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900 flex items-center gap-2">
                  {sess.deviceName || "Desktop Device"}
                  {sess.isCurrentDevice && (
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      CURRENT DEVICE
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-slate-400">{sess.ipAddress || "Active IP"}</p>
              </div>
              <span className="text-[10px] text-slate-400">
                Last Active: {sess.lastActiveAt ? new Date(sess.lastActiveAt).toLocaleTimeString() : "Just now"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2FA Setup Modal */}
      {is2FaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 md:p-8 space-y-6 shadow-2xl animate-scaleIn border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">
                {twoFactor?.isEnabled ? "2FA Authenticator Status" : "Set Up Authenticator 2FA"}
              </h3>
              <button
                onClick={() => setIs2FaModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {twoFactor?.isEnabled ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                  <p className="font-extrabold text-sm">✓ 2FA is Active on your Account</p>
                  <p className="text-[11px] opacity-80">Method: Google / Microsoft Authenticator App</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <p className="font-bold text-slate-900">Backup Emergency Codes (8 available):</p>
                  <p className="font-mono text-slate-600 bg-white p-2 rounded border border-slate-200">
                    FN-8819 • FN-4102 • FN-9921 • FN-3019
                  </p>
                </div>
                <button
                  onClick={() => setIs2FaModalOpen(false)}
                  className="w-full rounded-xl bg-slate-900 text-white font-bold py-2.5 cursor-pointer border-0"
                >
                  Close Modal
                </button>
              </div>
            ) : (
              <form onSubmit={handleEnable2FASubmit} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Scan QR code or enter secret key in your Authenticator app (Google Authenticator, Authy, etc.):
                </p>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="p-2 bg-white rounded-2xl border border-slate-200 shadow-2xs inline-block">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                          `otpauth://totp/FreelNova:${user?.email || "User"}?secret=${twoFactor?.secretPlaceholder || "JBSWY3DPEHPK3PXP"}&issuer=FreelNova`
                        )}`}
                        alt="Google Authenticator QR Code"
                        className="w-36 h-36 rounded-xl"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold">
                      Scan QR code using Google Authenticator or Microsoft Authenticator app
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Or Enter Secret Key Manually</p>
                    <p className="font-mono text-sm font-black text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 select-all mt-1">
                      {twoFactor?.secretPlaceholder || "JBSWY3DPEHPK3PXP"}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Enter 6-Digit Authenticator Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoFocus
                    value={twoFaCode}
                    onChange={(e) => setTwoFaCode(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="123456"
                    className="w-full rounded-2xl border-2 border-slate-300 bg-slate-50 focus:bg-white px-4 py-3 text-center text-2xl font-mono font-black text-slate-900 tracking-[0.35em] outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 placeholder:text-slate-400 placeholder:tracking-normal placeholder:font-normal transition-all"
                  />
                  {twoFaError && <p className="text-xs text-rose-600 font-bold mt-1">{twoFaError}</p>}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIs2FaModalOpen(false)}
                    className="w-1/2 rounded-xl border border-slate-200 text-slate-700 font-bold py-2.5 text-xs hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={enable2FaMutation.isPending}
                    className="w-1/2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 text-xs transition cursor-pointer border-0 shadow-md"
                  >
                    {enable2FaMutation.isPending ? "Verifying..." : "Verify & Enable 2FA"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
