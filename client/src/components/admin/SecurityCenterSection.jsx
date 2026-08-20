import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/admin.api.js";

function SecurityCenterSection() {
  const queryClient = useQueryClient();

  // 2FA Setup Modal State
  const [isMfaModalOpen, setIsMfaModalOpen] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [setupData, setSetupData] = useState(null);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [mfaError, setMfaError] = useState("");
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Queries
  const { data: mfaStatusData, refetch: refetchMfa } = useQuery({
    queryKey: ["admin_mfa_status"],
    queryFn: async () => {
      const res = await adminApi.getMfaStatus();
      return res?.data?.data || { twoFactorEnabled: false };
    },
  });

  const { data: sessionsData, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ["admin_sessions"],
    queryFn: async () => {
      const res = await adminApi.listSessions();
      return res?.data?.data?.sessions || [];
    },
  });

  const { data: alertsData, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ["admin_security_alerts"],
    queryFn: async () => {
      const res = await adminApi.listSecurityAlerts();
      return res?.data?.data?.alerts || [];
    },
  });

  const is2faEnabled = mfaStatusData?.twoFactorEnabled;
  const sessions = sessionsData || [];
  const alerts = alertsData || [];

  // Mutations
  const setupMfaMutation = useMutation({
    mutationFn: () => adminApi.setupMfa(),
    onSuccess: (res) => {
      setSetupData(res?.data?.data);
      setIsMfaModalOpen(true);
      setMfaError("");
    },
    onError: (err) => {
      alert(err?.response?.data?.message || "Failed to initialize 2FA setup.");
    },
  });

  const verifyMfaMutation = useMutation({
    mutationFn: (code) => adminApi.verifyAndEnableMfa({ code }),
    onSuccess: (res) => {
      setRecoveryCodes(res?.data?.data?.recoveryCodes || []);
      queryClient.invalidateQueries({ queryKey: ["admin_mfa_status"] });
    },
    onError: (err) => {
      setMfaError(err?.response?.data?.message || "Invalid 6-digit code. Please try again.");
    },
  });

  const disableMfaMutation = useMutation({
    mutationFn: () => adminApi.disableMfa(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_mfa_status"] });
      alert("Two-Factor Authentication has been disabled.");
    },
    onError: (err) => {
      alert(err?.response?.data?.message || "Failed to disable 2FA.");
    },
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId) => adminApi.revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_sessions"] });
    },
  });

  const revokeAllOthersMutation = useMutation({
    mutationFn: () => adminApi.revokeAllOtherSessions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_sessions"] });
      alert("All other sessions have been logged out.");
    },
  });

  const resolveAlertMutation = useMutation({
    mutationFn: (alertId) => adminApi.resolveSecurityAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_security_alerts"] });
    },
  });

  const copyCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* 2FA & Account Protection Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${is2faEnabled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
            2FA
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Two-Factor Authentication (TOTP)</h3>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase border ${is2faEnabled ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                {is2faEnabled ? "Enabled & Active" : "Not Configured"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Protect your administrative access with Google Authenticator, Microsoft Authenticator, or Authy.
              When enabled, a temporary 6-digit security code will be required during sign-in.
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          {is2faEnabled ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Are you sure you want to disable 2FA? This lowers account security.")) {
                  disableMfaMutation.mutate();
                }
              }}
              className="rounded-xl border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 px-4 py-2.5 text-xs font-bold transition cursor-pointer"
            >
              Disable 2FA
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setupMfaMutation.mutate()}
              disabled={setupMfaMutation.isPending}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs px-5 py-2.5 shadow-md shadow-blue-500/20 transition cursor-pointer"
            >
              {setupMfaMutation.isPending ? "Generating..." : "Setup Authenticator App"}
            </button>
          )}
        </div>
      </div>

      {/* Active Sessions Grid */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Active Administrative Sessions ({sessions.filter(s => !s.isRevoked).length})</h3>
            <p className="text-xs text-slate-500 mt-0.5">Devices and IP addresses currently authenticated with your staff credentials</p>
          </div>
          {sessions.filter(s => !s.isRevoked && !s.isCurrent).length > 0 && (
            <button
              type="button"
              onClick={() => revokeAllOthersMutation.mutate()}
              className="rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs px-3.5 py-1.5 transition cursor-pointer"
            >
              Logout All Other Sessions
            </button>
          )}
        </div>

        {sessionsLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading active sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 italic">No session records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3 text-left">Device & Browser</th>
                  <th className="px-4 py-3 text-left">IP Address</th>
                  <th className="px-4 py-3 text-left">Last Active</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="font-bold text-slate-900 flex items-center gap-1.5">
                          {sess.browser} on {sess.os}
                          {sess.isCurrent && (
                            <span className="rounded bg-blue-100 text-blue-700 text-[9px] font-extrabold px-1.5 py-0.2">
                              This Device
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-400">{sess.device}</p>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-slate-700 text-[11px]">
                      {sess.ipAddress || "127.0.0.1"}
                    </td>

                    <td className="px-4 py-3.5 text-slate-500">
                      {new Date(sess.lastActiveAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase border ${sess.isRevoked ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                        {sess.isRevoked ? "Revoked" : "Active"}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {!sess.isRevoked && !sess.isCurrent && (
                        <button
                          type="button"
                          onClick={() => revokeSessionMutation.mutate(sess.id)}
                          className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-rose-600 px-2.5 py-1 text-xs font-bold transition cursor-pointer"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Security & Intrusion Alerts Feed */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Intrusion & Security Alerts ({alerts.length})</h3>
            <p className="text-xs text-slate-500 mt-0.5">Automated detection signals for suspicious access or privilege changes</p>
          </div>
          <button
            onClick={() => refetchAlerts()}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-transparent border-0 cursor-pointer"
          >
            Refresh
          </button>
        </div>

        {alertsLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading security alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 italic">No security alerts detected. Everything looks secure!</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {alerts.map((al) => (
              <div key={al.id} className={`p-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${al.isResolved ? "bg-white opacity-70" : "bg-slate-50/60"}`}>
                <div className="flex items-start gap-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase border shrink-0 mt-0.5 ${
                    al.severity === "CRITICAL" ? "bg-rose-100 text-rose-800 border-rose-300" :
                    al.severity === "HIGH" ? "bg-orange-100 text-orange-800 border-orange-300" :
                    "bg-amber-100 text-amber-800 border-amber-300"
                  }`}>
                    {al.severity}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{al.title}</h4>
                    <p className="text-xs text-slate-600 mt-0.5">{al.description}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono mt-1">
                      <span>IP: {al.ipAddress || "Internal"}</span>
                      <span>•</span>
                      <span>{new Date(al.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2 justify-end">
                  {al.isResolved ? (
                    <span className="text-[11px] font-semibold text-emerald-600">Resolved</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => resolveAlertMutation.mutate(al.id)}
                      className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 transition cursor-pointer"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MFA Setup Modal ──────────────────────────────────────────────── */}
      {isMfaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {recoveryCodes.length > 0 ? "2FA Successfully Enabled" : "Scan QR Code in Authenticator"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsMfaModalOpen(false);
                  setRecoveryCodes([]);
                  setMfaCode("");
                }}
                className="text-slate-400 hover:text-slate-700 bg-transparent border-0 cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            {recoveryCodes.length > 0 ? (
              <div className="mt-4 space-y-4">
                <p className="text-xs text-slate-600">
                  Save these one-time recovery codes in a secure location. If you ever lose access to your authenticator device, you can use these codes to regain entry:
                </p>
                <div className="rounded-xl bg-slate-950 p-4 font-mono text-xs text-emerald-400 grid grid-cols-2 gap-2">
                  {recoveryCodes.map((code) => (
                    <span key={code} className="text-center font-bold tracking-wider">{code}</span>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={copyCodes}
                    className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200 cursor-pointer"
                  >
                    {copiedCodes ? "Copied Codes!" : "Copy All Codes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMfaModalOpen(false);
                      setRecoveryCodes([]);
                    }}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-bold text-white cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : setupData ? (
              <div className="mt-4 space-y-4 text-center">
                <p className="text-xs text-slate-600 text-left">
                  Open Google Authenticator, Microsoft Authenticator or Authy on your phone, tap <strong>Add (+)</strong>, and scan this QR code:
                </p>
                <div className="flex justify-center p-2 bg-white rounded-2xl border border-slate-100 inline-block mx-auto shadow-xs">
                  <img src={setupData.qrCodeDataUrl} alt="2FA QR Code" className="h-44 w-44 rounded-xl" />
                </div>
                <div className="text-left bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-[11px] font-mono break-all text-slate-700">
                  <span className="text-[10px] text-slate-400 block font-sans uppercase font-bold">Manual Key:</span>
                  {setupData.manualEntryKey}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!mfaCode.trim()) return;
                    verifyMfaMutation.mutate(mfaCode.trim());
                  }}
                  className="space-y-3 pt-2 text-left"
                >
                  {mfaError && (
                    <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 font-semibold">
                      {mfaError}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Enter 6-Digit Code from App
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 123456"
                      required
                      className="w-full text-center text-xl font-mono tracking-widest rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={verifyMfaMutation.isPending || mfaCode.length < 6}
                    className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2.5 transition cursor-pointer disabled:opacity-50"
                  >
                    {verifyMfaMutation.isPending ? "Verifying..." : "Verify & Enable 2FA"}
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default SecurityCenterSection;
