import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { enterpriseApi } from "../../../api/enterprise.api.js";

export default function FinanceApprovalModule() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showRequestModal, setShowRequestModal] = useState(false);

  // New Request Form
  const [requestType, setRequestType] = useState("REFUND");
  const [amount, setAmount] = useState("");
  const [targetType, setTargetType] = useState("PAYMENT");
  const [targetId, setTargetId] = useState("");
  const [reason, setReason] = useState("");

  const { data: resData, isLoading } = useQuery({
    queryKey: ["financeApprovalsList", statusFilter, typeFilter],
    queryFn: async () => {
      const res = await enterpriseApi.listFinanceApprovals({
        status: statusFilter,
        requestType: typeFilter,
      });
      return res.data?.data;
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: (payload) => enterpriseApi.createFinanceApprovalRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["financeApprovalsList"]);
      setShowRequestModal(false);
      setAmount("");
      setTargetId("");
      setReason("");
    },
  });

  const processApprovalMutation = useMutation({
    mutationFn: ({ id, action, rejectionReason }) =>
      enterpriseApi.processFinanceApproval(id, action, { rejectionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries(["financeApprovalsList"]);
    },
  });

  const approvals = resData?.approvals || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Module 4 — Controlled Financial Workflows
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Finance Approval Workflow</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <button
            onClick={() => setShowRequestModal(true)}
            className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition"
          >
            + Request Financial Action
          </button>
        </div>
      </div>

      {/* Approvals Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 animate-pulse">Loading Financial Approvals...</div>
        ) : approvals.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No finance approval requests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase">
                  <th className="py-3 px-4">Request ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Threshold</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {approvals.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">{app.requestId}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{app.requestType}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">₹{app.amount?.toLocaleString("en-IN")}</td>
                    <td className="py-3 px-4">
                      {app.requiresSuperAdmin ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                          🛡️ Super Admin Required
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          Standard Staff
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          app.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : app.status === "REJECTED"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">{app.reason}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {app.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => processApprovalMutation.mutate({ id: app.id, action: "APPROVE" })}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              const rejectionReason = prompt("Enter rejection reason:");
                              if (rejectionReason) {
                                processApprovalMutation.mutate({ id: app.id, action: "REJECT", rejectionReason });
                              }
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Financial Action Request</h3>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Request Type</label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="REFUND">Refund Client</option>
                  <option value="ESCROW_RELEASE">Escrow Release Override</option>
                  <option value="LARGE_WITHDRAWAL">Large Withdrawal Approval</option>
                  <option value="PAYMENT_ADJUSTMENT">Payment Adjustment</option>
                  <option value="FINANCIAL_CORRECTION">Financial Correction</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Amount (INR)</label>
                <input
                  type="number"
                  placeholder="e.g. 25000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Target Identifier (Payment ID / User ID)</label>
                <input
                  type="text"
                  placeholder="ID string"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Justification Reason</label>
                <textarea
                  placeholder="Provide audit reason for financial approval request..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowRequestModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                disabled={!amount || !targetId || !reason || createRequestMutation.isLoading}
                onClick={() =>
                  createRequestMutation.mutate({
                    requestType,
                    amount,
                    targetType,
                    targetId,
                    reason,
                  })
                }
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
