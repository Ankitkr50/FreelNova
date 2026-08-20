import { useQuery } from "@tanstack/react-query";
import http from "../api/http.js";

export default function IncomeOSDashboard() {
  const { data: incomeData, isLoading } = useQuery({
    queryKey: ["income_os"],
    queryFn: async () => {
      const res = await http.get("/users/income-os").catch(() => ({ data: { data: {} } }));
      return res.data?.data;
    },
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4">
        <div className="h-64 rounded-3xl bg-slate-100 animate-pulse flex items-center justify-center text-slate-400 font-bold">
          Loading Income OS Forecast...
        </div>
      </div>
    );
  }

  const data = {
    currentMonthEarnings: incomeData?.currentMonthEarnings ?? 0,
    pendingPayments: incomeData?.pendingPayments ?? 0,
    escrowBalance: incomeData?.escrowBalance ?? 0,
    activeContractValue: incomeData?.activeContractValue ?? 0,
    recurringRetainerIncome: incomeData?.recurringRetainerIncome ?? 0,
    expectedUpcomingIncome: incomeData?.expectedUpcomingIncome ?? 0,
    withdrawableAmount: incomeData?.withdrawableAmount ?? 0,
    forecastExplanation: incomeData?.forecastExplanation || "No income forecast available yet. Apply to projects and secure milestone contracts to build your forecast.",
    aiRecommendations: Array.isArray(incomeData?.aiRecommendations) && incomeData.aiRecommendations.length > 0
      ? incomeData.aiRecommendations
      : [
          "Complete your profile skills to boost project matching frequency.",
          "Apply to high-budget marketplace projects.",
          "Submit custom milestone bids to secure client escrow payments.",
        ],
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 animate-fadeIn">
      {/* Header Banner */}
      <div className="rounded-[2.5rem] bg-[linear-gradient(135deg,#0f274f_0%,#163d7a_52%,#2563eb_100%)] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-400/20 border border-blue-300/30 px-4 py-1 text-xs font-bold text-blue-100 backdrop-blur-md">
              FreelNova Income OS
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mt-2">
              Financial Cockpit & 30-Day Forecast
            </h1>
            <p className="text-xs md:text-sm text-blue-100/90 mt-1 max-w-xl leading-relaxed">
              Track active escrow, recurring retainer revenue, withdrawable balance, and AI-powered 30-day income projections.
            </p>
          </div>

          <div className="bg-white/10 border border-white/20 p-6 rounded-3xl backdrop-blur-xl shrink-0 text-center space-y-1">
            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">Withdrawable Balance</p>
            <p className="text-3xl font-black text-white">₹{data.withdrawableAmount.toLocaleString()}</p>
            <button className="w-full rounded-xl bg-white text-blue-950 text-xs font-bold py-2 mt-2 cursor-pointer border-0 shadow-md hover:bg-blue-50 transition">
              Withdraw Funds
            </button>
          </div>
        </div>
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold">
        <div className="p-5 rounded-[2rem] border border-slate-200 bg-white space-y-1 shadow-2xs">
          <p className="text-slate-400 uppercase tracking-wider text-[10px]">Current Month Earnings</p>
          <p className="text-2xl font-black text-slate-900">₹{data.currentMonthEarnings.toLocaleString()}</p>
        </div>
        <div className="p-5 rounded-[2rem] border border-slate-200 bg-white space-y-1 shadow-2xs">
          <p className="text-slate-400 uppercase tracking-wider text-[10px]">Pending Escrow Payments</p>
          <p className="text-2xl font-black text-amber-600">₹{data.pendingPayments.toLocaleString()}</p>
        </div>
        <div className="p-5 rounded-[2rem] border border-slate-200 bg-white space-y-1 shadow-2xs">
          <p className="text-slate-400 uppercase tracking-wider text-[10px]">Recurring Retainer Income</p>
          <p className="text-2xl font-black text-blue-600">₹{data.recurringRetainerIncome.toLocaleString()}</p>
        </div>
        <div className="p-5 rounded-[2rem] border border-slate-200 bg-white space-y-1 shadow-2xs">
          <p className="text-slate-400 uppercase tracking-wider text-[10px]">Active Contract Value</p>
          <p className="text-2xl font-black text-purple-600">₹{data.activeContractValue.toLocaleString()}</p>
        </div>
      </div>

      {/* 30-Day Forecast Box */}
      <div className="rounded-[2.5rem] border border-blue-200 bg-blue-50/60 p-6 md:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-black text-blue-900 uppercase tracking-wider">
              ESTIMATED NEXT 30 DAYS INCOME FORECAST
            </span>
            <p className="text-3xl font-black text-slate-900 mt-1">
              ₹{data.expectedUpcomingIncome.toLocaleString()}
            </p>
          </div>
          <span className="bg-blue-600 text-white font-extrabold px-4 py-1.5 rounded-full text-xs shadow-md">
            Trending Up
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-blue-200/80 space-y-2 text-xs">
          <p className="font-bold text-slate-900">AI Forecast Analysis:</p>
          <p className="text-slate-700 leading-relaxed font-mono">{data.forecastExplanation}</p>
        </div>

        <div className="space-y-2 text-xs">
          <p className="font-bold text-blue-950 uppercase tracking-wider text-[10px]">
            AI Income Optimization Recommendations:
          </p>
          <div className="grid md:grid-cols-3 gap-3">
            {data.aiRecommendations.map((rec, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-white border border-blue-200/80 text-slate-700 font-medium">
                <span className="text-blue-600 font-bold block mb-1">✓ Strategy #{idx + 1}</span>
                {rec}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
