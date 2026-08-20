import React from "react";

export default function PersonalizedDiscoveryFeed({ feedData, role }) {
  if (!feedData) return null;

  if (role === "freelancer") {
    const { projects = [] } = feedData;
    return (
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <span>🔥</span> Personalized Project Feed for You
        </h3>
        {projects.map((p) => (
          <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-blue-300 transition">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-150">
                {p.category}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {p.labels?.map((l, idx) => (
                  <span key={idx} className={`rounded-full border px-2.5 py-0.5 text-[10px] ${l.color}`}>
                    {l.text}
                  </span>
                ))}
              </div>
            </div>
            <h4 className="text-sm font-bold text-slate-900 mt-2.5">{p.title}</h4>
            <p className="text-xs text-slate-600 line-clamp-2 mt-1">{p.description}</p>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span>Budget: <strong className="text-slate-900 font-bold">₹{p.budgetMin} - ₹{p.budgetMax}</strong></span>
              <span>Client: <strong className="text-slate-800 font-semibold">{p.recruiter?.name}</strong></span>
            </div>
          </div>
        ))}
      </div>
    );
  } else {
    const { freelancers = [] } = feedData;
    return (
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <span>🌟</span> Recommended Top Talent
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {freelancers.map((f) => (
            <div key={f.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white text-sm">
                  {f.name[0]}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{f.name}</h4>
                  <p className="text-[10px] text-slate-500 truncate max-w-[150px]">{f.headline || "Specialist"}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs border-t border-slate-100 pt-2">
                <span className="font-extrabold text-amber-600">★ {f.ratingAvg.toFixed(1)}</span>
                <span className="font-bold text-slate-800">₹{f.hourlyRate}/hr</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}
