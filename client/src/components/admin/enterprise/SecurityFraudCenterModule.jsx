import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { enterpriseApi } from "../../../api/enterprise.api.js";

export default function SecurityFraudCenterModule() {
  const queryClient = useQueryClient();

  const { data: secData, isLoading } = useQuery({
    queryKey: ["securityFraudSignals"],
    queryFn: async () => {
      const res = await enterpriseApi.getSecuritySignals();
      return res.data?.data;
    },
  });

  const resolveAlertMutation = useMutation({
    mutationFn: (id) => enterpriseApi.resolveSecurityAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["securityFraudSignals"]);
    },
  });

  const alerts = secData?.alerts || [];
  const riskCounts = secData?.riskCounts || { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  const flaggedUsers = secData?.flaggedUsers || [];
  const chatReports = secData?.chatReports || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            Module 5 — Risk & Intrusion Intelligence
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Security & Fraud Center</h2>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold">
            Critical: {riskCounts.CRITICAL}
          </span>
          <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold">
            High: {riskCounts.HIGH}
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
            Medium: {riskCounts.MEDIUM}
          </span>
        </div>
      </div>

      {/* Human Control Guarantee Alert */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 text-xs text-white flex items-start gap-3 shadow-md">
        <div>
          <span className="font-extrabold text-amber-300">Human-in-the-Loop Security Governance: </span>
          <span className="text-slate-100 font-medium">
            FreeINova security protocol requires human review before imposing account restrictions. AI predictions and platform signals generate alerts for staff investigation without automatic permanent bans.
          </span>
        </div>
      </div>

      {/* Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Alerts List */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>Platform Intrusion & Fraud Alerts</span>
            <span className="text-xs font-normal text-slate-500">Active Signals</span>
          </h3>

          {isLoading ? (
            <div className="p-8 text-center text-slate-500 animate-pulse">Scanning Security Matrix...</div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No active security alerts.</div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {alerts.map((al) => (
                <div
                  key={al.id}
                  className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition ${
                    al.severity === "CRITICAL"
                      ? "border-rose-300 bg-rose-50/40 dark:bg-rose-950/20"
                      : al.severity === "HIGH"
                      ? "border-amber-300 bg-amber-50/40 dark:bg-amber-950/20"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">{al.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        al.severity === "CRITICAL"
                          ? "bg-rose-500 text-white"
                          : al.severity === "HIGH"
                          ? "bg-amber-500 text-white"
                          : "bg-slate-700 text-white"
                      }`}
                    >
                      {al.severity}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">{al.description}</p>
                  <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Target: {al.targetUser?.name || "System"}</span>
                    {!al.isResolved ? (
                      <button
                        onClick={() => resolveAlertMutation.mutate(al.id)}
                        className="px-2.5 py-0.5 text-[10px] font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Mark Resolved
                      </button>
                    ) : (
                      <span className="text-emerald-600 font-semibold">Resolved</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Flagged Users & Chat Violations */}
        <div className="space-y-6">
          {/* Flagged Accounts */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Restricted / Suspended Accounts</h3>
            {flaggedUsers.length === 0 ? (
              <div className="text-xs text-slate-500">No users currently restricted.</div>
            ) : (
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {flaggedUsers.map((u) => (
                  <div key={u.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">{u.name} ({u.role})</span>
                      <p className="text-slate-500 text-[11px]">{u.email}</p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                      {u.moderationStatus}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat Reports */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Chat Moderation Reports</h3>
            {chatReports.length === 0 ? (
              <div className="text-xs text-slate-500">No chat policy violations reported.</div>
            ) : (
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {chatReports.map((cr) => (
                  <div key={cr.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs space-y-0.5">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-slate-900 dark:text-white">Category: {cr.reasonCategory}</span>
                      <span className="text-[10px] text-slate-400">{cr.status}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px]">{cr.details || "Off-platform payment attempt flagged"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
