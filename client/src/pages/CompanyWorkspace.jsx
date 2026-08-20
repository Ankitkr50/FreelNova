import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import http from "../api/http.js";
import SpendIntelligenceSection from "../components/dashboard/SpendIntelligenceSection.jsx";
import SmartRehiringWidget from "../components/projects/SmartRehiringWidget.jsx";

export default function CompanyWorkspace() {
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "approvals" | "teams" | "budgets"
  const [freelancerTitle, setFreelancerTitle] = useState("");
  const [budgetRequested, setBudgetRequested] = useState("");
  const [justification, setJustification] = useState("");
  const [feedback, setFeedback] = useState({ text: "", type: "" });

  // Fetch Company Workspace
  const { data: workspaceData, isLoading, refetch } = useQuery({
    queryKey: ["company_workspace"],
    queryFn: async () => {
      const res = await http.get("/users/company-workspace").catch(() => ({ data: { data: {} } }));
      return res.data?.data;
    },
    staleTime: 60000,
  });

  const { data: spendData, isLoading: isSpendLoading } = useQuery({
    queryKey: ["spend_intelligence"],
    queryFn: async () => {
      const res = await http.get("/users/spend-intelligence").catch(() => ({ data: { data: {} } }));
      return res.data?.data;
    },
    staleTime: 60000,
  });

  const { data: rehiringData, isLoading: isRehiringLoading } = useQuery({
    queryKey: ["rehiring_pool"],
    queryFn: async () => {
      const res = await http.get("/users/rehiring-pool").catch(() => ({ data: { data: [] } }));
      return res.data?.data;
    },
    staleTime: 60000,
  });

  // Create Approval Request Mutation
  const createApprovalMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await http.post("/users/company-workspace/approvals", payload);
      return res.data;
    },
    onSuccess: () => {
      setFeedback({ text: "✅ Hiring approval request submitted to workflow!", type: "success" });
      setFreelancerTitle("");
      setBudgetRequested("");
      setJustification("");
      refetch();
    },
  });

  // Approve Workflow Step Mutation
  const approveStepMutation = useMutation({
    mutationFn: async ({ requestId, targetStep }) => {
      const res = await http.post(`/users/company-workspace/approvals/${requestId}/approve`, { targetStep });
      return res.data;
    },
    onSuccess: () => {
      refetch();
    },
  });

  const handleCreateApproval = (e) => {
    e.preventDefault();
    if (!freelancerTitle.trim() || !budgetRequested) return;
    createApprovalMutation.mutate({
      freelancerTitle: freelancerTitle.trim(),
      budgetRequested: Number(budgetRequested),
      justification: justification.trim(),
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4">
        <div className="h-64 rounded-3xl bg-slate-100 animate-pulse flex items-center justify-center text-slate-400 font-bold">
          Loading Company Workspace...
        </div>
      </div>
    );
  }

  const workspace = workspaceData?.workspace || {};
  const approvalRequests = workspaceData?.approvalRequests || [];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 animate-fadeIn">
      {/* Header Banner */}
      <div className="rounded-[2.5rem] bg-[linear-gradient(135deg,#0f172a_0%,#1e3a8a_50%,#2563eb_100%)] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 border border-white/30 px-3.5 py-1 text-xs font-bold text-white backdrop-blur-md">
              Enterprise Work OS
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mt-2">
              {workspace.name || "Enterprise Workspace"}
            </h1>
            <p className="text-xs text-blue-100 mt-1">
              Unified control center for employees, teams, allocated budgets, and RBAC hiring approvals.
            </p>
          </div>

          <div className="bg-white/10 border border-white/20 p-4 rounded-2xl backdrop-blur-xl shrink-0 text-center">
            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">Remaining Budget</p>
            <p className="text-2xl font-black text-emerald-400 mt-0.5">
              ₹{(workspace.budgets?.remaining || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto pb-2">
        {[
          { key: "overview", label: "Overview & Employees" },
          { key: "approvals", label: "Approval Workflows" },
          { key: "teams", label: "Internal Teams" },
          { key: "budgets", label: "Budget Allocation" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === tab.key
                ? "bg-slate-900 text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 md:p-8 shadow-xs">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <SmartRehiringWidget suggestions={rehiringData?.smartRehiringSuggestions} />
            <h3 className="text-lg font-bold text-slate-900">Company Employees & Managers</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {(workspace.employees || []).map((emp) => (
                <div key={emp.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="text-sm font-bold text-slate-900">{emp.name}</p>
                  <p className="text-xs text-blue-600 font-semibold">{emp.role}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{emp.email}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "approvals" && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Hiring Approval Workflows</h3>
                <p className="text-xs text-slate-500">
                  Enforces multi-level approval: Employee Request → Manager Technical Review → Finance Authorization.
                </p>
              </div>
            </div>

            {/* Request Creation Form */}
            <form onSubmit={handleCreateApproval} className="space-y-3 p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Submit New Hiring Approval Request
              </p>

              {feedback.text && (
                <div className={`p-3 rounded-xl text-xs font-bold ${feedback.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
                  {feedback.text}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={freelancerTitle}
                  onChange={(e) => setFreelancerTitle(e.target.value)}
                  placeholder="Target Role (e.g. Senior React Developer)"
                  className="rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold outline-none"
                  required
                />
                <input
                  type="number"
                  value={budgetRequested}
                  onChange={(e) => setBudgetRequested(e.target.value)}
                  placeholder="Budget Requested (₹)"
                  className="rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold outline-none"
                  required
                />
              </div>

              <input
                type="text"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Business justification for hiring..."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold outline-none"
              />

              <button
                type="submit"
                disabled={createApprovalMutation.isPending}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-xs font-bold transition cursor-pointer border-0 shadow-md"
              >
                Submit Request
              </button>
            </form>

            {/* Approval Requests List */}
            <div className="space-y-4">
              {approvalRequests.map((req) => (
                <div key={req.id} className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{req.freelancerTitle}</p>
                      <p className="text-[11px] text-slate-500">Requested by {req.requesterName}</p>
                    </div>
                    <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                      ₹{req.budgetRequested.toLocaleString()}
                    </span>
                  </div>

                  {/* Workflow Steps */}
                  <div className="grid md:grid-cols-3 gap-2 text-xs pt-1">
                    {req.workflowSteps.map((step, idx) => (
                      <div key={idx} className={`p-2.5 rounded-xl border ${step.status === "COMPLETED" ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                        <p className="font-bold text-[11px]">{step.step}</p>
                        <p className="text-[10px] font-semibold">{step.status}</p>
                      </div>
                    ))}
                  </div>

                  {/* Approval Action Buttons */}
                  {req.status === "PENDING_MANAGER" && (
                    <button
                      onClick={() => approveStepMutation.mutate({ requestId: req.id, targetStep: "manager" })}
                      className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-4 py-1.5 cursor-pointer border-0"
                    >
                      Manager Approve → Pass to Finance
                    </button>
                  )}
                  {req.status === "PENDING_FINANCE" && (
                    <button
                      onClick={() => approveStepMutation.mutate({ requestId: req.id, targetStep: "finance" })}
                      className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-4 py-1.5 cursor-pointer border-0"
                    >
                      Finance Authorize & Release Escrow Allocation
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "teams" && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Internal Company Teams</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {(workspace.teams || []).map((t, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="text-sm font-bold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.memberCount} Members • {t.activeProjects} Active Projects</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "budgets" && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Enterprise Budget Allocation</h3>
            <div className="grid md:grid-cols-4 gap-4 text-xs font-bold">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-slate-400">Total Allocated</p>
                <p className="text-lg font-black text-slate-900 mt-1">₹{(workspace.budgets?.totalAllocated || 0).toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-slate-400">Spent to Date</p>
                <p className="text-lg font-black text-blue-600 mt-1">₹{(workspace.budgets?.spentToDate || 0).toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-slate-400">Escrow Committed</p>
                <p className="text-lg font-black text-amber-600 mt-1">₹{(workspace.budgets?.escrowCommitted || 0).toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-slate-400">Remaining Balance</p>
                <p className="text-lg font-black text-emerald-600 mt-1">₹{(workspace.budgets?.remaining || 0).toLocaleString()}</p>
              </div>
            </div>

            <SpendIntelligenceSection spendData={spendData} isLoading={isSpendLoading} />
          </div>
        )}
      </div>
    </div>
  );
}
