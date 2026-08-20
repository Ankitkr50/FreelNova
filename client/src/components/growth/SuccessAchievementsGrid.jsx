import React from "react";

export default function SuccessAchievementsGrid({ achievements = [] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Platform Milestones</span>
          <h3 className="text-base font-bold text-slate-900 mt-0.5">Success & Achievement Badges</h3>
        </div>
        <span className="rounded-full bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1 text-[10px] font-extrabold">
          {achievements.length} Unlocked
        </span>
      </div>

      {achievements.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-4 text-center">Complete client milestones and platform activities to unlock achievements!</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {achievements.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 flex items-start gap-3">
              <div className="text-xl">🏆</div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">{item.description}</p>
                <span className="text-[9px] font-semibold text-slate-400 mt-1 block">
                  Unlocked {new Date(item.unlockedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
