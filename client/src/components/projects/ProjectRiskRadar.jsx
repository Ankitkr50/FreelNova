export default function ProjectRiskRadar({ riskFactors, timelineDays, budgetMax }) {
  const risks = riskFactors || [
    {
      risk: "Aggressive delivery deadline for requested feature scope",
      impact: "Medium",
      mitigation: "Include an explicit QA & milestone buffer period in Phase 1.",
    },
    {
      risk: "Third-party payment & webhook API dependency",
      impact: "Low",
      mitigation: "Test sandbox environment credentials prior to milestone release.",
    },
  ];

  const riskLevel = timelineDays && timelineDays < 7 ? "HIGH" : "MEDIUM";

  return (
    <div className="rounded-[2rem] border border-amber-200 bg-amber-50/70 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">📡</span>
          <div>
            <h4 className="text-sm font-bold text-amber-950">Client Project Risk Radar</h4>
            <p className="text-[11px] text-amber-800 font-medium">
              Automated pre-hire analysis evaluating scope clarity, timeline feasibility, and API dependency risk.
            </p>
          </div>
        </div>

        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
          riskLevel === "HIGH" ? "bg-rose-100 text-rose-800 border-rose-300" : "bg-amber-100 text-amber-900 border-amber-300"
        }`}>
          Risk Level: {riskLevel}
        </span>
      </div>

      <div className="space-y-2.5">
        {risks.map((item, idx) => (
          <div key={idx} className="p-3.5 rounded-2xl bg-white border border-amber-200/80 space-y-1 text-xs">
            <p className="font-bold text-slate-900">⚠️ Risk: {item.risk || item}</p>
            <p className="text-slate-600">
              <span className="font-bold text-slate-800">Recommendation / Mitigation:</span> {item.mitigation || "Add explicit milestone gates."}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
