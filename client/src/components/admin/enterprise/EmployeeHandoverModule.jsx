import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../../api/admin.api.js";
import { enterpriseApi } from "../../../api/enterprise.api.js";

export default function EmployeeHandoverModule() {
  const queryClient = useQueryClient();
  const [showHandoverModal, setShowHandoverModal] = useState(false);

  const [fromEmployeeId, setFromEmployeeId] = useState("");
  const [toEmployeeId, setToEmployeeId] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const { data: staffList } = useQuery({
    queryKey: ["adminStaffList"],
    queryFn: async () => {
      const res = await adminApi.listStaff();
      return res.data?.data || [];
    },
  });

  const { data: handoversRes, isLoading } = useQuery({
    queryKey: ["employeeHandoversList"],
    queryFn: async () => {
      const res = await enterpriseApi.listHandovers();
      return res.data?.data || [];
    },
  });

  const executeHandoverMutation = useMutation({
    mutationFn: (payload) => enterpriseApi.executeHandover(payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["employeeHandoversList"]);
      setShowHandoverModal(false);
      setFromEmployeeId("");
      setToEmployeeId("");
      setReason("");
      setNotes("");
    },
  });

  const staffMembers = Array.isArray(staffList) ? staffList : [];
  const handovers = Array.isArray(handoversRes) ? handoversRes : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
            Module 8 — Operational Workload Transfer
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Employee Handover System</h2>
        </div>
        <button
          onClick={() => setShowHandoverModal(true)}
          className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition"
        >
          + Execute Staff Workload Handover
        </button>
      </div>

      {/* Handover History List */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Immutable Staff Handover Log</h3>

        {isLoading ? (
          <div className="p-8 text-center text-slate-500 animate-pulse">Loading Handover History...</div>
        ) : handovers.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No workload handovers recorded yet.</div>
        ) : (
          <div className="space-y-3">
            {handovers.map((h) => (
              <div key={h.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{h.handoverId}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-semibold">
                      {h.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">{new Date(h.createdAt).toLocaleString()}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2 border-y border-slate-200/50 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Previous Owner:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{h.fromEmployee?.name || "Staff A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">New Owner:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{h.toEmployee?.name || "Staff B"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Transferred By:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{h.transferredBy?.name || "Admin"}</span>
                  </div>
                </div>

                <div className="text-slate-600 dark:text-slate-300">
                  <span className="font-semibold">Reason: </span>{h.reason}
                </div>

                {h.itemsSummary && (
                  <div className="flex gap-3 text-[11px] text-teal-700 dark:text-teal-300 font-medium">
                    <span>🎫 Tickets: {h.itemsSummary.ticketsTransferred || 0}</span>
                    <span>⚖️ Disputes: {h.itemsSummary.disputesTransferred || 0}</span>
                    <span>📦 Cases: {h.itemsSummary.casesTransferred || 0}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Handover Modal */}
      {showHandoverModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Execute Workload Handover</h3>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Source Staff Member (From)</label>
                <select
                  value={fromEmployeeId}
                  onChange={(e) => setFromEmployeeId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="">Select staff member...</option>
                  {staffMembers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Target Staff Member (To)</label>
                <select
                  value={toEmployeeId}
                  onChange={(e) => setToEmployeeId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="">Select target staff...</option>
                  {staffMembers
                    .filter((s) => s.id !== fromEmployeeId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Handover Reason</label>
                <textarea
                  placeholder="e.g. Department reassignment / Leave of absence..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Internal Notes / Context for New Owner</label>
                <textarea
                  placeholder="Pass important context on ongoing tickets/disputes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowHandoverModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                disabled={!fromEmployeeId || !toEmployeeId || !reason || executeHandoverMutation.isLoading}
                onClick={() =>
                  executeHandoverMutation.mutate({
                    fromEmployeeId,
                    toEmployeeId,
                    reason,
                    notes,
                  })
                }
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50"
              >
                Execute Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
