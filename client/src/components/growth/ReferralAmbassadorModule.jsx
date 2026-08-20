import React, { useState } from "react";
import { growthApi } from "../../api/growth.api";

export default function ReferralAmbassadorModule({ stats, onRefresh }) {
  const [copied, setCopied] = useState(false);

  if (!stats) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(stats.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide">
            🏆 Ambassador Level: {stats.ambassadorTier}
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-2">Referral & Ambassador Program</h2>
          <p className="text-xs text-slate-500 mt-1">
            Invite clients & freelancers to FreelNova. Earn +20 Connects for every successful registration & project milestone.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-2xl">
          <div className="text-center px-2">
            <p className="text-xs text-slate-400 font-semibold">Invited</p>
            <p className="text-base font-black text-slate-800">{stats.totalInvited}</p>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="text-center px-2">
            <p className="text-xs text-slate-400 font-semibold">Converted</p>
            <p className="text-base font-black text-emerald-600">{stats.successfulReferrals}</p>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="text-center px-2">
            <p className="text-xs text-slate-400 font-semibold">Rewards</p>
            <p className="text-base font-black text-blue-600">+{stats.totalRewardsConnects} Connects</p>
          </div>
        </div>
      </div>

      {/* Share Link Box */}
      <div className="mt-5 rounded-2xl border border-blue-150 bg-blue-50/40 p-4">
        <label className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block mb-1">
          Your Unique Referral Link
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={stats.shareUrl}
            className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 outline-none select-all"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold transition cursor-pointer"
          >
            {copied ? "Copied! ✓" : "Copy Link"}
          </button>
        </div>
      </div>
    </div>
  );
}
