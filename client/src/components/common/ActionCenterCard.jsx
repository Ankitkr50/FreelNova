import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import http from "../../api/http.js";

export default function ActionCenterCard() {
  const { data: actionData, isLoading } = useQuery({
    queryKey: ["action_center"],
    queryFn: async () => {
      const res = await http.get("/users/action-center");
      return res.data?.data;
    },
    staleTime: 60000,
  });

  if (isLoading) {
    return <div className="h-36 bg-slate-100/70 rounded-[2rem] animate-pulse border border-slate-200/60" />;
  }

  const actions = actionData?.actions || [
    {
      id: "act-1",
      severity: "HIGH",
      color: "rose",
      title: "Approve ₹25,000 Milestone Release",
      description: "Freelancer delivered Milestone 1 prototype 24 hours ago.",
      actionUrl: "/project-vault",
    },
    {
      id: "act-2",
      severity: "MEDIUM",
      color: "amber",
      title: "Review 3 Freelancer Proposals",
      description: "New applicants submitted bids for React Dashboard.",
      actionUrl: "/my-projects",
    },
  ];

  return (
    <div className="rounded-[2rem] border border-slate-200/80 bg-white p-5 sm:p-7 space-y-5 shadow-[0_12px_36px_rgba(15,23,42,0.03)] transition-all">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
          </span>
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            Operational Action Center
          </h3>
        </div>

        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200/90 px-3 py-1 rounded-full shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
          {actions.length} ACTIONS REQUIRED
        </span>
      </div>

      {/* Grid of Action Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {actions.map((act) => {
          const isHigh = act.severity === "HIGH";
          const isMedium = act.severity === "MEDIUM";

          return (
            <div
              key={act.id}
              className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden group ${
                isHigh
                  ? "bg-gradient-to-br from-rose-50/80 via-rose-50/30 to-white border-rose-200/90 text-rose-950 hover:border-rose-300"
                  : isMedium
                  ? "bg-gradient-to-br from-amber-50/80 via-amber-50/30 to-white border-amber-200/90 text-amber-950 hover:border-amber-300"
                  : "bg-gradient-to-br from-emerald-50/80 via-emerald-50/30 to-white border-emerald-200/90 text-emerald-950 hover:border-emerald-300"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      isHigh
                        ? "bg-rose-100/90 text-rose-700 border-rose-200"
                        : isMedium
                        ? "bg-amber-100/90 text-amber-800 border-amber-200"
                        : "bg-emerald-100/90 text-emerald-800 border-emerald-200"
                    }`}
                  >
                    {act.severity}
                  </span>

                  <span className="text-[11px] font-semibold text-slate-400 group-hover:text-slate-600 transition">
                    Action Priority
                  </span>
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug group-hover:text-blue-700 transition-colors">
                  {act.title}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  {act.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-center justify-between">
                <Link
                  to={act.actionUrl}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-extrabold text-slate-800 border border-slate-200/90 shadow-2xs transition hover:bg-slate-900 hover:text-white hover:border-slate-900"
                >
                  <span>Take Action</span>
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
