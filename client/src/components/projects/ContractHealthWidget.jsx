export default function ContractHealthWidget({ status = "Healthy", milestoneProgress = 72 }) {
  const isHealthy = status === "Healthy";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900">Project Health Indicator</span>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
            isHealthy ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
          }`}>
            {isHealthy ? "🟢 Healthy" : "🟡 At Risk"}
          </span>
        </div>
        <span className="text-xs font-mono font-bold text-slate-600">{milestoneProgress}% Progress</span>
      </div>

      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${isHealthy ? "bg-emerald-500" : "bg-amber-500"}`}
          style={{ width: `${milestoneProgress}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold text-slate-500 text-center">
        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
          <p className="text-slate-400">Timeline</p>
          <p className="font-bold text-slate-800 mt-0.5">On Track</p>
        </div>
        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
          <p className="text-slate-400">Budget</p>
          <p className="font-bold text-slate-800 mt-0.5">On Track</p>
        </div>
        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
          <p className="text-slate-400">Response Rate</p>
          <p className="font-bold text-emerald-700 mt-0.5">Healthy (1h)</p>
        </div>
      </div>
    </div>
  );
}
