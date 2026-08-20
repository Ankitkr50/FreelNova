import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../api/admin.api.js";

function SystemHealthSection() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin_system_health"],
    queryFn: async () => {
      const res = await adminApi.getSystemHealth();
      return res?.data?.data || {};
    },
    refetchInterval: 10000, // Auto refresh every 10 seconds
  });

  if (isLoading) {
    return <div className="p-8 text-center text-xs text-slate-400">Pinging server diagnostics...</div>;
  }

  if (isError) {
    return <div className="p-8 text-center text-xs text-rose-500">Failed to connect to system health service.</div>;
  }

  const health = data || {};
  const isDbHealthy = health.database?.status === "healthy";

  return (
    <div className="space-y-6">
      {/* Top Status Banner */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-900 to-indigo-950 p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
              All Systems Operational
            </span>
          </div>
          <h2 className="text-xl font-black mt-2">FreelNova Infrastructure & Services</h2>
          <p className="text-xs text-blue-200 mt-0.5">
            Real-time status monitor (Auto-refreshing every 10s {isFetching ? "• refreshing..." : ""})
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2.5 transition cursor-pointer select-none"
        >
          ↻ Manual Ping
        </button>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Server Uptime</span>
          <h3 className="mt-2 text-2xl font-black text-slate-900">{health.uptimeFormatted || "0s"}</h3>
          <p className="mt-1 text-xs text-slate-500 font-medium">Continuous runtime</p>
        </div>

        <div className={`rounded-2xl border p-5 shadow-xs ${isDbHealthy ? "border-emerald-200 bg-emerald-50/40" : "border-rose-200 bg-rose-50/40"}`}>
          <span className={`text-xs font-bold uppercase tracking-wider ${isDbHealthy ? "text-emerald-700" : "text-rose-700"}`}>
            PostgreSQL Database
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className={`text-2xl font-black ${isDbHealthy ? "text-emerald-900" : "text-rose-900"}`}>
              {isDbHealthy ? "Connected" : "Degraded"}
            </h3>
            <span className="text-xs font-mono font-bold text-emerald-600">{health.database?.pingMs}ms ping</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium">{health.database?.provider}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Node.js Heap Memory</span>
          <h3 className="mt-2 text-2xl font-black text-slate-900">
            {health.memory?.heapUsedMb} <span className="text-sm font-normal text-slate-400">/ {health.memory?.heapTotalMb} MB</span>
          </h3>
          <p className="mt-1 text-xs text-slate-500 font-medium">RSS: {health.memory?.rssMb} MB</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Environment & Runtime</span>
          <h3 className="mt-2 text-xl font-bold text-slate-900 font-mono">{health.nodeVersion}</h3>
          <p className="mt-1 text-xs text-slate-500 font-medium capitalize">{health.environment} • {health.platform}</p>
        </div>
      </div>

      {/* Database Record Volume Counters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Database Live Record Counters</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <span className="text-xs font-semibold text-slate-500">Registered Users</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{health.counters?.totalUsers?.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <span className="text-xs font-semibold text-slate-500">Marketplace Projects</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{health.counters?.totalProjects?.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <span className="text-xs font-semibold text-slate-500">Escrow & Payments</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{health.counters?.totalPayments?.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <span className="text-xs font-semibold text-slate-500">Recorded Audit Events</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{health.counters?.totalAuditLogs?.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SystemHealthSection;
