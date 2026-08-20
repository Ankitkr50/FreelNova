export default function DeliverableEscrowWidget({ escrowData, isLoading }) {
  if (isLoading) {
    return <div className="h-24 bg-slate-100 rounded-2xl animate-pulse"></div>;
  }

  const data = escrowData || {
    milestoneTitle: "Milestone 1: Prototype Deliverable & Core Features",
    amount: 25000,
    acceptanceCriteria: [
      { item: "User Authentication & JWT Session", met: true },
      { item: "Razorpay / Escrow Payment Integration", met: true },
      { item: "Responsive UI & Mobile Support", met: true },
      { item: "API Documentation & Tests Pass", met: true },
    ],
    deliverableFiles: [
      { name: "Source_Code_Repository.git", url: "https://github.com/freelnova/build" },
    ],
  };

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 space-y-3 shadow-2xs">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">
            DELIVERABLE-AWARE ESCROW
          </span>
          <p className="text-[11px] text-emerald-800 font-semibold">{data.milestoneTitle}</p>
        </div>
        <span className="text-sm font-black text-emerald-900 bg-white border border-emerald-300 px-3 py-1 rounded-full">
          ₹{data.amount.toLocaleString()} Escrow
        </span>
      </div>

      <div className="space-y-1.5 text-xs bg-white p-3.5 rounded-xl border border-emerald-200/80">
        <p className="font-bold text-slate-800 text-[10px] uppercase">Acceptance Criteria Verified:</p>
        {data.acceptanceCriteria.map((c, idx) => (
          <div key={idx} className="flex items-center gap-2 text-slate-700 font-medium">
            <span className={c.met ? "text-emerald-600 font-bold" : "text-amber-500 font-bold"}>
              {c.met ? "✓" : "⏳"}
            </span>
            <span className="text-[11px]">{c.item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
