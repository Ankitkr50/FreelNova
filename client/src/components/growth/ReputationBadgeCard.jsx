import React from "react";

export default function ReputationBadgeCard({ reputation }) {
  if (!reputation) return null;

  const { reputationScore, badges = [], role, completionRate, onTimeRate, repeatClientRate, trustLevel, totalVerifiedSpend } = reputation;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Unified Platform Reputation
          </span>
          <h3 className="text-lg font-bold text-slate-900 mt-0.5">
            {role === "freelancer" ? "Professional Score" : "Client Trust Score"}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-lg font-black text-white shadow-md shadow-blue-500/20">
            {reputationScore}
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="mt-4 flex flex-wrap gap-2">
        {badges.map((b, idx) => (
          <span key={idx} className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold tracking-wide ${b.color}`}>
            {b.label}
          </span>
        ))}
      </div>

      {/* Detailed Metrics */}
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
        {role === "freelancer" ? (
          <>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold">Completion</p>
              <p className="text-xs font-extrabold text-slate-800">{completionRate}%</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold">On-Time</p>
              <p className="text-xs font-extrabold text-slate-800">{onTimeRate}%</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold">Repeat Hire</p>
              <p className="text-xs font-extrabold text-slate-800">{repeatClientRate}%</p>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold">Trust Tier</p>
              <p className="text-xs font-extrabold text-emerald-600">{trustLevel}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold">Verified Spend</p>
              <p className="text-xs font-extrabold text-slate-800">₹{(totalVerifiedSpend / 100000).toFixed(1)}L</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold">Payment Status</p>
              <p className="text-xs font-extrabold text-blue-600">VERIFIED</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
