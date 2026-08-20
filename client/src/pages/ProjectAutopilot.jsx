import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import http from "../api/http.js";
import { ROUTES } from "../constants/routes.js";

export default function ProjectAutopilot() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [autopilotResult, setAutopilotResult] = useState(null);
  const [feedback, setFeedback] = useState({ text: "", type: "" });

  // Autopilot Generation Mutation
  const generateAutopilotMutation = useMutation({
    mutationFn: async (clientPrompt) => {
      const res = await http.post("/projects/autopilot/generate", { prompt: clientPrompt });
      return res.data?.data;
    },
    onSuccess: (data) => {
      setAutopilotResult(data);
      setFeedback({ text: "✨ Project specification & team structure generated successfully!", type: "success" });
    },
    onError: (err) => {
      setFeedback({
        text: err.response?.data?.message || "Failed to generate project autopilot specification.",
        type: "error",
      });
    },
  });

  // Publish Project Mutation
  const publishProjectMutation = useMutation({
    mutationFn: async (projectPayload) => {
      const res = await http.post("/projects", projectPayload);
      return res.data;
    },
    onSuccess: (res) => {
      setFeedback({ text: "🚀 Project published live to FreelNova marketplace!", type: "success" });
      setTimeout(() => {
        const createdId = res.data?.id;
        if (createdId) {
          navigate(`/projects/${createdId}`);
        } else {
          navigate(ROUTES.PROJECTS);
        }
      }, 1500);
    },
    onError: (err) => {
      setFeedback({
        text: err.response?.data?.message || "Failed to publish project to marketplace.",
        type: "error",
      });
    },
  });

  const handleGenerate = (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setFeedback({ text: "", type: "" });
    generateAutopilotMutation.mutate(prompt.trim());
  };

  const handlePublish = () => {
    if (!autopilotResult) return;

    const draft = autopilotResult.draftProject;
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + (draft.timelineDays || 14));

    publishProjectMutation.mutate({
      title: draft.title,
      description: draft.description,
      category: draft.category,
      skills: draft.skills,
      budgetMin: Number(draft.budgetMin),
      budgetMax: Number(draft.budgetMax),
      currency: draft.currency || "INR",
      timelineDays: Number(draft.timelineDays),
      deadline: deadlineDate.toISOString(),
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 animate-fadeIn">
      {/* Header Banner */}
      <div className="rounded-[2.5rem] bg-[linear-gradient(135deg,#064e3b_0%,#047857_50%,#059669_100%)] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-400/20 border border-emerald-300/30 px-4 py-1 text-xs font-bold text-emerald-100 backdrop-blur-md">
            <span>🛸</span> AI Project Autopilot for Clients
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
            Describe What You Need.
          </h1>
          <p className="text-base md:text-lg text-emerald-100/90 leading-relaxed">
            Enter a single requirement string. Autopilot will construct full specs, milestone budgets, risk assessments, and match top verified freelancers for your review.
          </p>
        </div>
      </div>

      {/* Prompt Input Form */}
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
        <form onSubmit={handleGenerate} className="space-y-4">
          <label className="block text-sm font-extrabold uppercase tracking-wider text-slate-700">
            Enter Project Requirement
          </label>
          <div className="relative">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='e.g. "I need a modern e-commerce website with Razorpay integration and inventory management"'
              className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition shadow-inner"
              required
            />
            <button
              type="submit"
              disabled={generateAutopilotMutation.isPending || !prompt.trim()}
              className="absolute right-2 top-2 bottom-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-6 text-xs font-bold transition cursor-pointer disabled:opacity-50 border-0 flex items-center gap-2"
            >
              {generateAutopilotMutation.isPending ? "Analyzing..." : "✨ Run Autopilot"}
            </button>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            🔒 Safe & Controlled: Autopilot generates a draft for your review. It will <span className="font-bold text-slate-700">never automatically spend money or publish</span> without your explicit confirmation.
          </p>
        </form>

        {feedback.text && (
          <div
            className={`rounded-2xl p-4 text-xs font-bold ${
              feedback.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-rose-50 border border-rose-200 text-rose-800"
            }`}
          >
            {feedback.text}
          </div>
        )}
      </div>

      {/* Generated Autopilot Specification Review */}
      {autopilotResult && (
        <div className="space-y-8 animate-fadeIn">
          {/* Top Review Bar */}
          <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Specification Status: Draft Ready for Review
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
                Review Everything Before Publishing
              </h3>
            </div>
            <button
              onClick={handlePublish}
              disabled={publishProjectMutation.isPending}
              className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 text-xs font-black uppercase tracking-wider shadow-lg transition cursor-pointer disabled:opacity-50 border-0"
            >
              {publishProjectMutation.isPending ? "Publishing..." : "🚀 Confirm & Publish Project"}
            </button>
          </div>

          {/* Grid Layout */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column (2 Cols): Spec, Milestones, Acceptance Criteria, Risks */}
            <div className="lg:col-span-2 space-y-6">
              {/* Specification Card */}
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 md:p-8 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-bold text-slate-900">Project Specification</h3>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                    {autopilotResult.draftProject.category}
                  </span>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl font-mono text-xs text-slate-700 leading-relaxed overflow-x-auto">
                  <pre className="whitespace-pre-wrap">{autopilotResult.specificationMarkdown}</pre>
                </div>
              </div>

              {/* Milestones Breakdown */}
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 md:p-8 shadow-xs space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Recommended Milestone Schedule</h3>
                <div className="space-y-3">
                  {autopilotResult.milestones.map((m, idx) => (
                    <div key={idx} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-900">{m.title}</span>
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          {m.budgetPercentage}% Budget (₹{m.estimatedCost.toLocaleString()})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-semibold">
                        Estimated Duration: {m.durationDays} Days
                      </p>
                      <div className="flex gap-1.5 flex-wrap pt-1">
                        {m.deliverables.map((d, dIdx) => (
                          <span key={dIdx} className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] text-slate-600 font-medium">
                            ✓ {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Factors & Acceptance Criteria */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xs space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Risk Mitigation Matrix</h4>
                  <div className="space-y-2.5">
                    {autopilotResult.riskFactors.map((r, rIdx) => (
                      <div key={rIdx} className="text-xs space-y-1 bg-amber-50/60 border border-amber-200/80 p-3 rounded-xl">
                        <p className="font-bold text-amber-900">⚠️ {r.risk}</p>
                        <p className="text-[11px] text-amber-800">Strategy: {r.mitigation}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xs space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Acceptance Criteria</h4>
                  <ul className="space-y-2">
                    {autopilotResult.acceptanceCriteria.map((c, cIdx) => (
                      <li key={cIdx} className="text-xs text-slate-700 font-medium flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Right Column (1 Col): Suggested Team & Matching Talent */}
            <div className="space-y-6">
              {/* Suggested Freelancers */}
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-900">Suggested Verified Talent</h3>
                <p className="text-xs text-slate-500">Matched from verified FreelNova directory based on required skills.</p>
                <div className="space-y-3">
                  {autopilotResult.suggestedFreelancers.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No exact freelancer match in database yet. Open for public bids.</p>
                  ) : (
                    autopilotResult.suggestedFreelancers.map((fl) => (
                      <div key={fl.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{fl.name}</p>
                          <p className="text-[10px] text-slate-500">{fl.headline || "Verified Specialist"}</p>
                          <span className="text-[10px] font-bold text-amber-600">★ {fl.ratingAvg?.toFixed(1) || "5.0"}</span>
                        </div>
                        <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                          ₹{fl.hourlyRate || 500}/hr
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Skills Tags */}
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xs space-y-3">
                <h3 className="text-base font-bold text-slate-900">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {autopilotResult.draftProject.skills.map((sk) => (
                    <span key={sk} className="bg-slate-100 text-slate-800 border border-slate-200 px-3 py-1 rounded-xl text-xs font-bold">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
