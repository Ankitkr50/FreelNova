import React from "react";

export default function ClientTrustProfileCard({ clientTrust }) {
  if (!clientTrust) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
        <div>
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Verified Client Integrity</span>
          <h3 className="text-base font-bold text-slate-900 mt-0.5">{clientTrust.recruiterName}</h3>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${clientTrust.trustLevel === "HIGH" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"}`}>
          🛡️ {clientTrust.trustLevel} TRUST TIER
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl bg-slate-50 p-2.5">
          <p className="text-[10px] text-slate-400 font-semibold">Total Verified Spend</p>
          <p className="font-extrabold text-slate-900 mt-0.5">₹{(clientTrust.totalVerifiedSpend || 0).toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2.5">
          <p className="text-[10px] text-slate-400 font-semibold">Hiring Completion</p>
          <p className="font-extrabold text-emerald-600 mt-0.5">{clientTrust.hiringCompletionRate}%</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2.5">
          <p className="text-[10px] text-slate-400 font-semibold">Response Velocity</p>
          <p className="font-extrabold text-blue-600 mt-0.5">{clientTrust.averageResponseTimeHours || 1} hr avg</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2.5">
          <p className="text-[10px] text-slate-400 font-semibold">Dispute Rate</p>
          <p className="font-extrabold text-slate-700 mt-0.5">{clientTrust.disputeRate}%</p>
        </div>
      </div>
    </div>
  );
}
