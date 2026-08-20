import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../api/admin.api.js";
import { ROLE_ICONS, ADMIN_ROLES } from "../../constants/permissions.js";

function AuditLogsSection() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [targetTypeFilter, setTargetTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedLogMeta, setSelectedLogMeta] = useState(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin_audit_logs", page, actionFilter, targetTypeFilter, search],
    queryFn: async () => {
      const res = await adminApi.listAuditLogs({
        page,
        limit: 30,
        action: actionFilter || undefined,
        targetType: targetTypeFilter || undefined,
        q: search || undefined,
      });
      return res?.data?.data || { logs: [], total: 0, totalPages: 1 };
    },
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const getActionBadgeColor = (action) => {
    if (action?.includes("LOGIN")) return "border-blue-200 bg-blue-50 text-blue-700";
    if (action?.includes("INVITED") || action?.includes("CREATED")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (action?.includes("SUSPENDED") || action?.includes("BLOCKED") || action?.includes("REVOKED")) return "border-rose-200 bg-rose-50 text-rose-700";
    if (action?.includes("CHANGED") || action?.includes("MODERATED") || action?.includes("UPDATED")) return "border-purple-200 bg-purple-50 text-purple-700";
    return "border-slate-200 bg-slate-100 text-slate-700";
  };

  return (
    <div className="space-y-5">
      {/* Search & Filters */}
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
              placeholder="Search audit trail by keyword, ID or IP..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 outline-none"
          >
            <option value="">All Actions</option>
            <option value="ADMIN_LOGIN">Admin Login</option>
            <option value="STAFF_INVITED">Staff Invited</option>
            <option value="STAFF_CREATED">Staff Created</option>
            <option value="STAFF_PERMISSIONS_CHANGED">Permissions Changed</option>
            <option value="STAFF_SUSPENDED">Staff Suspended</option>
            <option value="STAFF_REVOKED">Staff Revoked</option>
            <option value="USER_UPDATED">User Updated</option>
            <option value="USER_SUSPENDED">User Suspended</option>
            <option value="USER_BLOCKED">User Blocked</option>
            <option value="USER_UNBLOCKED">User Unblocked</option>
            <option value="PROJECT_MODERATED">Project Moderated</option>
            <option value="PAYMENT_UPDATED">Payment Reviewed</option>
            <option value="DISPUTE_RESOLVED">Dispute Resolved</option>
          </select>

          <select
            value={targetTypeFilter}
            onChange={(e) => {
              setTargetTypeFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 outline-none"
          >
            <option value="">All Entities</option>
            <option value="USER">User</option>
            <option value="PROJECT">Project</option>
            <option value="PAYMENT">Payment</option>
            <option value="DISPUTE">Dispute</option>
            <option value="STAFF_INVITATION">Staff Invite</option>
            <option value="AUTH">Authentication</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">Total: <strong>{total}</strong> event(s)</span>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Immutable Audit Trail</h3>
          <span className="text-[11px] text-slate-400 font-mono">Page {page} of {totalPages || 1}</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading audit history...</div>
        ) : isError ? (
          <div className="p-8 text-center text-xs text-rose-500">Failed to load audit logs.</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 italic">No audit records found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3 text-left">Timestamp</th>
                  <th className="px-4 py-3 text-left">Actor / Staff</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Target</th>
                  <th className="px-4 py-3 text-left">IP & Network</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const actor = log.adminUser;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        <span className="font-semibold text-slate-900">
                          {new Date(log.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-mono">
                          {new Date(log.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {actor ? (
                          <div>
                            <p className="font-bold text-slate-900">{actor.name}</p>
                            <p className="text-[10px] font-mono text-slate-400 truncate max-w-[180px]">{actor.email}</p>
                            <span className="inline-flex items-center gap-1 mt-0.5 rounded bg-slate-100 px-1.5 py-0.2 text-[8px] font-bold text-slate-600 uppercase">
                              <img
                                src={ROLE_ICONS[actor.adminRole || ADMIN_ROLES.SUPER_ADMIN] || ROLE_ICONS[ADMIN_ROLES.SUPER_ADMIN]}
                                alt="Role Icon"
                                className="h-3 w-3 object-contain shrink-0"
                              />
                              {actor.adminRole || "SUPER ADMIN"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">System Event</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${getActionBadgeColor(log.action)}`}>
                          {log.action?.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-800 text-[11px] block">{log.targetType || "-"}</span>
                        {log.targetId && (
                          <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[140px]">
                            {log.targetId}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-500 font-mono text-[10px]">
                        <p className="font-semibold text-slate-700">{log.ipAddress || "Internal / Localhost"}</p>
                        {log.userAgent && (
                          <p className="text-[9px] text-slate-400 truncate max-w-[160px]" title={log.userAgent}>
                            {log.userAgent}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {log.metadata && Object.keys(log.metadata).length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setSelectedLogMeta({ log, metadata: log.metadata })}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          >
                            Inspect JSON
                          </button>
                        ) : (
                          <span className="text-slate-300 italic text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
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

      {/* JSON Metadata Modal */}
      {selectedLogMeta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Audit Metadata: {selectedLogMeta.log?.action}
                </h3>
                <p className="text-xs text-slate-500 font-mono">Log ID: {selectedLogMeta.log?.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogMeta(null)}
                className="text-slate-400 hover:text-slate-700 bg-transparent border-0 cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <pre className="rounded-xl bg-slate-950 p-4 text-xs font-mono text-emerald-400 overflow-x-auto max-h-80 leading-relaxed">
                {JSON.stringify(selectedLogMeta.metadata, null, 2)}
              </pre>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setSelectedLogMeta(null)}
                className="rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditLogsSection;
