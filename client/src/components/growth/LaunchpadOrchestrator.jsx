import React, { useState } from "react";
import { growthApi } from "../../api/growth.api";

export default function LaunchpadOrchestrator() {
  const [ideaTitle, setIdeaTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [orchestration, setOrchestration] = useState(null);

  const handleOrchestrate = async (e) => {
    e.preventDefault();
    if (!ideaTitle) return;
    setLoading(true);
    try {
      const data = await growthApi.orchestrateLaunchpad({ ideaTitle, description });
      setOrchestration(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
      <div>
        <span className="rounded-full bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 text-[10px] font-extrabold uppercase">
          🚀 FreelNova Launchpad
        </span>
        <h2 className="text-xl font-bold text-slate-900 mt-2">Idea-to-Execution Workflow</h2>
        <p className="text-xs text-slate-500 mt-1">
          Have an idea? Launchpad orchestrates AI Specifications, Skill Requirements, Milestone Breakdown, QA & Talent Deployment into one seamless pipeline.
        </p>
      </div>

      <form onSubmit={handleOrchestrate} className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Project Concept Title</label>
          <input
            type="text"
            value={ideaTitle}
            onChange={(e) => setIdeaTitle(e.target.value)}
            placeholder="e.g. AI-Powered Logistics Tracking Platform"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">High-Level Description</label>
          <textarea
            rows="2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Briefly describe target users, key features & goals..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-extrabold text-white hover:from-blue-700 hover:to-indigo-700 transition cursor-pointer"
        >
          {loading ? "Generating Specifications..." : "🚀 Launch Pipeline & Generate Spec"}
        </button>
      </form>

      {orchestration && (
        <div className="mt-5 border-t border-slate-100 pt-4 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Execution Pipeline Steps ({orchestration.ideaTitle})
          </h4>
          <div className="space-y-2">
            {orchestration.steps.map((step) => (
              <div key={step.step} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900">Step {step.step}: {step.title}</span>
                  {step.skills && <p className="text-[10px] text-slate-500 mt-0.5">Skills: {step.skills.join(", ")}</p>}
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${step.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600"}`}>
                  {step.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
