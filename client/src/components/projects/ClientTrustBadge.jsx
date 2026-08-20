export default function ClientTrustBadge({ trustData, isLoading }) {
  if (isLoading) {
    return <div className="h-20 bg-slate-100 rounded-2xl animate-pulse"></div>;
  }

  const data = trustData || {
    paymentVerified: true,
    totalVerifiedSpend: 1420000,
    totalProjects: 42,
    hiringCompletionRate: 91,
    milestoneApprovalRate: 96,
    disputeRate: 1.5,
    trustLevel: "HIGH",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2 shadow-2xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900">CLIENT TRUST</span>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            Payment Verified ✓
          </span>
        </div>
        <span className="text-xs font-black text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
          {data.trustLevel} TRUST
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 text-[10px] font-bold text-slate-600 pt-1">
        <div>
          <p className="text-slate-400">Verified Spend</p>
          <p className="text-slate-900 font-extrabold">₹{(data.totalVerifiedSpend || 0).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-slate-400">Projects</p>
          <p className="text-slate-900 font-extrabold">{data.totalProjects} Posted</p>
        </div>
        <div>
          <p className="text-slate-400">Hiring Rate</p>
          <p className="text-emerald-600 font-extrabold">{data.hiringCompletionRate}%</p>
        </div>
        <div>
          <p className="text-slate-400">Dispute Rate</p>
          <p className="text-slate-900 font-extrabold">{data.disputeRate}%</p>
        </div>
      </div>
    </div>
  );
}
