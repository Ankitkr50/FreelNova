export default function EarningIntelligenceSection({ intelligenceData, isLoading }) {
  if (isLoading) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 animate-pulse">
        <div className="h-6 w-48 bg-slate-200 rounded mb-4"></div>
        <div className="h-24 bg-slate-100 rounded-2xl"></div>
      </div>
    );
  }

  const data = {
    monthlyEarnings: intelligenceData?.monthlyEarnings ?? 0,
    averageProjectValue: intelligenceData?.averageProjectValue ?? 0,
    topPerformingSkill: intelligenceData?.topPerformingSkill || "Profile Skills",
    proposalConversionRate: intelligenceData?.proposalConversionRate ?? 0,
    insights: Array.isArray(intelligenceData?.insights) && intelligenceData.insights.length > 0
      ? intelligenceData.insights
      : [
          "Complete your verified profile skills to boost proposal conversion rates.",
          "Target milestone projects matching your primary technical domain.",
          "Apply to recently posted contracts with low applicant competition.",
        ],
  };

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Freelancer Earning Intelligence</h3>
          <p className="text-xs text-slate-400">
            AI-driven earnings insights and career optimization analytics based on real platform performance.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
          <p className="font-bold text-emerald-800 uppercase tracking-wider">Monthly Avg Revenue</p>
          <p className="text-xl font-black text-emerald-900 mt-1">₹{(data.monthlyEarnings || 0).toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
          <p className="font-bold text-blue-800 uppercase tracking-wider">Avg Contract Value</p>
          <p className="text-xl font-black text-blue-900 mt-1">₹{(data.averageProjectValue || 0).toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
          <p className="font-bold text-purple-800 uppercase tracking-wider">Top Converting Skill</p>
          <p className="text-sm font-black text-purple-900 mt-1">{data.topPerformingSkill}</p>
        </div>
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
          <p className="font-bold text-amber-800 uppercase tracking-wider">Proposal Win Rate</p>
          <p className="text-xl font-black text-amber-900 mt-1">{data.proposalConversionRate}%</p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
        <p className="font-bold text-slate-900">AI Career Optimization Insights:</p>
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
