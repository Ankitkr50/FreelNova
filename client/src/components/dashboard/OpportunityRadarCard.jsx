import { Link } from "react-router-dom";

export default function OpportunityRadarCard({ opportunities, isLoading }) {
  if (isLoading) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 animate-pulse">
        <div className="h-6 w-48 bg-slate-200 rounded mb-4"></div>
        <div className="h-24 bg-slate-100 rounded-2xl"></div>
      </div>
    );
  }

  const rawItems = Array.isArray(opportunities)
    ? opportunities
    : opportunities?.opportunities && Array.isArray(opportunities.opportunities)
    ? opportunities.opportunities
    : [];

  const items = rawItems;

  const getBadgeColor = (color) => {
    switch (color) {
      case "rose":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "emerald":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "purple":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "blue":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Freelancer Opportunity Radar</h3>
          <p className="text-xs text-slate-400">
            Real-time radar highlighting high-value, low-competition contracts matching your skills.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((op, idx) => {
            const badges = Array.isArray(op.badges) ? op.badges : [];
            return (
              <div
                key={op.projectId || `op_${idx}`}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {badges.map((b, bIdx) => (
                      <span
                        key={bIdx}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${getBadgeColor(b.color)}`}
                      >
                        {b.tag}
                      </span>
                    ))}
                    <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {op.matchPercentage || op.matchScore || 85}% Match
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{op.title}</h4>
                  <p className="text-xs text-slate-500 font-semibold">
                    Budget: ₹{(op.budgetMin || 0).toLocaleString()} - ₹{(op.budgetMax || 0).toLocaleString()} • Category: {op.category || "General"}
                  </p>
                </div>

                <Link
                  to={`/projects/${op.projectId || ""}`}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 transition cursor-pointer border-0 shrink-0 text-center"
                >
                  Apply via Radar →
                </Link>
              </div>
            );
          })
        ) : (
          <div className="p-6 text-center text-xs text-slate-400 font-semibold rounded-2xl bg-slate-50 border border-slate-200/60">
            Opportunity Radar: No high-match contract alerts right now. Active radar will alert you when matching jobs are posted.
          </div>
        )}
      </div>
    </div>
  );
}
