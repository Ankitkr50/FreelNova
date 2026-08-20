import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { enterpriseApi } from "../../../api/enterprise.api.js";

export default function SensitiveActionCenterModule() {
  const [actionCode, setActionCode] = useState("ACCOUNT_SUSPENSION");
  const [targetType, setTargetType] = useState("USER");
  const [targetId, setTargetId] = useState("");
  const [reason, setReason] = useState("");
  const [beforeState, setBeforeState] = useState("");
  const [afterState, setAfterState] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const requestActionMutation = useMutation({
    mutationFn: (payload) => enterpriseApi.requestSensitiveAction(payload),
    onSuccess: (res) => {
      setStatusMsg(`Sensitive action request #${res.data?.data?.id} registered for Super Admin authorization.`);
      setTargetId("");
      setReason("");
      setBeforeState("");
      setAfterState("");
    },
    onError: (err) => {
      setStatusMsg(`Failed to submit request: ${err.response?.data?.message || err.message}`);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            Module 6 — Sensitive Operations Governance
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Security Approval & Sensitive Action Center</h2>
        </div>
      </div>

      {/* Dual Authorization Form */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm max-w-2xl">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Request Dual-Authorized Sensitive Operation</h3>

        {statusMsg && (
          <div className="p-3 rounded-xl bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-xs font-medium">
            {statusMsg}
          </div>
        )}

        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold mb-1">Sensitive Action Type</label>
            <select
              value={actionCode}
              onChange={(e) => setActionCode(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="ACCOUNT_SUSPENSION">Account Permanent Suspension</option>
              <option value="ADMIN_PRIVILEGE_CHANGE">Admin Privilege Escalation</option>
              <option value="LARGE_ESCROW_RELEASE">Large Escrow Release Override</option>
              <option value="LARGE_REFUND">Large Refund Disbursement</option>
              <option value="SENSITIVE_ACCOUNT_RECOVERY">Sensitive Account Recovery</option>
              <option value="PAYMENT_CORRECTION">Manual Ledger Payment Correction</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Target Entity Type</label>
              <input
                type="text"
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                placeholder="e.g. USER / PAYMENT"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Target Identifier (ID / UUID)</label>
              <input
                type="text"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="ID String"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Before State (JSON / State Description)</label>
            <textarea
              placeholder='e.g. {"status": "active", "permissions": ["users_view"]}'
              value={beforeState}
              onChange={(e) => setBeforeState(e.target.value)}
              rows={2}
              className="w-full p-2.5 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">After State (Proposed Target State)</label>
            <textarea
              placeholder='e.g. {"status": "suspended", "reason": "fraud"}'
              value={afterState}
              onChange={(e) => setAfterState(e.target.value)}
              rows={2}
              className="w-full p-2.5 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Audit Justification & Risk Assessment</label>
            <textarea
              placeholder="State clear operational reason for performing sensitive action..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <button
            disabled={!targetId || !reason || requestActionMutation.isLoading}
            onClick={() =>
              requestActionMutation.mutate({
                actionCode,
                targetType,
                targetId,
                beforeState: beforeState ? JSON.parse(beforeState || "{}") : {},
                afterState: afterState ? JSON.parse(afterState || "{}") : {},
                reason,
              })
            }
            className="w-full py-2.5 font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition disabled:opacity-50"
          >
            Submit for Authorized Approval
          </button>
        </div>
      </div>
    </div>
  );
}
