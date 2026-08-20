import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../../api/admin.api.js";
import { enterpriseApi } from "../../../api/enterprise.api.js";

export default function DisputeResolutionModule() {
  const queryClient = useQueryClient();
  const [selectedDisputeId, setSelectedDisputeId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [resolutionNote, setResolutionNote] = useState("");

  const { data: disputesRes, isLoading } = useQuery({
    queryKey: ["adminDisputesList", statusFilter],
    queryFn: async () => {
      const res = await adminApi.listDisputes({ status: statusFilter });
      return res.data?.data;
    },
  });

  const { data: detailRes, isLoading: isDetailLoading } = useQuery({
    queryKey: ["disputeDetails", selectedDisputeId],
    queryFn: async () => {
      if (!selectedDisputeId) return null;
      const res = await enterpriseApi.getDisputeDetails(selectedDisputeId);
      return res.data?.data;
    },
    enabled: Boolean(selectedDisputeId),
  });

  const updateDisputeMutation = useMutation({
    mutationFn: ({ id, status, note }) =>
      enterpriseApi.updateDisputeState(id, { status, resolutionNote: note }),
    onSuccess: () => {
      queryClient.invalidateQueries(["adminDisputesList"]);
      queryClient.invalidateQueries(["disputeDetails", selectedDisputeId]);
      setResolutionNote("");
    },
  });

  const disputes = Array.isArray(disputesRes) ? disputesRes : disputesRes?.disputes || [];
  const detail = detailRes;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Module 1 — Arbitration & Evidence Center
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Dispute Resolution Center</h2>
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">All Dispute Statuses</option>
            <option value="open">Open</option>
            <option value="in_review">Under Review</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Disputes List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 animate-pulse">Loading Disputes...</div>
          ) : disputes.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              No disputes found.
            </div>
          ) : (
            disputes.map((d) => (
              <div
                key={d.id}
                onClick={() => setSelectedDisputeId(d.id)}
                className={`p-4 rounded-2xl border transition cursor-pointer ${
                  selectedDisputeId === d.id
                    ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/30"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-slate-900 dark:text-white">{d.project?.title || "Project Dispute"}</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {d.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1">{d.reason}</p>
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Priority: {d.priority}</span>
                  <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Evidence & Arbitration Workspace Pane */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedDisputeId ? (
            <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              Select a dispute from the list to view evidence, milestones, chat logs, and submit outcome recommendations.
            </div>
          ) : isDetailLoading || !detail ? (
            <div className="p-12 text-center text-slate-500 animate-pulse bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              Fetching Authorized Dispute Evidence...
            </div>
          ) : (
            <div className="space-y-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Project Arbitration Case</div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{detail.project?.title}</h3>
                </div>
                <div className="flex gap-2">
                  {["open", "in_review", "resolved", "closed"].map((st) => (
                    <button
                      key={st}
                      onClick={() => updateDisputeMutation.mutate({ id: detail.id, status: st, note: resolutionNote })}
                      className={`px-3 py-1 text-xs font-semibold rounded-xl transition ${
                        detail.status === st
                          ? "bg-amber-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dispute Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div className="text-slate-400 font-medium">Raised By</div>
                  <div className="font-semibold text-slate-900 dark:text-white mt-0.5">{detail.raiser?.name} ({detail.raiser?.role})</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div className="text-slate-400 font-medium">Against User</div>
                  <div className="font-semibold text-slate-900 dark:text-white mt-0.5">{detail.againstUser?.name || "N/A"}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div className="text-slate-400 font-medium">Project Budget</div>
                  <div className="font-semibold text-slate-900 dark:text-white mt-0.5">₹{detail.project?.budgetMin} - ₹{detail.project?.budgetMax}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div className="text-slate-400 font-medium">Escrow Status</div>
                  <div className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {detail.payment?.escrowStatus || "held_in_escrow"}
                  </div>
                </div>
              </div>

              {/* Dispute Reason */}
              <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 text-xs">
                <span className="font-bold text-amber-900 dark:text-amber-300">Dispute Claim: </span>
                <span className="text-slate-700 dark:text-slate-300">{detail.reason}</span>
              </div>

              {/* Timeline Audit History */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Audit Timeline & Evidence History</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {detail.timeline?.map((ev) => (
                    <div key={ev.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">{ev.event}</span>
                        <p className="text-slate-500 text-[11px] mt-0.5">{ev.note}</p>
                      </div>
                      <span className="text-[10px] text-slate-400">{new Date(ev.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendation Form */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-slate-900 dark:text-white">Submit Official Recommendation / Verdict Note</label>
                <textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Record binding arbitration outcome recommendation or notes..."
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  rows={3}
                />
                <button
                  disabled={!resolutionNote.trim() || updateDisputeMutation.isLoading}
                  onClick={() =>
                    updateDisputeMutation.mutate({
                      id: detail.id,
                      status: detail.status,
                      note: resolutionNote,
                    })
                  }
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  Save Recommendation Note
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
