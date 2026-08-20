import { useQuery } from "@tanstack/react-query";
import { enterpriseApi } from "../../../api/enterprise.api.js";

export default function CompanyAnalyticsModule() {
  const { data: analyticsRes, isLoading } = useQuery({
    queryKey: ["companyAnalyticsData"],
    queryFn: async () => {
      const res = await enterpriseApi.getCompanyAnalytics();
      return res.data?.data;
    },
  });

  const overview = analyticsRes?.overview || {
    totalUsers: 0,
    freelancersCount: 0,
    recruitersCount: 0,
    totalProjects: 0,
    completedProjects: 0,
    inProgressProjects: 0,
    projectCompletionRate: 0,
    totalDisputes: 0,
    disputeRate: "0.0",
    openTickets: 0,
    resolvedTickets: 0,
  };

  const financial = analyticsRes?.financial;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Module 12 — Enterprise Intelligence
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Company Analytics & Marketplace Intelligence</h2>
        </div>
      </div>

      {/* Analytics Overview Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 animate-pulse">Aggregating Live Platform Telemetry...</div>
      ) : (
        <div className="space-y-6">
          {/* Financial Metrics (Only visible if authorized) */}
          {financial && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400">Financial Intelligence (Restricted Role View)</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                  RBAC Enforced
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-xs text-slate-300">Total Platform GMV</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">₹{(financial.totalGMV || 0).toLocaleString("en-IN")}</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-xs text-slate-300">Platform Revenue (Fees)</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">₹{(financial.platformRevenue || 0).toLocaleString("en-IN")}</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-xs text-slate-300">Active Escrow Balance</div>
                  <div className="text-2xl font-black text-amber-400 mt-1">₹{(financial.escrowHeld || 0).toLocaleString("en-IN")}</div>
                </div>
              </div>
            </div>
          )}

          {/* Marketplace Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-400">Total User Base</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{overview.totalUsers}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                {overview.freelancersCount} Freelancers / {overview.recruitersCount} Recruiters
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-400">Marketplace Projects</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{overview.totalProjects}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                {overview.completedProjects} Completed / {overview.inProgressProjects} In Progress
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-400">Completion Velocity</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{overview.projectCompletionRate}%</div>
              <div className="text-[11px] text-slate-500 mt-1">Successful project delivery rate</div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-400">Dispute Ratio</div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{overview.disputeRate}%</div>
              <div className="text-[11px] text-slate-500 mt-1">{overview.totalDisputes} Total Dispute Cases</div>
            </div>
          </div>

          {/* Operational Workload */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Staff Operational Workload</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                <span>Active Open Support Tickets</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{overview.openTickets}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                <span>Resolved Tickets History</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{overview.resolvedTickets}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
