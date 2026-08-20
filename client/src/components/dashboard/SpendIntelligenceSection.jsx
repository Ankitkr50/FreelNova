export default function SpendIntelligenceSection({ spendData, isLoading }) {
  if (isLoading) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 animate-pulse">
        <div className="h-6 w-48 bg-slate-200 rounded mb-4"></div>
        <div className="h-24 bg-slate-100 rounded-2xl"></div>
      </div>
    );
  }

  const data = spendData || {
    totalSpend: 185000,
    averageProjectCost: 42500,
    topCategory: "Web & Mobile Development",
    repeatHiringRate: 67,
    projectSuccessRate: 98,
    averageTimeToHireDays: 2,
    escrowUtilizationRate: 100,
    insights: [
      "You spend most on Web Development & API integrations.",
      "Your fastest successful hires come from your Preferred Talent Pool.",
      "Average project duration is 14 days with 100% escrow release rate.",
    ],
  };

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Client Spend & Hiring Intelligence</h3>
          <p className="text-xs text-slate-400">
            Analytics on expenditure, category allocation, rehire rates, and escrow efficiency.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
          <p className="font-bold text-blue-800 uppercase tracking-wider">Total Platform Spend</p>
          <p className="text-xl font-black text-blue-900 mt-1">₹{data.totalSpend.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
          <p className="font-bold text-emerald-800 uppercase tracking-wider">Avg Project Cost</p>
          <p className="text-xl font-black text-emerald-900 mt-1">₹{data.averageProjectCost.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
          <p className="font-bold text-purple-800 uppercase tracking-wider">Repeat Hiring Rate</p>
          <p className="text-xl font-black text-purple-900 mt-1">{data.repeatHiringRate}%</p>
        </div>
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
          <p className="font-bold text-amber-800 uppercase tracking-wider">Escrow Utilization</p>
          <p className="text-xl font-black text-amber-900 mt-1">{data.escrowUtilizationRate}%</p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
        <p className="font-bold text-slate-900">AI Spend Optimization Insights:</p>
        <ul className="space-y-1 text-slate-700">
          {data.insights.map((ins, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">✓</span>
              <span>{ins}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
