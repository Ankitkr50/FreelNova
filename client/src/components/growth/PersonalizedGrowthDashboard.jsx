import React, { useState, useEffect } from "react";
import { growthApi } from "../../api/growth.api";
import ReputationBadgeCard from "./ReputationBadgeCard";
import ReferralAmbassadorModule from "./ReferralAmbassadorModule";
import SuccessAchievementsGrid from "./SuccessAchievementsGrid";

export default function PersonalizedGrowthDashboard({ role }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [referralStats, setReferralStats] = useState(null);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [growthRes, refRes] = await Promise.all([
        growthApi.getGrowthDashboard(),
        growthApi.getReferralInfo(),
      ]);
      setData(growthRes);
      setReferralStats(refRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 h-64 flex items-center justify-center">
        <span className="text-xs text-slate-400 font-semibold">Loading Growth Dashboard...</span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-3xl border border-blue-150 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 text-white shadow-xl">
        <span className="rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider">
          📈 Personalized Growth OS
        </span>
        <h2 className="text-2xl font-bold mt-2">
          {role === "freelancer" ? "Career & Earnings Growth Center" : "Client Success & Talent Network"}
        </h2>
        <p className="text-xs text-blue-200 mt-1 max-w-xl">
          Track reputation scores, Ambassador rewards, verified progression tiers, and milestone achievements in real-time.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ReputationBadgeCard reputation={data.reputation} />
        {referralStats && <ReferralAmbassadorModule stats={referralStats} onRefresh={loadDashboardData} />}
      </div>

      <SuccessAchievementsGrid achievements={data.achievements || []} />
    </div>
  );
}
