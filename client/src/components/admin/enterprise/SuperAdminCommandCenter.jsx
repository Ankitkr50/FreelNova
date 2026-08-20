import { useQuery } from "@tanstack/react-query";
import { enterpriseApi } from "../../../api/enterprise.api.js";

export default function SuperAdminCommandCenter({ onNavigateTab }) {
  const { data: resData, isLoading, refetch } = useQuery({
    queryKey: ["commandCenterOverview"],
    queryFn: async () => {
      const res = await enterpriseApi.getCommandCenter();
      return res.data?.data;
    },
    refetchInterval: 30000,
  });

  const kpi = resData?.kpi || {
    criticalSecurityAlerts: 0,
    pendingDisputes: 0,
    pendingFinanceApprovals: 0,
    openTickets: 0,
    slaBreachedTickets: 0,
    activeStaffCount: 0,
    pendingEscrowAmount: 0,
  };

  const cards = [
    {
      title: "Critical Security Alerts",
      count: kpi.criticalSecurityAlerts,
      icon: "🚨",
      color: "border-rose-300 bg-rose-50/90 dark:bg-slate-900 dark:border-rose-900/80",
      badgeColor: "bg-rose-600 text-white font-bold",
      tab: "security_fraud_center",
      description: "Active high severity platform security signals",
      titleColor: "text-rose-950 dark:text-rose-200",
      descColor: "text-rose-900/80 dark:text-rose-300/80",
    },
    {
      title: "Pending Disputes",
      count: kpi.pendingDisputes,
      icon: "⚖️",
      color: "border-amber-300 bg-amber-50/90 dark:bg-slate-900 dark:border-amber-900/80",
      badgeColor: "bg-amber-600 text-white font-bold",
      tab: "dispute_resolution",
      description: "Escrow & contract arbitration cases awaiting action",
      titleColor: "text-amber-950 dark:text-amber-200",
      descColor: "text-amber-900/80 dark:text-amber-300/80",
    },
    {
      title: "Finance Approvals",
      count: kpi.pendingFinanceApprovals,
      icon: "💰",
      color: "border-emerald-300 bg-emerald-50/90 dark:bg-slate-900 dark:border-emerald-900/80",
      badgeColor: "bg-emerald-700 text-white font-bold",
      tab: "finance_approvals",
      description: "Pending refund, withdrawal & escrow release overrides",
      titleColor: "text-emerald-950 dark:text-emerald-200",
      descColor: "text-emerald-900/80 dark:text-emerald-300/80",
    },
    {
      title: "Open Support Tickets",
      count: kpi.openTickets,
      icon: "🎫",
      color: "border-blue-300 bg-blue-50/90 dark:bg-slate-900 dark:border-blue-900/80",
      badgeColor: "bg-blue-700 text-white font-bold",
      tab: "support_sla_tickets",
      description: "Incoming customer & freelancer helpdesk tickets",
      titleColor: "text-blue-950 dark:text-blue-200",
      descColor: "text-blue-900/80 dark:text-blue-300/80",
    },
    {
      title: "SLA Breaches",
      count: kpi.slaBreachedTickets,
      icon: "⚠️",
      color: "border-purple-300 bg-purple-50/90 dark:bg-slate-900 dark:border-purple-900/80",
      badgeColor: "bg-purple-700 text-white font-bold",
      tab: "support_sla_tickets",
      description: "Tickets past priority response deadline",
      titleColor: "text-purple-950 dark:text-purple-200",
      descColor: "text-purple-900/80 dark:text-purple-300/80",
    },
    {
      title: "Active Staff",
      count: kpi.activeStaffCount,
      icon: "👥",
      color: "border-slate-300 bg-slate-100/90 dark:bg-slate-900 dark:border-slate-700",
      badgeColor: "bg-slate-800 text-white font-bold",
      tab: "staff",
      description: "Active internal operational team members",
      titleColor: "text-slate-950 dark:text-slate-100",
      descColor: "text-slate-700 dark:text-slate-300",
    },
    {
      title: "Pending Escrow",
      count: `₹${(kpi.pendingEscrowAmount || 0).toLocaleString("en-IN")}`,
      icon: "💳",
      color: "border-indigo-300 bg-indigo-50/90 dark:bg-slate-900 dark:border-indigo-900/80",
      badgeColor: "bg-indigo-700 text-white font-bold",
      tab: "payments",
      description: "Escrow funds locked in active milestones",
      titleColor: "text-indigo-950 dark:text-indigo-200",
      descColor: "text-indigo-900/80 dark:text-indigo-300/80",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-indigo-400 uppercase mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            FreeINova Enterprise Command System
          </div>
          <h2 className="text-2xl font-bold">Super Admin Command Center</h2>
          <p className="text-slate-300 text-sm mt-1">
            Real-time orchestration overview across all 13 operational governance modules.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="self-start sm:self-auto px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition backdrop-blur-sm"
        >
          🔄 Refresh Signals
        </button>
      </div>

      {/* KPI Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 animate-pulse">Loading Command Center Telemetry...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cards.map((card, idx) => (
            <div
              key={idx}
              onClick={() => onNavigateTab && onNavigateTab(card.tab)}
              className={`p-5 rounded-2xl border ${card.color} shadow-sm transition-all duration-200 hover:scale-[1.02] cursor-pointer hover:shadow-lg flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-end mb-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black shadow-sm ${card.badgeColor}`}>
                    {card.count}
                  </span>
                </div>
                <h3 className={`font-bold text-base ${card.titleColor}`}>{card.title}</h3>
                <p className={`text-xs mt-1 font-medium ${card.descColor}`}>{card.description}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-400 group">
                <span>Open Module</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
