export default function MatchingEngineCard({ candidate, onSelect }) {
  if (!candidate) return null;

  return (
    <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-2xs hover:border-blue-300 transition">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-900">{candidate.name}</h4>
          <p className="text-[11px] text-slate-500">{candidate.headline}</p>
        </div>
        <span className="text-xs font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
          {candidate.matchScore}% Match
        </span>
      </div>

      <div className="space-y-1 text-xs">
        <p className="font-bold text-slate-800 text-[10px] uppercase">Why This Candidate Matches:</p>
        {candidate.matchReasons.map((r, idx) => (
          <p key={idx} className="text-slate-600 font-medium flex items-center gap-1.5">
            <span className="text-emerald-600 font-bold">✓</span> {r}
          </p>
        ))}
      </div>

      {candidate.risks && candidate.risks.length > 0 && (
        <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-medium">
          ⚠️ Note: {candidate.risks.join(", ")}
        </div>
      )}

      {onSelect && (
        <button
          onClick={() => onSelect(candidate)}
          className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-2 text-xs font-bold transition cursor-pointer border-0"
        >
          Review Candidate Profile →
        </button>
      )}
    </div>
  );
}
