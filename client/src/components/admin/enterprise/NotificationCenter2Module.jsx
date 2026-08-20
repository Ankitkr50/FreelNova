import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { enterpriseApi } from "../../../api/enterprise.api.js";

export default function NotificationCenter2Module() {
  const [targetType, setTargetType] = useState("ALL_STAFF");
  const [targetValue, setTargetValue] = useState("");
  const [priority, setPriority] = useState("ACTION_REQUIRED");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const sendNotificationMutation = useMutation({
    mutationFn: (payload) => enterpriseApi.sendTargetedNotification(payload),
    onSuccess: (res) => {
      const count = res.data?.data?.count || 0;
      setStatusMsg(`Successfully dispatched notification to ${count} recipient(s).`);
      setTitle("");
      setMessage("");
      setDeepLink("");
    },
    onError: (err) => {
      setStatusMsg(`Failed to send notification: ${err.response?.data?.message || err.message}`);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Module 10 — Enterprise Notification Engine
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Notification Center 2.0</h2>
        </div>
      </div>

      {/* Broadcast Form */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm max-w-2xl">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Dispatch Prioritized Broadcast Notification</h3>

        {statusMsg && (
          <div className="p-3 rounded-xl bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-xs font-medium">
            {statusMsg}
          </div>
        )}

        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Target Audience</label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="ALL_STAFF">All Staff Members</option>
                <option value="ROLE">Specific Admin Role</option>
                <option value="USER">Individual User (User ID)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Notification Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="CRITICAL">🔴 CRITICAL</option>
                <option value="ACTION_REQUIRED">🟠 ACTION REQUIRED</option>
                <option value="INFORMATION">🔵 INFORMATION</option>
                <option value="SUCCESS">🟢 SUCCESS</option>
              </select>
            </div>
          </div>

          {targetType !== "ALL_STAFF" && (
            <div>
              <label className="block font-semibold mb-1">
                {targetType === "ROLE" ? "Select Role (e.g. FINANCE_ADMIN, SUPPORT_STAFF)" : "Enter Target User ID"}
              </label>
              <input
                type="text"
                placeholder={targetType === "ROLE" ? "e.g. FINANCE_ADMIN" : "UUID"}
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          )}

          <div>
            <label className="block font-semibold mb-1">Notification Title</label>
            <input
              type="text"
              placeholder="e.g. High Priority Dispute Escalated"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Message Body</label>
            <textarea
              placeholder="Enter operational notice details..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Deep Link Target URL (Optional)</label>
            <input
              type="text"
              placeholder="e.g. /admin?tab=disputes&id=123"
              value={deepLink}
              onChange={(e) => setDeepLink(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <button
            disabled={!title || !message || sendNotificationMutation.isLoading}
            onClick={() =>
              sendNotificationMutation.mutate({
                targetType,
                targetValue,
                priority,
                title,
                message,
                deepLink,
              })
            }
            className="w-full py-2.5 font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50"
          >
            Dispatch Notification 2.0
          </button>
        </div>
      </div>
    </div>
  );
}
