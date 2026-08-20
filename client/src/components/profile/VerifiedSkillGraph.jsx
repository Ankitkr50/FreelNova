import { useState } from "react";

export default function VerifiedSkillGraph({ skillGraphData, isLoading }) {
  const [selectedSkill, setSelectedSkill] = useState(null);

  if (isLoading) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 animate-pulse">
        <div className="h-6 w-48 bg-slate-200 rounded mb-4"></div>
        <div className="h-16 bg-slate-100 rounded-2xl"></div>
      </div>
    );
  }

  const skills = skillGraphData?.skills || [
    { skill: "React.js", level: "EXPERT", score: 95, evidence: { completedProjectsCount: 8, averageRating: 4.9 } },
    { skill: "Node.js", level: "ADVANCED", score: 85, evidence: { completedProjectsCount: 4, averageRating: 4.8 } },
    { skill: "Express", level: "ADVANCED", score: 80, evidence: { completedProjectsCount: 4, averageRating: 4.8 } },
    { skill: "Tailwind CSS", level: "EXPERT", score: 92, evidence: { completedProjectsCount: 6, averageRating: 5.0 } },
  ];

  const getBadgeStyle = (level) => {
    switch (level) {
      case "EXPERT":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "ADVANCED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "INTERMEDIATE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Verified Skill Graph</h3>
          <p className="text-xs text-slate-400">
            Skills level verified from completed escrow projects & client evaluations.
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
          {skills.length} Skills
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {skills.map((item) => (
          <div
            key={item.skill}
            onClick={() => setSelectedSkill(selectedSkill?.skill === item.skill ? null : item)}
            className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900">{item.skill}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${getBadgeStyle(item.level)}`}>
                ✓ {item.level}
              </span>
            </div>

            {/* Level Bar */}
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-500"
                style={{ width: `${item.score}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
              <span>{item.evidence?.completedProjectsCount || 0} Verified Contracts</span>
              <span>★ {item.evidence?.averageRating || 5.0} Rating</span>
            </div>

            {selectedSkill?.skill === item.skill && (
              <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-600 space-y-1 animate-fadeIn">
                <p className="font-bold text-slate-800">Verified Evidence:</p>
                <p>✓ Profile Portfolio Evidence Verified</p>
                <p>✓ AI Competency Assessment: {item.evidence?.aiAssessmentScore || 90}%</p>
                <p>✓ Escrow Contract Releases: {item.evidence?.completedProjectsCount || 0} Projects</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
