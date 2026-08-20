import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { enterpriseApi } from "../../../api/enterprise.api.js";

export default function SupportTicketSLAModule() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);

  const { data: ticketRes, isLoading } = useQuery({
    queryKey: ["supportTicketsSla", statusFilter, priorityFilter, search],
    queryFn: async () => {
      const res = await enterpriseApi.listTickets({
        status: statusFilter,
        priority: priorityFilter,
        search,
      });
      return res.data?.data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => enterpriseApi.updateTicketStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries(["supportTicketsSla"]);
      if (selectedTicket) {
        setSelectedTicket(null);
      }
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ id, message, isInternalNote }) =>
      enterpriseApi.addTicketMessage(id, { message, isInternalNote }),
    onSuccess: () => {
      queryClient.invalidateQueries(["supportTicketsSla"]);
      setReplyMessage("");
      setIsInternalNote(false);
    },
  });

  const tickets = ticketRes?.tickets || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Module 2 — Customer & Freelancer Support
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Support Ticket & SLA System</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING_FOR_USER">Waiting for User</option>
            <option value="ESCALATED">Escalated</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">All Priorities</option>
            <option value="CRITICAL">Critical (2h SLA)</option>
            <option value="URGENT">Urgent (4h SLA)</option>
            <option value="HIGH">High (8h SLA)</option>
            <option value="MEDIUM">Medium (24h SLA)</option>
            <option value="LOW">Low (48h SLA)</option>
          </select>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className={`space-y-3 ${selectedTicket ? "lg:col-span-1" : "lg:col-span-3"}`}>
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 animate-pulse">Loading Support Tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              No tickets found matching current filters.
            </div>
          ) : (
            tickets.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTicket(t)}
                className={`p-4 rounded-2xl border transition cursor-pointer ${
                  selectedTicket?.id === t.id
                    ? "border-blue-500 bg-blue-50/40 dark:bg-blue-950/30"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{t.ticketNumber}</span>
                  <div className="flex items-center gap-1.5">
                    {t.isSlaBreached && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white animate-pulse">
                        ⚠️ SLA Breached
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        t.priority === "CRITICAL"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                          : t.priority === "HIGH"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {t.priority}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {t.status}
                    </span>
                  </div>
                </div>

                <h4 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1">{t.subject}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">{t.description}</p>

                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>User: {t.user?.name || "Client"}</span>
                  <span>Assigned: {t.assignedTo?.name || "Unassigned"}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected Ticket Drawer / Detail Pane */}
        {selectedTicket && (
          <div className="lg:col-span-2 space-y-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{selectedTicket.ticketNumber}</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{selectedTicket.subject}</h3>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500 font-semibold">Change Status:</span>
              {["OPEN", "IN_PROGRESS", "WAITING_FOR_USER", "ESCALATED", "RESOLVED", "CLOSED"].map((st) => (
                <button
                  key={st}
                  onClick={() => updateStatusMutation.mutate({ id: selectedTicket.id, status: st })}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    selectedTicket.status === st
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Ticket Description */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-700 dark:text-slate-300 space-y-1">
              <div className="font-semibold text-slate-900 dark:text-white">Original Description:</div>
              <p>{selectedTicket.description}</p>
            </div>

            {/* Message Thread */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              <div className="text-xs font-bold text-slate-500">Activity Thread ({selectedTicket.messages?.length || 0})</div>
              {selectedTicket.messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl text-xs space-y-1 ${
                    msg.isInternalNote
                      ? "bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900"
                      : "bg-slate-100 dark:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className={msg.isInternalNote ? "text-amber-800 dark:text-amber-300" : "text-slate-900 dark:text-white"}>
                      {msg.sender?.name} {msg.isInternalNote && "🔒 (Internal Note)"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">{msg.message}</p>
                </div>
              ))}
            </div>

            {/* Add Message / Internal Note Form */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder={isInternalNote ? "Write staff internal note (hidden from user)..." : "Write response to user..."}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternalNote}
                    onChange={(e) => setIsInternalNote(e.target.checked)}
                    className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  Internal Note (Private to Staff)
                </label>
                <button
                  disabled={!replyMessage.trim() || sendMessageMutation.isLoading}
                  onClick={() =>
                    sendMessageMutation.mutate({
                      id: selectedTicket.id,
                      message: replyMessage,
                      isInternalNote,
                    })
                  }
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Send {isInternalNote ? "Internal Note" : "Reply"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
