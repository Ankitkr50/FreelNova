import React, { useState } from "react";
import { growthApi } from "../../api/growth.api";

export default function InstantHireModal({ isOpen, onClose, onSelectFreelancer }) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [searched, setSearched] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await growthApi.getInstantHire({ category: "Development" });
      setRecommendations(res.recommendations || []);
      setSearched(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="rounded-full bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase">
              ⚡ Fast Hiring Workflow
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">Instant Specialist Hire</h3>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 text-xs font-bold">
            ✕
          </button>
        </div>

        {!searched ? (
          <div className="py-8 text-center space-y-4">
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Need someone quickly? Our AI instant matcher analyzes top available, verified specialists with verified skills and immediate availability.
            </p>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-xs font-extrabold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 transition cursor-pointer"
            >
              {loading ? "Finding Top Specialists..." : "⚡ Find Available Specialists Now"}
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-xs font-bold text-slate-700">Top Recommended Available Talent:</p>
            {recommendations.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{item.name}</h4>
                  <p className="text-[10px] text-slate-500">{item.headline || "Verified Specialist"}</p>
                  <div className="mt-1 flex items-center gap-2 text-[10px]">
                    <span className="font-extrabold text-emerald-600">{item.matchPercentage}% Match</span>
                    <span className="text-slate-400">•</span>
                    <span className="font-bold text-slate-700">{item.hourlyRateFormatted}</span>
                  </div>
                </div>
                <button
                  onClick={() => onSelectFreelancer && onSelectFreelancer(item)}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold transition cursor-pointer"
                >
                  Hire Instant Specialist
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
