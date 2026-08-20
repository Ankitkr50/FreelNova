import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { enterpriseApi } from "../../../api/enterprise.api.js";

const DEFAULT_POLICIES = [
  { policyCode: "POL-REFUND-01", name: "Client Refund Policy", category: "Refund Policy" },
  { policyCode: "POL-ESCROW-01", name: "Escrow Holding & Release Policy", category: "Escrow Policy" },
  { policyCode: "POL-DISPUTE-01", name: "Dispute Arbitration Policy", category: "Dispute Policy" },
  { policyCode: "POL-PAYMENT-01", name: "Payment & Payout Policy", category: "Payment Policy" },
  { policyCode: "POL-SECURITY-01", name: "Security & Fraud Defense Policy", category: "Security Policy" },
  { policyCode: "POL-CHAT-01", name: "Workspace Chat & Off-Platform Policy", category: "Chat Policy" },
  { policyCode: "POL-PRIVACY-01", name: "Data Privacy & Isolation Policy", category: "Data Privacy Policy" },
];

export default function PolicyComplianceModule() {
  const queryClient = useQueryClient();
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [changeSummary, setChangeSummary] = useState("");

  const { data: policiesRes, isLoading } = useQuery({
    queryKey: ["enterprisePolicies"],
    queryFn: async () => {
      const res = await enterpriseApi.listPolicies();
      return res.data?.data || [];
    },
  });

  const savePolicyMutation = useMutation({
    mutationFn: (payload) => enterpriseApi.savePolicy(payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["enterprisePolicies"]);
      setChangeSummary("");
      alert("Policy version saved successfully.");
    },
  });

  const policies = Array.isArray(policiesRes) ? policiesRes : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Module 11 — Platform Rulebook
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Policy & Compliance Center</h2>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Policies Selector */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Internal Platform Rulebooks</h3>
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 animate-pulse">Loading Platform Policies...</div>
          ) : (
            DEFAULT_POLICIES.map((p) => {
              const live = policies.find((item) => item.policyCode === p.policyCode);
              return (
                <div
                  key={p.policyCode}
                  onClick={() => {
                    setSelectedPolicy(live || p);
                    setEditContent(live?.content || `Official ${p.name} documentation...`);
                  }}
                  className={`p-4 rounded-2xl border transition cursor-pointer ${
                    selectedPolicy?.policyCode === p.policyCode
                      ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">{p.policyCode}</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      v{live?.currentVersion || "1.0"}
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white">{p.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{p.category}</p>
                </div>
              );
            })
          )}
        </div>

        {/* Policy Editor Pane */}
        <div className="lg:col-span-2">
          {!selectedPolicy ? (
            <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              Select an internal policy from the left list to view or edit policy text and change history.
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">{selectedPolicy.policyCode}</span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedPolicy.name}</h3>
                </div>
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Version {selectedPolicy.currentVersion || "1.0"}
                </span>
              </div>

              {/* Policy Editor */}
              <div className="space-y-3 text-xs">
                <label className="block font-semibold text-slate-900 dark:text-white">Policy Documentation Content</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={10}
                  className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />

                <div>
                  <label className="block font-semibold text-slate-900 dark:text-white mb-1">Version Release Change Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Updated refund threshold requirements for high-value orders"
                    value={changeSummary}
                    onChange={(e) => setChangeSummary(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    disabled={!editContent.trim() || savePolicyMutation.isLoading}
                    onClick={() =>
                      savePolicyMutation.mutate({
                        policyCode: selectedPolicy.policyCode,
                        name: selectedPolicy.name,
                        category: selectedPolicy.category,
                        content: editContent,
                        changeSummary,
                      })
                    }
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50"
                  >
                    Publish Policy Version
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
