import React from "react";

export default function FreelancerBusinessToolkitModule({ toolkitData }) {
  if (!toolkitData) return null;

  const { incomeOverview, passportMetrics, activeContracts = [] } = toolkitData;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
      <div>
        <span className="rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 text-[10px] font-extrabold uppercase">
          💼 Business Toolkit
        </span>
        <h2 className="text-xl font-bold text-slate-900 mt-2">Freelancer Business Operations</h2>
        <p className="text-xs text-slate-500 mt-1">
          Unified workspace managing Invoices, Contracts, Proposals, Timesheets, Net Earnings, and Professional Statements.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[10px] text-slate-400 font-semibold uppercase">Total Net Earnings</p>
          <p className="text-lg font-black text-slate-900 mt-1">₹{incomeOverview?.totalEarned || 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[10px] text-slate-400 font-semibold uppercase">Active Contracts</p>
          <p className="text-lg font-black text-blue-600 mt-1">{activeContracts.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[10px] text-slate-400 font-semibold uppercase">Completion Rate</p>
          <p className="text-lg font-black text-emerald-600 mt-1">{passportMetrics?.completionRate || 100}%</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[10px] text-slate-400 font-semibold uppercase">On-Time Rate</p>
          <p className="text-lg font-black text-indigo-600 mt-1">{passportMetrics?.onTimeRate || 100}%</p>
        </div>
      </div>

      {/* Active Contracts Summary */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Active Contracts & Milestones</h4>
        {activeContracts.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">No active contracts right now.</p>
        ) : (
          activeContracts.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-900">{c.title}</p>
                <p className="text-[10px] text-slate-500">Budget: ₹{c.budgetMin} - ₹{c.budgetMax}</p>
              </div>
              <span className="rounded-full bg-blue-50 text-blue-700 px-2.5 py-0.5 text-[10px] font-extrabold border border-blue-150">
                IN PROGRESS
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
