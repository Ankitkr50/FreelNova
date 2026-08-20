export default function JobIntentCard({ intentData, isLoading }) {
  if (isLoading) {
    return <div className="h-20 bg-slate-100 rounded-2xl animate-pulse"></div>;
  }

  const data = intentData || {
    intentScore: 94,
    intentLevel: "HIGH INTENT",
    signals: [
      { label: "Payment verified", passed: true },
      { label: "Requirements complete & detailed", passed: true },
      { label: "Budget defined", passed: true },
      { label: "Hiring timeline defined", passed: true },
      { label: "Client has successful hiring history", passed: true },
    ],
  };

  const isHigh = data.intentScore >= 80;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-slate-900 uppercase">PROJECT INTENT SCORE</span>
          <p className="text-[10px] text-slate-400">Verifiable intent signals evaluating readiness to hire.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-lg font-black text-slate-900">{data.intentScore}/100</span>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
            isHigh ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
          }`}>
            {data.intentLevel}
          </span>
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        {data.signals.map((sig, idx) => (
          <div key={idx} className="flex items-center gap-2 text-slate-700">
            <span className={sig.passed ? "text-emerald-600 font-bold" : "text-amber-500 font-bold"}>
              {sig.passed ? "✓" : "⚠"}
            </span>
            <span className="text-[11px] font-semibold">{sig.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
