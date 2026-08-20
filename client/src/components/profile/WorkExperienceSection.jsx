import { useState } from "react";
import SectionCard from "./SectionCard.jsx";

function WorkExperienceSection({ experience = [], editable = false, onChange }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newExp, setNewExp] = useState({
    companyName: "",
    role: "",
    duration: "",
    description: "",
  });

  const handleAdd = () => {
    if (!newExp.companyName.trim() || !newExp.role.trim()) {
      alert("Company Name and Role are required.");
      return;
    }

    const updated = [...experience, { ...newExp, id: "exp_" + Date.now() }];
    onChange("workExperience", updated);
    setNewExp({ companyName: "", role: "", duration: "", description: "" });
    setIsAdding(false);
  };

  const handleRemove = (id) => {
    const updated = experience.filter((item) => item.id !== id);
    onChange("workExperience", updated);
  };

  return (
    <SectionCard
      description="List your past companies, projects, and roles to showcase your career timeline."
      title="Work Experience History"
    >
      {experience.length > 0 ? (
        <div className="space-y-6">
          {experience.map((item) => (
            <div
              key={item.id || item.companyName}
              className="relative border-l-2 border-blue-500 pl-6 space-y-1.5 py-1"
            >
              {editable && (
                <button
                  onClick={() => handleRemove(item.id)}
                  className="absolute right-0 top-0 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-100 hover:bg-rose-100/60 transition cursor-pointer"
                  type="button"
                >
                  Remove
                </button>
              )}
              <h3 className="text-base font-bold text-slate-900">{item.role}</h3>
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 flex-wrap">
                <span>🏢 {item.companyName}</span>
                <span>&bull;</span>
                <span className="text-slate-500">🗓️ {item.duration || "Present"}</span>
              </div>
              {item.description && (
                <p className="text-sm leading-relaxed text-slate-600 mt-2 max-w-2xl whitespace-pre-line">
                  {item.description}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500 italic">No work experience history listed yet.</p>
      )}

      {editable && (
        <div className="mt-6 border-t border-slate-100 pt-6">
          {isAdding ? (
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 space-y-4 max-w-xl">
              <h4 className="text-sm font-bold text-slate-800">Add Work History</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={newExp.companyName}
                    onChange={(e) => setNewExp(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="e.g. Google India"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Role / Job Title</label>
                  <input
                    type="text"
                    value={newExp.role}
                    onChange={(e) => setNewExp(prev => ({ ...prev, role: e.target.value }))}
                    placeholder="e.g. Lead Designer"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Duration / Timeline</label>
                <input
                  type="text"
                  value={newExp.duration}
                  onChange={(e) => setNewExp(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="e.g. Jan 2023 - Present, or 2 Years"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Job Description</label>
                <textarea
                  value={newExp.description}
                  onChange={(e) => setNewExp(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your major accomplishments or tech stack used..."
                  rows="3"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setIsAdding(false)}
                  className="rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 px-4 py-2 transition cursor-pointer"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white px-4 py-2 shadow-sm transition cursor-pointer"
                  type="button"
                >
                  Save Entry
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="rounded-xl border border-dashed border-slate-350 hover:border-blue-400 hover:bg-blue-50/50 text-xs font-bold text-blue-600 px-4 py-3 transition flex items-center gap-1.5 cursor-pointer"
              type="button"
            >
              ➕ Add Work Experience
            </button>
          )}
        </div>
      )}
    </SectionCard>
  );
}

export default WorkExperienceSection;
