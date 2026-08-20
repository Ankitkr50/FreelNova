import { useState } from "react";

export default function WorkPassportCard({ passportData, isLoading }) {
  const [activeTooltip, setActiveTooltip] = useState(null);

  if (isLoading) {
    return (
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm animate-pulse space-y-4">
        <div className="h-5 w-48 bg-slate-200 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!passportData || !passportData.metrics) return null;

  const { metrics, skills, user } = passportData;

  const metricCards = [
    {
      key: "verifiedProjects",
      title: "Verified Projects",
      value: `${metrics.verifiedProjects.value}`,
      subtext: "100% Escrow Verified",
      color: "from-blue-600 to-indigo-600",
      explanation: metrics.verifiedProjects.explanation,
    },
    {
      key: "verifiedEarnings",
      title: "Verified Earnings",
      value: `₹${(metrics.verifiedEarnings.value || 0).toLocaleString()}`,
      subtext: "Released Escrow Payouts",
      color: "from-emerald-600 to-teal-600",
      explanation: metrics.verifiedEarnings.explanation,
    },
    {
      key: "completionRate",
      title: "Completion Rate",
      value: `${metrics.completionRate.value}%`,
      subtext: "Successful Contracts",
      color: "from-indigo-600 to-purple-600",
      explanation: metrics.completionRate.explanation,
    },
    {
      key: "onTimeDelivery",
      title: "On-Time Delivery",
      value: `${metrics.onTimeDelivery.value}%`,
      subtext: "On/Before Deadline",
      color: "from-amber-600 to-orange-600",
      explanation: metrics.onTimeDelivery.explanation,
    },
    {
      key: "clientSatisfaction",
      title: "Client Rating",
      value: `${metrics.clientSatisfaction.value.toFixed(1)} / 5.0`,
      subtext: `Based on ${metrics.clientSatisfaction.totalReviews} reviews`,
      color: "from-rose-600 to-pink-600",
      explanation: metrics.clientSatisfaction.explanation,
    },
    {
      key: "repeatClientRate",
      title: "Repeat-Client Rate",
      value: `${metrics.repeatClientRate.value}%`,
      subtext: "Re-hired by Clients",
      color: "from-cyan-600 to-blue-600",
      explanation: metrics.repeatClientRate.explanation,
    },
  ];

  return (
    <div className="rounded-[2rem] border border-blue-100 bg-gradient-to-b from-white via-blue-50/20 to-slate-50 p-6 md:p-8 shadow-[0_20px_50px_rgba(37,99,235,0.06)] space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              FreelNova Work Passport
            </h2>
            <span className="rounded-full bg-blue-100 text-blue-800 border border-blue-200/80 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
              Verified Identity
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Immutable professional metrics calculated strictly from verified FreelNova escrow transactions and completed contracts.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-3.5 py-1.5 rounded-full text-emerald-800 text-xs font-bold shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          Authenticated Platform Data
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {metricCards.map((card) => (
          <div
            key={card.key}
            onMouseEnter={() => setActiveTooltip(card.key)}
            onMouseLeave={() => setActiveTooltip(null)}
            className="relative rounded-2xl border border-slate-200/80 bg-white p-4 transition-all duration-200 hover:border-blue-300 hover:shadow-md group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                Verified
              </span>
            </div>

            <div className="mt-3">
              <p className="text-xs font-bold text-slate-500">{card.title}</p>
              <p className={`text-xl md:text-2xl font-black bg-gradient-to-r ${card.color} bg-clip-text text-transparent mt-0.5`}>
                {card.value}
              </p>
              <p className="text-[11px] font-medium text-slate-400 mt-0.5">{card.subtext}</p>
            </div>

            {/* Hover Tooltip Explanation */}
            {activeTooltip === card.key && (
              <div className="absolute left-0 bottom-full mb-2 w-full z-20 rounded-xl bg-slate-900 text-white p-3 text-[11px] font-medium shadow-xl border border-slate-700 animate-fadeIn">
                <p className="font-bold text-blue-400 mb-0.5">How it's calculated:</p>
                <p className="text-slate-300 leading-snug">{card.explanation}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Skills Verification List */}
      {skills && skills.length > 0 && (
        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Verified Skill Endorsements
          </p>
          <div className="flex flex-wrap gap-2">
            {skills.map((s, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50/80 text-blue-900 border border-blue-200/80 px-3 py-1 text-xs font-bold shadow-2xs"
              >
                <span className="text-emerald-600 font-extrabold text-[10px]">✓</span>
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
