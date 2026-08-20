import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/admin.api.js";

function FeatureFlagsSection() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin_feature_flags"],
    queryFn: async () => {
      const res = await adminApi.listFeatureFlags();
      return res?.data?.data?.flags || [];
    },
  });

  const flags = data || [];

  const toggleMutation = useMutation({
    mutationFn: ({ flagId, isEnabled }) => adminApi.toggleFeatureFlag(flagId, { isEnabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_feature_flags"] });
    },
    onError: (err) => {
      alert(err?.response?.data?.message || "Failed to toggle feature flag.");
    },
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-block rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[10px] font-extrabold uppercase px-3 py-1 tracking-wider mb-2">
            Runtime Platform Toggles
          </span>
          <h2 className="text-xl font-black">Dynamic Feature Flags & Module Governance</h2>
          <p className="text-xs text-indigo-200/80 mt-0.5 max-w-xl">
            Safely enable or disable marketplace capabilities instantly across the platform without redeploying backend code.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2.5 transition cursor-pointer"
        >
          ↻ Refresh Flags
        </button>
      </div>

      {/* Flags List */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Active Feature Flags ({flags.length})</h3>
          <span className="text-xs text-slate-400">Status changes are recorded in Immutable Audit Logs</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading feature toggles...</div>
        ) : flags.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 italic">No feature flags registered.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {flags.map((flag) => (
              <div key={flag.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{flag.name}</h4>
                    <span className="font-mono text-[10px] text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.2 rounded-md font-bold">
                      {flag.key}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{flag.description}</p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className={`text-xs font-bold ${flag.isEnabled ? "text-emerald-600" : "text-slate-400"}`}>
                    {flag.isEnabled ? "ACTIVE" : "DISABLED"}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={flag.isEnabled}
                      onChange={(e) => toggleMutation.mutate({ flagId: flag.id, isEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FeatureFlagsSection;
