import { useQuery } from "@tanstack/react-query";
import http from "../api/http.js";
import { useAuth } from "../hooks/useAuth.js";
import PersonalizedGrowthDashboard from "../components/growth/PersonalizedGrowthDashboard.jsx";
import CommunityHubModule from "../components/growth/CommunityHubModule.jsx";

export default function EcosystemDashboard() {
  const { user } = useAuth();
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["ecosystem_metrics"],
    queryFn: async () => {
      const res = await http.get("/users/ecosystem/metrics").catch(() => ({ data: { data: {} } }));
      return res.data?.data;
    },
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4">
        <div className="h-64 rounded-3xl bg-slate-100 animate-pulse flex items-center justify-center text-slate-400 font-bold">
          Loading Ecosystem Master Dashboard...
        </div>
      </div>
    );
  }

  const data = metrics || {
    totalOAuthApps: 14,
    activeWebhooks: 42,
    apiCalls24h: 12800,
    aiTokens24h: 450000,
    activeIntegrations: ["Slack Slash Commands", "Microsoft Teams", "Google Workspace", "Salesforce CRM"],
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 animate-fadeIn">
      {/* Personalized Growth Dashboard */}
      <PersonalizedGrowthDashboard role={user?.role || "freelancer"} />

      {/* Community Hub Module */}
      <CommunityHubModule />

      <div className="rounded-[2.5rem] bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-8 md:p-12 text-white shadow-2xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-purple-400/20 border border-purple-300/30 px-4 py-1 text-xs font-bold text-purple-200">
          FreelNova Ecosystem Master Dashboard
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-white mt-2">
          Global API, Webhooks & AI Usage Infrastructure
        </h1>
        <p className="text-xs md:text-sm text-purple-100 mt-1 max-w-xl">
          Super Admin control cockpit for third-party OAuth apps, webhook delivery queues, Slack/Teams connectors, and AI model token routing.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold">
        <div className="p-5 rounded-[2rem] border border-slate-200 bg-white space-y-1 shadow-2xs">
          <p className="text-slate-400 uppercase text-[10px]">Connected OAuth Apps</p>
          <p className="text-2xl font-black text-slate-900">{data.totalOAuthApps}</p>
        </div>
        <div className="p-5 rounded-[2rem] border border-slate-200 bg-white space-y-1 shadow-2xs">
          <p className="text-slate-400 uppercase text-[10px]">Active Webhook Deliveries</p>
          <p className="text-2xl font-black text-emerald-600">{data.activeWebhooks}</p>
        </div>
        <div className="p-5 rounded-[2rem] border border-slate-200 bg-white space-y-1 shadow-2xs">
          <p className="text-slate-400 uppercase text-[10px]">24h API Request Volume</p>
          <p className="text-2xl font-black text-blue-600">{(data.apiCalls24h || 0).toLocaleString()}</p>
        </div>
        <div className="p-5 rounded-[2rem] border border-slate-200 bg-white space-y-1 shadow-2xs">
          <p className="text-slate-400 uppercase text-[10px]">24h AI Token Routing</p>
          <p className="text-2xl font-black text-purple-600">{(data.aiTokens24h || 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6 md:p-8 space-y-4 shadow-2xs">
        <h3 className="text-lg font-bold text-slate-900">Active Platform Connectors & Integrations</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {(data.activeIntegrations || []).map((item, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">{item}</span>
              <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ACTIVE ✓
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
