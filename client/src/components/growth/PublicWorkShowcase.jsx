import React from "react";

export default function PublicWorkShowcase({ showcaseData }) {
  if (!showcaseData) return null;

  const { profile } = showcaseData;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-xl font-black text-white shadow-md">
            {profile.name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{profile.name}</h2>
              {profile.isVerified && (
                <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[9px] font-extrabold">
                  VERIFIED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-semibold">{profile.headline || "Independent Specialist"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Verified Deliveries</p>
            <p className="text-base font-black text-slate-800">{profile.verifiedProjectsCount || 0} Projects</p>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Completion Rate</p>
            <p className="text-base font-black text-emerald-600">{profile.completionRate || 100}%</p>
          </div>
        </div>
      </div>

      {/* Skills */}
      <div>
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Verified Skill Graph</h4>
        <div className="flex flex-wrap gap-1.5">
          {profile.skills?.map((skill, idx) => (
            <span key={idx} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
              ✓ {skill}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
