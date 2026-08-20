import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import http from "../api/http.js";
import { useAuth } from "../hooks/useAuth.js";
import { Link } from "react-router-dom";
import OpportunityRadarCard from "../components/dashboard/OpportunityRadarCard.jsx";
import EarningIntelligenceSection from "../components/dashboard/EarningIntelligenceSection.jsx";

export default function CareerAutopilot() {
  const { user } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState("all"); // "all" | "high_match" | "low_comp"
  const [proposalModalProject, setProposalModalProject] = useState(null);
  const [aiProposalText, setAiProposalText] = useState("");
  const [proposalTone, setProposalTone] = useState("Professional & Persuasive");
  const [keyHighlights, setKeyHighlights] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [submitFeedback, setSubmitFeedback] = useState({ text: "", type: "" });

  // Fetch Autopilot Recommendations
  const { data: autopilotData, isLoading, isError, refetch } = useQuery({
    queryKey: ["career_autopilot_recommendations"],
    queryFn: async () => {
      const res = await http.get("/users/career-autopilot").catch(() => ({ data: { data: {} } }));
      return res.data?.data;
    },
    staleTime: 60000,
  });

  const { data: radarData, isLoading: isRadarLoading } = useQuery({
    queryKey: ["opportunity_radar"],
    queryFn: async () => {
      const res = await http.get("/users/opportunity-radar").catch(() => ({ data: { data: {} } }));
      return res.data?.data;
    },
    staleTime: 60000,
  });

  const { data: intelligenceData, isLoading: isIntelligenceLoading } = useQuery({
    queryKey: ["earning_intelligence"],
    queryFn: async () => {
      const res = await http.get("/users/earning-intelligence").catch(() => ({ data: { data: {} } }));
      return res.data?.data;
    },
    staleTime: 60000,
  });

  // Generate AI Proposal Mutation
  const generateProposalMutation = useMutation({
    mutationFn: async ({ projectId, tone, highlights }) => {
      const res = await http.post("/users/career-autopilot/generate-proposal", {
        projectId,
        customTone: tone,
        keyHighlights: highlights,
      });
      return res.data?.data;
    },
    onSuccess: (data) => {
      setAiProposalText(data.proposalText);
      setBidAmount(data.recommendedBid || "");
      setDeliveryDays(data.recommendedDeliveryDays || "");
    },
  });

  // Submit Application Mutation
  const submitApplicationMutation = useMutation({
    mutationFn: async ({ projectId, payload }) => {
      const res = await http.post(`/projects/${projectId}/apply`, payload);
      return res.data;
    },
    onSuccess: () => {
      setSubmitFeedback({
        text: "🎉 Application submitted successfully to the client!",
        type: "success",
      });
      setTimeout(() => {
        setProposalModalProject(null);
        setSubmitFeedback({ text: "", type: "" });
        refetch();
      }, 1800);
    },
    onError: (err) => {
      setSubmitFeedback({
        text: err.response?.data?.message || "Failed to submit application.",
        type: "error",
      });
    },
  });

  const handleOpenAiProposal = (item) => {
    setProposalModalProject(item);
    setSubmitFeedback({ text: "", type: "" });
    setAiProposalText("");
    setKeyHighlights("");
    generateProposalMutation.mutate({
      projectId: item.project.id,
      tone: proposalTone,
      highlights: "",
    });
  };

  const handleRegenerateWithTone = (tone) => {
    setProposalTone(tone);
    if (proposalModalProject) {
      generateProposalMutation.mutate({
        projectId: proposalModalProject.project.id,
        tone,
        highlights: keyHighlights,
      });
    }
  };

  const handleSubmitProposal = (e) => {
    e.preventDefault();
    if (!proposalModalProject || !aiProposalText.trim()) return;

    submitApplicationMutation.mutate({
      projectId: proposalModalProject.project.id,
      payload: {
        proposal: aiProposalText.trim(),
        bidAmount: Number(bidAmount),
        deliveryDays: Number(deliveryDays),
      },
    });
  };

  const recommendations = Array.isArray(autopilotData?.recommendations)
    ? autopilotData.recommendations
    : Array.isArray(autopilotData)
    ? autopilotData
    : [];

  const filteredRecommendations = recommendations.filter((item) => {
    const score = item?.autopilot?.matchScore ?? item?.matchScore ?? 80;
    const competition = item?.autopilot?.estimatedCompetition ?? item?.estimatedCompetition ?? "Low";
    if (selectedFilter === "high_match") return score >= 75;
    if (selectedFilter === "low_comp") return String(competition).toLowerCase().includes("low");
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 animate-fadeIn">
      {/* Header Banner */}
      <div className="rounded-[2.5rem] bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_40%,#1e3a8a_100%)] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 border border-blue-400/30 px-4 py-1 text-xs font-bold text-blue-200 backdrop-blur-md">
              Next-Gen Freelancer Career Cockpit
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
              FreelNova Career Autopilot
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed">
              AI-driven project discovery engine that matches your verified skills, rating, price preferences, and availability with top hiring clients.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="grid grid-cols-2 gap-3 shrink-0 bg-white/10 backdrop-blur-xl border border-white/15 p-4 rounded-3xl">
            <div className="p-3 text-center">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Matched Jobs</p>
              <p className="text-2xl md:text-3xl font-black text-emerald-400 mt-1">{recommendations.length}</p>
            </div>
            <div className="p-3 text-center border-l border-white/10">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Top Match</p>
              <p className="text-2xl md:text-3xl font-black text-blue-400 mt-1">
                {recommendations[0] ? `${recommendations[0]?.autopilot?.matchScore ?? recommendations[0]?.matchScore ?? 96}%` : "100%"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Opportunity Radar & Earning Intelligence */}
      <OpportunityRadarCard opportunities={radarData} isLoading={isRadarLoading} />
      <EarningIntelligenceSection intelligenceData={intelligenceData} isLoading={isIntelligenceLoading} />

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex gap-2 text-xs font-bold w-full sm:w-auto overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedFilter("all")}
            className={`px-4 py-2.5 rounded-xl transition cursor-pointer ${
              selectedFilter === "all"
                ? "bg-slate-900 text-white shadow-md font-extrabold"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            All Recommended ({recommendations.length})
          </button>
          <button
            onClick={() => setSelectedFilter("high_match")}
            className={`px-4 py-2.5 rounded-xl transition cursor-pointer ${
              selectedFilter === "high_match"
                ? "bg-emerald-600 text-white shadow-md font-extrabold"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            High Match (75%+)
          </button>
          <button
            onClick={() => setSelectedFilter("low_comp")}
            className={`px-4 py-2.5 rounded-xl transition cursor-pointer ${
              selectedFilter === "low_comp"
                ? "bg-blue-600 text-white shadow-md font-extrabold"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Low Competition Bids
          </button>
        </div>

        <span className="text-xs font-semibold text-slate-500">
          Showing <span className="font-bold text-slate-900">{filteredRecommendations.length}</span> curated opportunities
        </span>
      </div>

      {/* Recommendations Feed */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-3xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filteredRecommendations.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-600 space-y-3">
          <h3 className="text-lg font-bold text-slate-800">No active project recommendations right now</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Marketplace projects posted by clients will be analyzed automatically in real-time by Career Autopilot and ranked here.
          </p>
          <div className="pt-2">
            <Link to="/projects" className="inline-block rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 transition">
              Browse Marketplace Projects →
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredRecommendations.map((item, idx) => {
            const project = item?.project || item || {};
            const autopilot = item?.autopilot || {
              matchScore: item?.matchScore || 85,
              matchReason: item?.matchReason || "High skill alignment.",
              estimatedCompetition: item?.estimatedCompetition || "Low",
              suggestedBid: item?.suggestedBid || project?.budgetMin || 50000,
              suggestedDeliveryDays: item?.suggestedDeliveryDays || 14,
            };
            const projId = project.id || project._id || `proj_${idx}`;
            return (
              <div
                key={projId}
                className="rounded-[2rem] border border-slate-200/80 bg-white p-6 md:p-8 shadow-[0_12px_36px_rgba(15,23,42,0.04)] hover:shadow-xl transition-all duration-300 space-y-6 group"
              >
                {/* Top Row: Match Score Badge & Project Code */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-md">
                      {autopilot.matchScore || 85}%
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          ★ {autopilot.matchScore || 85}% MATCH SCORE
                        </span>
                        <span className="text-xs font-bold text-slate-400 font-mono">
                          {project.projectCode || `PROJ-${idx + 1}`}
                        </span>
                      </div>
                      <h2 className="text-lg md:text-xl font-bold text-slate-900 group-hover:text-blue-600 transition mt-0.5">
                        {project.title || "Matched Freelance Opportunity"}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-bold">
                      📍 {project.category}
                    </span>
                    <span className="rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 text-xs font-bold">
                      {autopilot.expectedDifficulty}
                    </span>
                  </div>
                </div>

                {/* Description snippet */}
                <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                  {project.description}
                </p>

                {/* Grid: Why You Match & Autopilot Metrics */}
                <div className="grid md:grid-cols-2 gap-6 bg-slate-50/80 rounded-2xl p-5 border border-slate-100">
                  {/* Left: Why You Match */}
                  <div className="space-y-2">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                      Why You Match
                    </p>
                    <ul className="space-y-1.5">
                      {autopilot.whyYouMatch.map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 font-semibold">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Right: Competition, Recommended Bid, Missing Skills */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Estimated Competition:</span>
                      <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full">
                        {autopilot.estimatedCompetition}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Recommended Bid Range:</span>
                      <span className="font-extrabold text-blue-700">
                        ₹{autopilot.recommendedBidRange.min.toLocaleString()} - ₹{autopilot.recommendedBidRange.max.toLocaleString()}
                      </span>
                    </div>

                    {autopilot.missingSkills && autopilot.missingSkills.length > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Missing Skills:</span>
                        <div className="flex gap-1 flex-wrap">
                          {autopilot.missingSkills.map((sk) => (
                            <span key={sk} className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Project Budget:</span>
                    <span className="text-base font-black text-slate-900">
                      ₹{project.budgetMin.toLocaleString()} - ₹{project.budgetMax.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Link
                      to={`/projects/${project.id}`}
                      className="flex-1 sm:flex-initial text-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-3 transition"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => handleOpenAiProposal(item)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-6 py-3 shadow-md transition cursor-pointer border-0"
                    >
                      🪄 Generate Proposal with AI
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Proposal Drawer / Modal */}
      {proposalModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-6 md:p-8 shadow-2xl space-y-6 my-8 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold px-3 py-1 uppercase tracking-wider">
                  AI Proposal Draft Assistant
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  Proposal for: {proposalModalProject.project.title}
                </h3>
              </div>
              <button
                onClick={() => setProposalModalProject(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition border-0 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {submitFeedback.text && (
              <div
                className={`rounded-2xl p-4 text-xs font-bold ${
                  submitFeedback.type === "success"
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border border-rose-200 text-rose-800"
                }`}
              >
                {submitFeedback.text}
              </div>
            )}

            {/* Tone Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Select Proposal Tone
              </label>
              <div className="flex gap-2 flex-wrap text-xs">
                {["Professional & Persuasive", "Technical & Detail-Oriented", "Direct & Outcome-Focused"].map((t) => (
                  <button
                    key={t}
                    onClick={() => handleRegenerateWithTone(t)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition border cursor-pointer ${
                      proposalTone === t
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Proposal Text Editor */}
            <form onSubmit={handleSubmitProposal} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    AI Proposal Draft (Editable)
                  </label>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Never auto-submitted without your explicit confirmation
                  </span>
                </div>
                {generateProposalMutation.isPending ? (
                  <div className="h-48 rounded-2xl bg-slate-100 animate-pulse flex items-center justify-center text-xs font-bold text-slate-500">
                    Crafting personalized pitch with AI...
                  </div>
                ) : (
                  <textarea
                    rows={9}
                    value={aiProposalText}
                    onChange={(e) => setAiProposalText(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 p-4 text-xs leading-relaxed text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none font-mono"
                    required
                  />
                )}
              </div>

              {/* Bid Amount & Delivery Days Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Your Bid Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="Enter bid amount"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Delivery Timeline (Days)
                  </label>
                  <input
                    type="number"
                    value={deliveryDays}
                    onChange={(e) => setDeliveryDays(e.target.value)}
                    placeholder="Enter days"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProposalModalProject(null)}
                  className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitApplicationMutation.isPending || !aiProposalText.trim()}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50 border-0"
                >
                  {submitApplicationMutation.isPending ? "Submitting..." : "Confirm & Submit Proposal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
