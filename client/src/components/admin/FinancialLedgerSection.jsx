import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/admin.api.js";

function FinancialLedgerSection() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Adjustment Modal State
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [targetLedgerId, setTargetLedgerId] = useState("");
  const [adjType, setAdjType] = useState("ADJUSTMENT");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [adjFeedback, setAdjFeedback] = useState({ type: "", text: "" });

  // Queries
  const { data: ledgerData, isLoading: ledgerLoading, refetch: refetchLedger } = useQuery({
    queryKey: ["admin_financial_ledger", page, search, typeFilter],
    queryFn: async () => {
      const res = await adminApi.getLedgerEntries({
        page,
        limit: 25,
        search: search || undefined,
        transactionType: typeFilter !== "all" ? typeFilter : undefined,
      });
      return res?.data?.data || { entries: [], total: 0, totalPages: 1 };
    },
  });

  const { data: reconData, isLoading: reconLoading, refetch: refetchRecon, isFetching: reconFetching } = useQuery({
    queryKey: ["admin_reconciliation_report"],
    queryFn: async () => {
      const res = await adminApi.getReconciliationReport();
      return res?.data?.data || {};
    },
  });

  const entries = ledgerData?.entries || [];
  const total = ledgerData?.total || 0;
  const totalPages = ledgerData?.totalPages || 1;
  const recon = reconData || {};

  // Adjustment Mutation
  const adjustMutation = useMutation({
    mutationFn: (payload) => adminApi.createAdjustment(payload),
    onSuccess: () => {
      setAdjFeedback({ type: "success", text: "Adjustment record successfully appended to ledger!" });
      queryClient.invalidateQueries({ queryKey: ["admin_financial_ledger"] });
      queryClient.invalidateQueries({ queryKey: ["admin_reconciliation_report"] });
      setTimeout(() => {
        setIsAdjModalOpen(false);
        setTargetLedgerId("");
        setAdjAmount("");
        setAdjReason("");
        setAdjFeedback({ type: "", text: "" });
      }, 1200);
    },
    onError: (err) => {
      setAdjFeedback({ type: "error", text: err?.response?.data?.message || "Failed to create adjustment." });
    },
  });

  const getTypeBadgeColor = (type) => {
    switch (type) {
      case "PAYMENT":
      case "ESCROW_HOLD":
        return "border-blue-200 bg-blue-50 text-blue-700";
      case "ESCROW_RELEASE":
      case "WITHDRAWAL":
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
      case "PLATFORM_FEE":
        return "border-indigo-200 bg-indigo-50 text-indigo-700";
      case "REFUND":
      case "REVERSAL":
        return "border-rose-200 bg-rose-50 text-rose-700";
      case "ADJUSTMENT":
        return "border-amber-200 bg-amber-50 text-amber-700";
      default:
        return "border-slate-200 bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Reconciliation Health Card */}
      <div className={`rounded-3xl border p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 ${
        recon.isMatch ? "border-emerald-200 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white" : "border-rose-300 bg-gradient-to-r from-rose-950 via-slate-900 to-slate-900 text-white"
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${recon.isMatch ? "bg-emerald-400 animate-pulse" : "bg-rose-500 animate-ping"}`}></span>
            <span className={`text-xs font-extrabold uppercase tracking-widest ${recon.isMatch ? "text-emerald-400" : "text-rose-400"}`}>
              {recon.isMatch ? "In Perfect Reconciliation Balance" : "Reconciliation Mismatch Alert"}
            </span>
          </div>
          <h2 className="text-xl font-black">Automated Gateway vs Internal Ledger Audit</h2>
          <p className="text-xs text-slate-300">
            Real-time verification comparing Razorpay captured transaction volume against internal database ledger entries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3 text-center">
            <span className="text-[10px] text-slate-300 uppercase font-bold tracking-wider block">Gateway Total</span>
            <p className="text-lg font-black text-white mt-0.5">₹{(recon.externalGatewayTotal || 0).toLocaleString()}</p>
          </div>

          <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3 text-center">
            <span className="text-[10px] text-slate-300 uppercase font-bold tracking-wider block">Ledger Total</span>
            <p className="text-lg font-black text-white mt-0.5">₹{(recon.internalLedgerTotal || 0).toLocaleString()}</p>
          </div>

          <div className={`rounded-2xl px-4 py-3 text-center border ${recon.isMatch ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300" : "bg-rose-500/20 border-rose-400/40 text-rose-300"}`}>
            <span className="text-[10px] uppercase font-bold tracking-wider block">Discrepancy</span>
            <p className="text-lg font-black mt-0.5">₹{Math.abs(recon.discrepancy || 0).toLocaleString()}</p>
          </div>

          <button
            type="button"
            onClick={() => refetchRecon()}
            className="rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-3 transition cursor-pointer"
          >
            {reconFetching ? "Pinging..." : "Run Recon"}
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search ledger by Ledger ID, Order ID, Payment ID or notes..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 outline-none"
          >
            <option value="all">All Transaction Types</option>
            <option value="PAYMENT">PAYMENT</option>
            <option value="ESCROW_HOLD">ESCROW HOLD</option>
            <option value="ESCROW_RELEASE">ESCROW RELEASE</option>
            <option value="PLATFORM_FEE">PLATFORM FEE</option>
            <option value="REFUND">REFUND</option>
            <option value="WITHDRAWAL">WITHDRAWAL</option>
            <option value="ADJUSTMENT">ADJUSTMENT</option>
            <option value="REVERSAL">REVERSAL</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => {
            setAdjFeedback({ type: "", text: "" });
            setIsAdjModalOpen(true);
          }}
          className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-extrabold text-white shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 transition cursor-pointer"
        >
          Create Financial Adjustment
        </button>
      </div>

      {/* Ledger Table */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Immutable Financial Ledger ({total})</h3>
          <span className="text-[11px] text-slate-400 font-mono">Page {page} of {totalPages || 1}</span>
        </div>

        {ledgerLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading ledger records...</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 italic">No ledger entries found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3 text-left">Ledger ID & Timestamp</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Gross Amount</th>
                  <th className="px-4 py-3 text-left">Fee</th>
                  <th className="px-4 py-3 text-left">Net Processed</th>
                  <th className="px-4 py-3 text-left">Gateway Reference</th>
                  <th className="px-4 py-3 text-left">User / Account</th>
                  <th className="px-4 py-3 text-right">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3.5">
                      <span className="font-mono font-bold text-slate-900 block">{entry.ledgerId}</span>
                      <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                        {new Date(entry.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${getTypeBadgeColor(entry.transactionType)}`}>
                        {entry.transactionType.replace(/_/g, " ")}
                      </span>
                    </td>

                    <td className={`px-4 py-3.5 font-bold ${entry.grossAmount < 0 ? "text-rose-600" : "text-slate-900"}`}>
                      ₹{Math.abs(entry.grossAmount).toLocaleString()}
                    </td>

                    <td className="px-4 py-3.5 text-slate-500 font-medium">
                      ₹{(entry.feeAmount || 0).toLocaleString()}
                    </td>

                    <td className={`px-4 py-3.5 font-bold ${entry.netAmount < 0 ? "text-rose-600" : "text-emerald-700"}`}>
                      ₹{Math.abs(entry.netAmount).toLocaleString()}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-[10px] text-slate-500">
                      {entry.gatewayOrderId ? (
                        <span className="truncate max-w-[120px] block" title={entry.gatewayOrderId}>{entry.gatewayOrderId}</span>
                      ) : (
                        <span className="text-slate-300 italic">Internal</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      {entry.user ? (
                        <div>
                          <p className="font-semibold text-slate-900">{entry.user.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">{entry.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Platform</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right text-slate-500 text-[11px] max-w-[180px] truncate" title={entry.note}>
                      {entry.note || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="border-t border-slate-100 px-6 py-3 bg-slate-50 flex items-center justify-between">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
            >
              ← Previous
            </button>
            <span className="text-xs text-slate-500 font-medium">Page {page} of {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ── Adjustment Modal ──────────────────────────────────────────────── */}
      {isAdjModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Create Financial Adjustment / Reversal</h3>
                <p className="text-xs text-slate-500">Appends an offsetting audit entry without overwriting historical records</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 bg-transparent border-0 cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setAdjFeedback({ type: "", text: "" });
                adjustMutation.mutate({
                  referenceLedgerId: targetLedgerId.trim(),
                  transactionType: adjType,
                  amount: adjAmount ? Number(adjAmount) : undefined,
                  reason: adjReason.trim(),
                });
              }}
              className="space-y-4 pt-4"
            >
              {adjFeedback.text && (
                <div className={`rounded-xl p-3 text-xs font-semibold ${adjFeedback.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}>
                  {adjFeedback.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Original Ledger ID (Reference)
                </label>
                <input
                  type="text"
                  value={targetLedgerId}
                  onChange={(e) => setTargetLedgerId(e.target.value)}
                  placeholder="e.g. LEDG-20260810-PAY-ABC123"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-mono text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Entry Type
                  </label>
                  <select
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none"
                  >
                    <option value="ADJUSTMENT">ADJUSTMENT</option>
                    <option value="REVERSAL">FULL REVERSAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Adjustment Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(e.target.value)}
                    placeholder="Leave empty for full original amount"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Audit Reason & Rationale
                </label>
                <textarea
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="Explain why this adjustment is being recorded..."
                  required
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjModalOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustMutation.isPending}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-extrabold text-white transition cursor-pointer disabled:opacity-50"
                >
                  {adjustMutation.isPending ? "Recording..." : "Append Adjustment Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FinancialLedgerSection;
