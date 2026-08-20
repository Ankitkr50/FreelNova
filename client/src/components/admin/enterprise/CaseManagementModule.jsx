import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { enterpriseApi } from "../../../api/enterprise.api.js";

export default function CaseManagementModule() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [originFilter, setOriginFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Case Form
  const [originType, setOriginType] = useState("SUPPORT_TICKET");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [ticketId, setTicketId] = useState("");
  const [disputeId, setDisputeId] = useState("");

  const { data: caseRes, isLoading } = useQuery({
    queryKey: ["enterpriseCases", statusFilter, originFilter, search],
    queryFn: async () => {
      const res = await enterpriseApi.listCases({
        status: statusFilter,
        originType: originFilter,
        search,
      });
      return res.data?.data;
    },
  });

  const createCaseMutation = useMutation({
    mutationFn: (payload) => enterpriseApi.createCase(payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["enterpriseCases"]);
      setShowCreateModal(false);
      setTitle("");
      setDescription("");
      setTicketId("");
      setDisputeId("");
    },
  });

  const cases = caseRes?.cases || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Module 3 — Unified Operational Cases
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Case Management System</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Search CASE-FN-..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          />
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition"
          >
            + Create Unified Case
          </button>
        </div>
      </div>

      {/* Cases Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 animate-pulse">Loading Unified Cases...</div>
        ) : cases.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No cases found matching filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase">
                  <th className="py-3 px-4">Case Number</th>
                  <th className="py-3 px-4">Origin</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Opened Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{c.caseNumber}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">{c.originType}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{c.title}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {c.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Case Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Open Unified Operational Case</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Case Origin</label>
                <select
                  value={originType}
                  onChange={(e) => setOriginType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="SUPPORT_TICKET">Support Ticket</option>
                  <option value="DISPUTE">Dispute Arbitration</option>
                  <option value="SECURITY_INCIDENT">Security Alert</option>
                  <option value="FRAUD_ALERT">Fraud Intelligence</option>
                  <option value="PAYMENT_ISSUE">Payment Issue</option>
                  <option value="ACCOUNT_ISSUE">Account Issue</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Case Title</label>
                <input
                  type="text"
                  placeholder="Summary of operational case..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Case Investigation Description</label>
                <textarea
                  placeholder="Outline investigation scope and findings..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                disabled={!title || !description || createCaseMutation.isLoading}
                onClick={() =>
                  createCaseMutation.mutate({
                    originType,
                    title,
                    description,
                    priority,
                  })
                }
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
              >
                Create Case Container
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
