import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/admin.api.js";
import { useAuth } from "../../hooks/useAuth.js";
import { useRecipientsQuery } from "../../hooks/useNotifications.js";
import {
  ADMIN_ROLES,
  ROLE_LABELS,
  ROLE_COLORS,
  ROLE_ICONS,
  PERMISSION_GROUPS,
  PERMISSIONS,
} from "../../constants/permissions.js";

function StaffManagementSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isSuperAdmin =
    user?.adminRole === ADMIN_ROLES.SUPER_ADMIN ||
    (!user?.adminRole && (user?.email === "fn.freelnova@gmail.com" || user?.role === "admin"));

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState(ADMIN_ROLES.SUPPORT_STAFF);
  const [customRoleTitle, setCustomRoleTitle] = useState("");
  const [invitePermissions, setInvitePermissions] = useState([]);
  const [inviteFeedback, setInviteFeedback] = useState({ type: "", text: "" });
  const [generatedInviteLink, setGeneratedInviteLink] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [showUsernameDropdown, setShowUsernameDropdown] = useState(false);
  const [selectedDbUser, setSelectedDbUser] = useState(null);

  const searchQueryTerm = (inviteUsername || inviteName || inviteEmail).trim();
  const { data: recipientSuggestions = [], isLoading: isSearchingUsers } = useRecipientsQuery({
    q: searchQueryTerm,
    enabled: isInviteModalOpen && searchQueryTerm.length >= 1,
  });

  const handleSelectUserFromDb = (u) => {
    setSelectedDbUser(u);
    setInviteName(u.name || "");
    setInviteUsername(u.username ? `@${u.username}` : u.userCode || "");
    setInviteEmail(u.email || "");
    setShowUsernameDropdown(false);
  };

  // Edit Permissions Modal State
  const [editingStaff, setEditingStaff] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [editPermissions, setEditPermissions] = useState([]);
  const [editFeedback, setEditFeedback] = useState({ type: "", text: "" });

  // Permissions View Modal
  const [viewingPermissionsStaff, setViewingPermissionsStaff] = useState(null);

  // Fetch staff data
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin_staff"],
    queryFn: async () => {
      const res = await adminApi.listStaff();
      return res?.data?.data || {};
    },
  });

  const staffList = data?.staff || [];
  const pendingInvitations = data?.pendingInvitations || [];
  const summary = data?.summary || { totalStaff: 0, activeStaff: 0, suspendedStaff: 0, pendingInvites: 0 };
  const rolePermissionsMap = data?.rolePermissions || {};

  // Handle Role preset selection in Invite Modal
  const handleRolePresetChange = (newRole) => {
    setInviteRole(newRole);
    if (newRole === ADMIN_ROLES.SUPER_ADMIN) {
      setInvitePermissions(Object.values(PERMISSIONS));
    } else if (newRole === ADMIN_ROLES.CUSTOM) {
      setInvitePermissions([]);
    } else {
      const defaults = rolePermissionsMap[newRole] || [];
      setInvitePermissions([...defaults]);
    }
  };

  const handleToggleInvitePermission = (permKey) => {
    setInvitePermissions((prev) =>
      prev.includes(permKey) ? prev.filter((p) => p !== permKey) : [...prev, permKey]
    );
  };

  // Invite Mutation
  const inviteMutation = useMutation({
    mutationFn: async (payload) => adminApi.inviteStaff(payload),
    onSuccess: (res) => {
      const inviteUrl = res?.data?.data?.inviteUrl || "";
      setGeneratedInviteLink(inviteUrl);
      setInviteFeedback({
        type: "success",
        text: `Invitation successfully created for ${inviteEmail || inviteUsername || inviteName}!`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin_staff"] });
    },
    onError: (err) => {
      setInviteFeedback({
        type: "error",
        text: err?.response?.data?.message || "Failed to invite staff member.",
      });
    },
  });

  const handleSendInvite = (e) => {
    e.preventDefault();
    setInviteFeedback({ type: "", text: "" });
    setGeneratedInviteLink("");

    if (!inviteName.trim() && !inviteUsername.trim() && !inviteEmail.trim()) {
      setInviteFeedback({ type: "error", text: "Please provide employee name, username, or email." });
      return;
    }

    const finalRole = inviteRole === ADMIN_ROLES.CUSTOM && customRoleTitle.trim() ? customRoleTitle.trim() : inviteRole;

    inviteMutation.mutate({
      name: inviteName.trim(),
      username: inviteUsername.trim(),
      email: inviteEmail.trim(),
      role: finalRole,
      permissions: invitePermissions,
    });
  };

  const resetInviteForm = () => {
    setInviteName("");
    setInviteUsername("");
    setInviteEmail("");
    setInviteRole(ADMIN_ROLES.SUPPORT_STAFF);
    setCustomRoleTitle("");
    setInvitePermissions(rolePermissionsMap[ADMIN_ROLES.SUPPORT_STAFF] || []);
    setInviteFeedback({ type: "", text: "" });
    setGeneratedInviteLink("");
    setCopiedLink(false);
    setSelectedDbUser(null);
    setShowUsernameDropdown(false);
    setIsInviteModalOpen(false);
  };

  // Edit Permissions Mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ id, role, permissions }) =>
      adminApi.updateStaffRoleAndPermissions(id, { role, permissions }),
    onSuccess: () => {
      setEditFeedback({ type: "success", text: "Staff permissions updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ["admin_staff"] });
      setTimeout(() => setEditingStaff(null), 1200);
    },
    onError: (err) => {
      setEditFeedback({
        type: "error",
        text: err?.response?.data?.message || "Failed to update staff permissions.",
      });
    },
  });

  const handleSavePermissions = (e) => {
    e.preventDefault();
    if (!editingStaff) return;
    updatePermissionsMutation.mutate({
      id: editingStaff.id,
      role: editRole,
      permissions: editPermissions,
    });
  };

  // Status Change Mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }) => adminApi.updateStaffStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_staff"] });
    },
    onError: (err) => {
      alert(err?.response?.data?.message || "Failed to update staff status.");
    },
  });

  const handleStatusToggle = (staff, newStatus) => {
    const actionName = newStatus === "ACTIVE" ? "reactivate" : newStatus.toLowerCase();
    if (window.confirm(`Are you sure you want to ${actionName} staff member "${staff.name}" (${staff.email})?`)) {
      statusMutation.mutate({ id: staff.id, status: newStatus });
    }
  };

  // Demote Staff to Normal User Mutation
  const demoteMutation = useMutation({
    mutationFn: async (id) => adminApi.demoteStaffToUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_staff"] });
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      queryClient.invalidateQueries({ queryKey: ["admin_quick_users"] });
      alert("✅ Staff member demoted back to normal user status successfully.");
    },
    onError: (err) => {
      alert(err?.response?.data?.message || "Failed to demote staff member.");
    },
  });

  const handleDemoteStaff = (staffMember) => {
    if (window.confirm(`Are you sure you want to revoke admin access for "${staffMember.name}" (${staffMember.email})? They will be demoted back to a normal user.`)) {
      demoteMutation.mutate(staffMember.id);
    }
  };

  // Cancel Invite Mutation
  const cancelInviteMutation = useMutation({
    mutationFn: async (id) => adminApi.cancelInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_staff"] });
    },
    onError: (err) => {
      alert(err?.response?.data?.message || "Failed to cancel invitation.");
    },
  });

  // Filtered staff list
  const filteredStaff = staffList.filter((s) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (s.name || "").toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q) ||
      (s.adminRole || "").toLowerCase().includes(q);

    const matchesRole = roleFilter === "all" || s.adminRole === roleFilter;
    const matchesStatus = statusFilter === "all" || s.staffStatus === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Overview Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Staff Team</span>
          <h3 className="mt-2 text-2xl font-black text-slate-900">{summary.totalStaff}</h3>
          <p className="mt-1 text-xs text-slate-500 font-medium">Internal platform employees</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 shadow-xs">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Active Staff</span>
          <h3 className="mt-2 text-2xl font-black text-emerald-800">{summary.activeStaff}</h3>
          <p className="mt-1 text-xs text-emerald-600 font-medium">Authorized & operational</p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-5 shadow-xs">
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Pending Invites</span>
          <h3 className="mt-2 text-2xl font-black text-amber-800">{summary.pendingInvites}</h3>
          <p className="mt-1 text-xs text-amber-600 font-medium">Awaiting onboarding setup</p>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-5 shadow-xs">
          <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Suspended / Revoked</span>
          <h3 className="mt-2 text-2xl font-black text-rose-800">
            {Number(summary.suspendedStaff || 0) + Number(summary.revokedStaff || 0)}
          </h3>
          <p className="mt-1 text-xs text-rose-600 font-medium">Access revoked or locked</p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff by name, email, or role..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 outline-none"
          >
            <option value="all">All Roles</option>
            {Object.values(ADMIN_ROLES).map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="REVOKED">Revoked</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => {
            handleRolePresetChange(ADMIN_ROLES.SUPPORT_STAFF);
            setIsInviteModalOpen(true);
          }}
          className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 transition cursor-pointer flex items-center justify-center gap-2 select-none"
        >
          <img src="https://cdn-icons-png.flaticon.com/128/3683/3683218.png" alt="Invite Staff" className="h-4 w-4 object-contain shrink-0" />
          <span>Invite Staff Member</span>
        </button>
      </div>

      {/* Staff Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Active Staff Directory ({filteredStaff.length})</h3>
          <button
            onClick={() => refetch()}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-transparent border-0 cursor-pointer"
          >
            ↻ Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading staff directory...</div>
        ) : isError ? (
          <div className="p-8 text-center text-xs text-rose-500">Failed to load staff list.</div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 italic">No staff members found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3 text-left">Staff Member</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Permissions</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Last Login</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map((staff) => {
                  const initials = staff.name
                    ? staff.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
                    : "ST";
                  const roleBadgeColor = ROLE_COLORS[staff.adminRole] || "border-slate-200 bg-slate-50 text-slate-700";
                  const isPrimaryAdmin = staff.email === "fn.freelnova@gmail.com";
                  const isSelf = staff.id === user?.id;

                  return (
                    <tr key={staff.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-900">{staff.name}</p>
                              {isSelf && (
                                <span className="rounded bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 py-0.2">
                                  You
                                </span>
                              )}
                              {isPrimaryAdmin && (
                                <span className="rounded bg-rose-100 text-rose-700 text-[9px] font-bold px-1.5 py-0.2">
                                  Owner
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-slate-500 mt-0.5">{staff.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${roleBadgeColor}`}>
                          <img
                            src={ROLE_ICONS[staff.adminRole || ADMIN_ROLES.SUPER_ADMIN] || ROLE_ICONS[ADMIN_ROLES.SUPER_ADMIN]}
                            alt={staff.adminRole || "SUPER ADMIN"}
                            className="h-3.5 w-3.5 object-contain shrink-0"
                          />
                          {staff.customRoleTitle || (staff.adminRole ? staff.adminRole.replace(/_/g, " ") : "SUPER ADMIN")}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        {staff.adminRole === ADMIN_ROLES.SUPER_ADMIN || isPrimaryAdmin ? (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            All Platform Permissions (Full Access)
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setViewingPermissionsStaff(staff)}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50/60 border border-blue-200 px-2.5 py-1 rounded-lg cursor-pointer transition hover:bg-blue-100"
                          >
                            👁️ {staff.adminPermissions?.length || 0} permissions assigned
                          </button>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                            staff.staffStatus === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : staff.staffStatus === "SUSPENDED"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {staff.staffStatus || "ACTIVE"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-slate-500">
                        {staff.lastLoginAt ? (
                          <span>{new Date(staff.lastLoginAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                        ) : (
                          <span className="text-slate-400 italic">Never</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        {!isPrimaryAdmin && !isSelf && (
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingStaff(staff);
                                  setEditRole(staff.adminRole || ADMIN_ROLES.CUSTOM);
                                  setEditPermissions(staff.adminPermissions || []);
                                  setEditFeedback({ type: "", text: "" });
                                }}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                              >
                                Edit Role
                              </button>
                            )}

                            {staff.staffStatus === "ACTIVE" ? (
                              <button
                                type="button"
                                onClick={() => handleStatusToggle(staff, "SUSPENDED")}
                                className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition cursor-pointer"
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStatusToggle(staff, "ACTIVE")}
                                className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                              >
                                Reactivate
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDemoteStaff(staff)}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                              title="Revoke Admin access and restore as normal user"
                            >
                              Demote to User
                            </button>

                            {staff.staffStatus !== "REVOKED" && (
                              <button
                                type="button"
                                onClick={() => handleStatusToggle(staff, "REVOKED")}
                                className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Invitations Table */}
      {pendingInvitations.length > 0 && (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/20 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-amber-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-amber-950">Pending Staff Invitations ({pendingInvitations.length})</h3>
              <p className="text-xs text-amber-700 mt-0.5">Invited candidates who have not yet set their password</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-amber-100/50 text-amber-900 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-2.5 text-left">Candidate</th>
                  <th className="px-4 py-2.5 text-left">Role Assigned</th>
                  <th className="px-4 py-2.5 text-left">Invited By</th>
                  <th className="px-4 py-2.5 text-left">Expires</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100/80">
                {pendingInvitations.map((inv) => {
                  const clientBaseUrl = window.location.origin;
                  const directLink = `${clientBaseUrl}/admin/accept-invite?token=${inv.token}`;

                  return (
                    <tr key={inv.id} className="hover:bg-amber-100/30 transition">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{inv.name}</p>
                        <p className="font-mono text-slate-500 text-[11px]">{inv.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-full bg-white border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-900 uppercase">
                          {inv.role.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{inv.invitedBy?.name || "Admin"}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(inv.expiresAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(directLink)}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                          >
                            📋 Copy Link
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Cancel invitation for ${inv.email}?`)) {
                                cancelInviteMutation.mutate(inv.id);
                              }
                            }}
                            className="rounded-lg border border-rose-300 bg-white px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Invite Staff Modal ────────────────────────────────────────────── */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Invite New Staff Member</h3>
                <p className="text-xs text-slate-500 mt-0.5">Send a single-use setup link with role & permissions</p>
              </div>
              <button
                type="button"
                onClick={resetInviteForm}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 bg-transparent border-0 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {inviteFeedback.text && (
                <div
                  className={`rounded-xl p-3.5 text-xs font-semibold ${
                    inviteFeedback.type === "success"
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border border-rose-200 text-rose-800"
                  }`}
                >
                  {inviteFeedback.text}
                </div>
              )}

              {generatedInviteLink ? (
                <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 space-y-3">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wider block">
                    🎉 Invitation Ready to Share:
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedInviteLink}
                      className="w-full rounded-xl border border-blue-200 bg-white px-3.5 py-2.5 text-xs font-mono text-slate-800 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(generatedInviteLink)}
                      className="shrink-0 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 transition cursor-pointer"
                    >
                      {copiedLink ? "✓ Copied!" : "Copy Link"}
                    </button>
                  </div>
                  <p className="text-[11px] text-blue-700">
                    The employee can open this link to set their password and enter the Admin Portal.
                  </p>
                </div>
              ) : (
                <form id="inviteStaffForm" onSubmit={handleSendInvite} className="space-y-4">
                  {selectedDbUser && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-2.5 flex items-center justify-between text-xs text-emerald-900 shadow-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">✅</span>
                        <div>
                          <span className="font-bold">Auto-Filled from DB:</span> {selectedDbUser.name} ({selectedDbUser.username ? `@${selectedDbUser.username}` : selectedDbUser.userCode}) — <span className="font-mono">{selectedDbUser.email}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedDbUser(null)}
                        className="text-emerald-700 hover:text-emerald-900 font-bold text-xs bg-transparent border-0 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Employee Full Name
                      </label>
                      <input
                        type="text"
                        value={inviteName}
                        onChange={(e) => {
                          setInviteName(e.target.value);
                          setShowUsernameDropdown(true);
                        }}
                        onFocus={() => setShowUsernameDropdown(true)}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>

                    <div className="relative">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Platform Username
                      </label>
                      <input
                        type="text"
                        value={inviteUsername}
                        onChange={(e) => {
                          setInviteUsername(e.target.value);
                          setShowUsernameDropdown(true);
                          setSelectedDbUser(null);
                        }}
                        onFocus={() => setShowUsernameDropdown(true)}
                        placeholder="e.g. @rahul_sharma"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                      />

                      {/* Live DB Search Results Dropdown */}
                      {showUsernameDropdown && searchQueryTerm.length >= 1 && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl space-y-1">
                          {isSearchingUsers ? (
                            <div className="p-3 text-center text-xs text-slate-400 font-medium">Searching database users...</div>
                          ) : recipientSuggestions.length === 0 ? (
                            <div className="p-3 text-center text-xs text-slate-400 italic">No matching registered user found</div>
                          ) : (
                            recipientSuggestions.map((u) => (
                              <div
                                key={u.id}
                                onClick={() => handleSelectUserFromDb(u)}
                                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 cursor-pointer transition border border-transparent hover:border-blue-100"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-bold text-slate-900 truncate">{u.name}</p>
                                    {u.username && (
                                      <span className="text-[10px] font-bold text-blue-600">@{u.username}</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-500 font-mono truncate">{u.email}</p>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                  <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-700 uppercase">
                                    {u.role || "User"}
                                  </span>
                                  <p className="text-[9px] font-mono text-slate-400 mt-0.5">{u.userCode}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Work Email
                      </label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => {
                          setInviteEmail(e.target.value);
                          setShowUsernameDropdown(true);
                        }}
                        onFocus={() => setShowUsernameDropdown(true)}
                        placeholder="e.g. rahul@freelnova.com"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Role Preset
                    </label>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {Object.values(ADMIN_ROLES).map((roleKey) => {
                        const isSelected = inviteRole === roleKey;
                        return (
                          <div
                            key={roleKey}
                            onClick={() => handleRolePresetChange(roleKey)}
                            className={`p-3 rounded-xl border transition cursor-pointer select-none text-left flex flex-col justify-between ${
                              isSelected
                                ? "border-blue-500 bg-blue-50/50 shadow-xs ring-2 ring-blue-100"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <img src={ROLE_ICONS[roleKey]} alt={roleKey} className="h-4 w-4 object-contain shrink-0" />
                              <span className="text-xs font-bold text-slate-900">{roleKey.replace(/_/g, " ")}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 mt-1">{ROLE_LABELS[roleKey]}</span>
                          </div>
                        );
                      })}
                    </div>
                    {inviteRole === ADMIN_ROLES.CUSTOM && (
                      <div className="mt-3">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                          Custom Role Name / Title
                        </label>
                        <input
                          type="text"
                          value={customRoleTitle}
                          onChange={(e) => setCustomRoleTitle(e.target.value)}
                          placeholder="e.g. Senior Security Officer, Lead Moderator, Operations Specialist..."
                          className="w-full rounded-xl border border-blue-200 bg-blue-50/30 px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Granular Permission Checkboxes */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Granular Permissions ({invitePermissions.length} selected)
                      </label>
                      {inviteRole !== ADMIN_ROLES.SUPER_ADMIN && (
                        <div className="flex gap-2 text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => setInvitePermissions(Object.values(PERMISSIONS))}
                            className="text-blue-600 hover:underline bg-transparent border-0 cursor-pointer"
                          >
                            Select All
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => setInvitePermissions([])}
                            className="text-slate-500 hover:underline bg-transparent border-0 cursor-pointer"
                          >
                            Deselect All
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 max-h-56 overflow-y-auto pr-1">
                      {PERMISSION_GROUPS.map((group) => (
                        <div key={group.name} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                          <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">
                            {group.name}
                          </h4>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {group.permissions.map((p) => {
                              const isChecked =
                                inviteRole === ADMIN_ROLES.SUPER_ADMIN || invitePermissions.includes(p.key);
                              return (
                                <label
                                  key={p.key}
                                  className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer select-none"
                                >
                                  <input
                                    type="checkbox"
                                    disabled={inviteRole === ADMIN_ROLES.SUPER_ADMIN}
                                    checked={isChecked}
                                    onChange={() => handleToggleInvitePermission(p.key)}
                                    className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                  <div>
                                    <span className="font-semibold text-slate-900 block text-[11px]">{p.label}</span>
                                    <span className="text-[10px] text-slate-400 block">{p.description}</span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </form>
              )}
            </div>

            <div className="border-t border-slate-100 px-6 py-4 bg-slate-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={resetInviteForm}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                {generatedInviteLink ? "Done" : "Cancel"}
              </button>

              {!generatedInviteLink && (
                <button
                  type="submit"
                  form="inviteStaffForm"
                  disabled={inviteMutation.isPending}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-xs font-extrabold text-white shadow-md hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition cursor-pointer"
                >
                  {inviteMutation.isPending ? "Generating..." : "Generate & Send Invitation"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Staff Permissions Modal ─────────────────────────────────── */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Staff Permissions</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Updating role for <span className="font-bold text-slate-900">{editingStaff.name}</span> ({editingStaff.email})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 bg-transparent border-0 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePermissions} className="flex-1 overflow-y-auto p-6 space-y-4">
              {editFeedback.text && (
                <div
                  className={`rounded-xl p-3.5 text-xs font-semibold ${
                    editFeedback.type === "success"
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border border-rose-200 text-rose-800"
                  }`}
                >
                  {editFeedback.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Change Role Preset
                </label>
                <select
                  value={editRole}
                  onChange={(e) => {
                    const next = e.target.value;
                    setEditRole(next);
                    if (next === ADMIN_ROLES.SUPER_ADMIN) {
                      setEditPermissions(Object.values(PERMISSIONS));
                    } else if (rolePermissionsMap[next]) {
                      setEditPermissions([...rolePermissionsMap[next]]);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-900 outline-none"
                >
                  {Object.values(ADMIN_ROLES).map((rk) => (
                    <option key={rk} value={rk}>
                      {rk.replace(/_/g, " ")} — {ROLE_LABELS[rk]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Permissions Checklist ({editPermissions.length} active)
                </label>
                <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                  {PERMISSION_GROUPS.map((group) => (
                    <div key={group.name} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                      <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">
                        {group.name}
                      </h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {group.permissions.map((p) => {
                          const isChecked =
                            editRole === ADMIN_ROLES.SUPER_ADMIN || editPermissions.includes(p.key);
                          return (
                            <label
                              key={p.key}
                              className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer select-none"
                            >
                              <input
                                type="checkbox"
                                disabled={editRole === ADMIN_ROLES.SUPER_ADMIN}
                                checked={isChecked}
                                onChange={() => {
                                  setEditPermissions((prev) =>
                                    prev.includes(p.key) ? prev.filter((k) => k !== p.key) : [...prev, p.key]
                                  );
                                }}
                                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <div>
                                <span className="font-semibold text-slate-900 block text-[11px]">{p.label}</span>
                                <span className="text-[10px] text-slate-400 block">{p.description}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatePermissionsMutation.isPending}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-bold text-white transition cursor-pointer disabled:opacity-50"
                >
                  {updatePermissionsMutation.isPending ? "Saving..." : "Save Role & Permissions"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Permissions Inspection Modal ─────────────────────────────── */}
      {viewingPermissionsStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {viewingPermissionsStaff.name}'s Active Permissions
                </h3>
                <p className="text-xs text-slate-500">{viewingPermissionsStaff.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingPermissionsStaff(null)}
                className="text-slate-400 hover:text-slate-700 bg-transparent border-0 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {viewingPermissionsStaff.adminPermissions?.map((perm) => (
                <div key={perm} className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-100 p-2 text-xs">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span className="font-mono text-slate-800 font-medium">{perm}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setViewingPermissionsStaff(null)}
                className="rounded-xl border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
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

export default StaffManagementSection;
