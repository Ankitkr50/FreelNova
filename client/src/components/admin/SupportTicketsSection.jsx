import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/admin.api.js";

function SupportTicketsSection() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Selected Ticket Drawer State
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);

  // Queries
  const { data: ticketsData, isLoading: ticketsLoading, refetch: refetchTickets } = useQuery({
    queryKey: ["admin_tickets", page, categoryFilter, priorityFilter, statusFilter, search],
    queryFn: async () => {
      const res = await adminApi.listTickets({
        page,
        limit: 25,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        priority: priorityFilter !== "all" ? priorityFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: search || undefined,
      });
      return res?.data?.data || { tickets: [], total: 0, totalPages: 1 };
    },
  });

  const { data: ticketDetailsData, isLoading: detailsLoading } = useQuery({
    queryKey: ["admin_ticket_details", selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) return null;
      const res = await adminApi.getTicketDetails(selectedTicketId);
      return res?.data?.data?.ticket || null;
    },
    enabled: Boolean(selectedTicketId),
  });

  const tickets = ticketsData?.tickets || [];
  const total = ticketsData?.total || 0;
  const totalPages = ticketsData?.totalPages || 1;
  const activeTicket = ticketDetailsData;

  // Mutations
  const addMessageMutation = useMutation({
    mutationFn: ({ ticketId, message, isInternalNote }) =>
      adminApi.addTicketMessage(ticketId, { message, isInternalNote }),
    onSuccess: () => {
      setReplyText("");
      setIsInternalNote(false);
      queryClient.invalidateQueries({ queryKey: ["admin_ticket_details", selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ["admin_tickets"] });
    },
    onError: (err) => {
      alert(err?.response?.data?.message || "Failed to post message.");
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: ({ ticketId, status, priority, assignedToId }) =>
      adminApi.updateTicket(ticketId, { status, priority, assignedToId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_ticket_details", selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ["admin_tickets"] });
    },
    onError: (err) => {
      alert(err?.response?.data?.message || "Failed to update ticket.");
    },
  });

  const getPriorityBadge = (pri) => {
    switch (pri) {
      case "URGENT":
      case "HIGH":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "MEDIUM":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case "OPEN":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "IN_PROGRESS":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "WAITING_FOR_USER":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "RESOLVED":
      case "CLOSED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Control & Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="min-w-[200px] flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search tickets by #ID, subject, user or email..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING_FOR_USER">Waiting for User</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 outline-none"
          >
            <option value="all">All Categories</option>
            <option value="PAYMENT">Payment</option>
            <option value="ACCOUNT">Account</option>
            <option value="PROJECT">Project</option>
            <option value="WITHDRAWAL">Withdrawal</option>
            <option value="REFUND">Refund</option>
            <option value="DISPUTE">Dispute</option>
            <option value="TECHNICAL">Technical</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => refetchTickets()}
          className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition cursor-pointer"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Tickets Table */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Support Tickets Queue ({total})</h3>
          <span className="text-[11px] text-slate-400 font-mono">Page {page} of {totalPages || 1}</span>
        </div>

        {ticketsLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading support queue...</div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 italic">No support tickets found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3 text-left">Ticket ID & Subject</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Priority</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Assigned Staff</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((tkt) => (
                  <tr key={tkt.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3.5">
                      <span className="font-mono font-bold text-blue-600 block">{tkt.ticketNumber}</span>
                      <p className="font-semibold text-slate-900 mt-0.5 max-w-[200px] truncate">{tkt.subject}</p>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {new Date(tkt.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-900">{tkt.user?.name || "User"}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">{tkt.user?.email}</p>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase">
                        {tkt.category}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase border ${getPriorityBadge(tkt.priority)}`}>
                        {tkt.priority}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase border ${getStatusBadge(tkt.status)}`}>
                        {tkt.status.replace(/_/g, " ")}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-slate-600 font-medium">
                      {tkt.assignedTo ? (
                        <div>
                          <p className="font-bold text-slate-900">{tkt.assignedTo.name}</p>
                          <span className="text-[9px] text-slate-400 block uppercase">{tkt.assignedTo.adminRole || "Staff"}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedTicketId(tkt.id)}
                        className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-blue-600 font-bold text-xs px-3 py-1.5 transition cursor-pointer"
                      >
                        Inspect & Reply
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Slide-over Ticket Inspection & Messaging Drawer ──────────────── */}
      {selectedTicketId && (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            <div
              onClick={() => setSelectedTicketId(null)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            ></div>

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-2xl transform bg-white shadow-2xl transition-all duration-300 border-l border-slate-100 flex flex-col">
                {/* Header */}
                <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50/80">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                        {activeTicket?.ticketNumber || "TICKET"}
                      </span>
                      <span className={`rounded-full px-2 py-0.2 text-[9px] font-bold uppercase border ${getStatusBadge(activeTicket?.status || "OPEN")}`}>
                        {activeTicket?.status?.replace(/_/g, " ")}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{activeTicket?.subject}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTicketId(null)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 bg-transparent border-0 cursor-pointer text-lg"
                  >
                    ✕
                  </button>
                </div>

                {/* Quick Status Bar */}
                {activeTicket && (
                  <div className="bg-slate-100/70 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-500">Status:</span>
                      <select
                        value={activeTicket.status}
                        onChange={(e) => updateTicketMutation.mutate({ ticketId: activeTicket.id, status: e.target.value })}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 outline-none"
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="WAITING_FOR_USER">WAITING FOR USER</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-500">Priority:</span>
                      <select
                        value={activeTicket.priority}
                        onChange={(e) => updateTicketMutation.mutate({ ticketId: activeTicket.id, priority: e.target.value })}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 outline-none"
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="URGENT">URGENT</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Message Timeline */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {detailsLoading ? (
                    <div className="p-8 text-center text-xs text-slate-400">Loading conversation thread...</div>
                  ) : activeTicket ? (
                    <>
                      {/* Original Ticket Description */}
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 mb-2">
                          <span className="font-bold text-slate-900 text-xs">
                            {activeTicket.user?.name} <span className="font-normal text-slate-400 font-mono">({activeTicket.user?.email})</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(activeTicket.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{activeTicket.description}</p>
                      </div>

                      {/* Messages & Internal Staff Notes */}
                      {activeTicket.messages?.map((msg) => {
                        const isInternal = msg.isInternalNote;

                        return (
                          <div
                            key={msg.id}
                            className={`rounded-2xl p-4 transition ${
                              isInternal
                                ? "bg-amber-50/80 border border-amber-300/80 shadow-xs"
                                : "bg-white border border-slate-200 shadow-xs"
                            }`}
                          >
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-xs">{msg.sender?.name}</span>
                                {isInternal ? (
                                  <span className="rounded bg-amber-200 text-amber-900 text-[9px] font-extrabold px-2 py-0.5 uppercase tracking-wider">
                                    🔒 Internal Staff Note (Hidden from Customer)
                                  </span>
                                ) : (
                                  <span className="rounded bg-blue-100 text-blue-700 text-[9px] font-extrabold px-1.5 py-0.2 uppercase">
                                    {msg.sender?.role === "admin" ? "Support Staff" : "User"}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(msg.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                          </div>
                        );
                      })}
                    </>
                  ) : null}
                </div>

                {/* Reply Form */}
                <div className="border-t border-slate-100 p-4 bg-slate-50/90 space-y-3">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className={isInternalNote ? "text-amber-800 font-extrabold" : ""}>
                        🔒 Post as Internal Staff Note (Customer will NOT see this)
                      </span>
                    </label>
                  </div>

                  <div className="flex items-end gap-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={isInternalNote ? "Write an internal team note regarding this ticket..." : "Type reply to customer..."}
                      rows={2}
                      className={`flex-1 rounded-xl p-3 text-xs outline-none focus:bg-white transition ${
                        isInternalNote
                          ? "border border-amber-300 bg-amber-50/40 text-amber-950 focus:border-amber-500"
                          : "border border-slate-200 bg-white text-slate-900 focus:border-blue-500"
                      }`}
                    />
                    <button
                      type="button"
                      disabled={addMessageMutation.isPending || !replyText.trim()}
                      onClick={() => {
                        if (!replyText.trim() || !activeTicket) return;
                        addMessageMutation.mutate({
                          ticketId: activeTicket.id,
                          message: replyText.trim(),
                          isInternalNote,
                        });
                      }}
                      className={`rounded-xl px-5 py-3 text-xs font-extrabold text-white transition cursor-pointer disabled:opacity-50 shrink-0 ${
                        isInternalNote ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {addMessageMutation.isPending ? "Sending..." : isInternalNote ? "Save Note" : "Send Reply"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SupportTicketsSection;
