import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { enterpriseApi } from "../../../api/enterprise.api.js";

export default function InternalNotesModule() {
  const queryClient = useQueryClient();
  const [entityType, setEntityType] = useState("USER");
  const [entityId, setEntityId] = useState("");
  const [noteText, setNoteText] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [isConfidential, setIsConfidential] = useState(false);

  const { data: notesRes, isLoading } = useQuery({
    queryKey: ["internalNotes", entityType, entityId],
    queryFn: async () => {
      if (!entityId) return [];
      const res = await enterpriseApi.listInternalNotes(entityType, entityId);
      return res.data?.data || [];
    },
    enabled: Boolean(entityId),
  });

  const createNoteMutation = useMutation({
    mutationFn: (payload) => enterpriseApi.createInternalNote(payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["internalNotes", entityType, entityId]);
      setNoteText("");
    },
  });

  const notes = Array.isArray(notesRes) ? notesRes : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Module 9 — Confidential Staff Records
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Internal Staff Notes</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="USER">Target Entity: User</option>
            <option value="PROJECT">Target Entity: Project</option>
            <option value="TICKET">Target Entity: Ticket</option>
            <option value="DISPUTE">Target Entity: Dispute</option>
            <option value="CASE">Target Entity: Case</option>
            <option value="SECURITY_INCIDENT">Target Entity: Security Alert</option>
          </select>
          <input
            type="text"
            placeholder="Enter Entity ID / UUID..."
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Main Workspace */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
        {!entityId ? (
          <div className="p-8 text-center text-slate-400">
            Enter an Entity ID above (e.g. User ID, Project ID, Dispute ID) to view or add private staff notes.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Create Note Form */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Add Private Note for {entityType} #{entityId}</h4>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write confidential internal staff note (never visible to users)..."
                rows={3}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs">
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="NORMAL">Normal Priority</option>
                    <option value="HIGH">High Priority</option>
                    <option value="CRITICAL">Critical Alert</option>
                  </select>
                  <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isConfidential}
                      onChange={(e) => setIsConfidential(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    Strictly Confidential (Super Admin / Manager Only)
                  </label>
                </div>
                <button
                  disabled={!noteText.trim() || createNoteMutation.isLoading}
                  onClick={() =>
                    createNoteMutation.mutate({
                      entityType,
                      entityId,
                      noteText,
                      priority,
                      isConfidential,
                    })
                  }
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-50"
                >
                  Save Internal Note
                </button>
              </div>
            </div>

            {/* Existing Notes List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Existing Notes ({notes.length})
              </h4>
              {isLoading ? (
                <div className="p-4 text-center text-slate-500 animate-pulse text-xs">Loading Notes...</div>
              ) : notes.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs">No internal notes created yet.</div>
              ) : (
                notes.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                      n.isConfidential
                        ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/30"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {n.author?.name || "Staff Member"} {n.isConfidential && "🔒 (Confidential)"}
                      </span>
                      <span className="text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">{n.noteText}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
