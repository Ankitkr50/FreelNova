import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../api/admin.api.js";
import { chatApi } from "../api/chat.api.js";
import { useAuth } from "../hooks/useAuth.js";
import StaffManagementSection from "../components/admin/StaffManagementSection.jsx";
import SecurityCenterSection from "../components/admin/SecurityCenterSection.jsx";
import FinancialLedgerSection from "../components/admin/FinancialLedgerSection.jsx";
import SupportTicketsSection from "../components/admin/SupportTicketsSection.jsx";
import FeatureFlagsSection from "../components/admin/FeatureFlagsSection.jsx";
import AuditLogsSection from "../components/admin/AuditLogsSection.jsx";
import SystemHealthSection from "../components/admin/SystemHealthSection.jsx";
import SuperAdminCommandCenter from "../components/admin/enterprise/SuperAdminCommandCenter.jsx";
import SupportTicketSLAModule from "../components/admin/enterprise/SupportTicketSLAModule.jsx";
import DisputeResolutionModule from "../components/admin/enterprise/DisputeResolutionModule.jsx";
import FinanceApprovalModule from "../components/admin/enterprise/FinanceApprovalModule.jsx";
import SecurityFraudCenterModule from "../components/admin/enterprise/SecurityFraudCenterModule.jsx";
import CompanyAnalyticsModule from "../components/admin/enterprise/CompanyAnalyticsModule.jsx";
import InternalKnowledgeBaseModule from "../components/admin/enterprise/InternalKnowledgeBaseModule.jsx";
import EmployeeHandoverModule from "../components/admin/enterprise/EmployeeHandoverModule.jsx";
import InternalNotesModule from "../components/admin/enterprise/InternalNotesModule.jsx";
import NotificationCenter2Module from "../components/admin/enterprise/NotificationCenter2Module.jsx";
import SensitiveActionCenterModule from "../components/admin/enterprise/SensitiveActionCenterModule.jsx";
import CaseManagementModule from "../components/admin/enterprise/CaseManagementModule.jsx";
import PolicyComplianceModule from "../components/admin/enterprise/PolicyComplianceModule.jsx";
import {
  PERMISSIONS,
  ADMIN_ROLES,
  ROLE_LABELS,
  ROLE_COLORS,
  ROLE_ICONS,
} from "../constants/permissions.js";

const TAB_CATEGORIES = [
  {
    id: "command",
    label: "Executive Command",
    tabs: [
      { key: "command_center", label: "Command Center", permission: PERMISSIONS.ANALYTICS_VIEW },
    ],
  },
  {
    id: "marketplace",
    label: "Marketplace Operations",
    tabs: [
      { key: "users", label: "Users", permission: PERMISSIONS.USERS_VIEW },
      { key: "projects", label: "Projects", permission: PERMISSIONS.PROJECTS_VIEW },
      { key: "disputes", label: "Disputes", permission: PERMISSIONS.DISPUTES_VIEW },
      { key: "dispute_resolution", label: "Dispute Center", permission: PERMISSIONS.DISPUTES_RESOLVE },
      { key: "support_tickets", label: "Support Tickets", permission: PERMISSIONS.SUPPORT_TICKETS_MANAGE },
      { key: "support_sla_tickets", label: "Support & SLA", permission: PERMISSIONS.TICKETS_VIEW || "tickets_view" },
      { key: "case_management", label: "Case Management", permission: PERMISSIONS.CASES_VIEW || "cases_view" },
    ],
  },
  {
    id: "financials",
    label: "Financials & Escrow",
    tabs: [
      { key: "payments", label: "Payments", permission: PERMISSIONS.PAYMENTS_VIEW },
      { key: "financial_ledger", label: "Financial Ledger", permission: PERMISSIONS.FINANCIAL_REPORTS_VIEW },
      { key: "payouts", label: "Payout Requests", permission: PERMISSIONS.WITHDRAWALS_VIEW },
      { key: "finance_approvals", label: "Finance Approvals", permission: PERMISSIONS.FINANCE_VIEW || "finance_view" },
    ],
  },
  {
    id: "governance",
    label: "Governance & Security",
    tabs: [
      { key: "staff", label: "Team & Staff", permission: PERMISSIONS.STAFF_VIEW },
      { key: "security_center", label: "Security & 2FA", permission: PERMISSIONS.STAFF_MANAGE },
      { key: "security_fraud_center", label: "Security & Fraud Center", permission: PERMISSIONS.SECURITY_VIEW || "security_view" },
      { key: "sensitive_action_center", label: "Sensitive Action Approvals", permission: PERMISSIONS.SENSITIVE_ACTIONS_REQUEST || "sensitive_actions_request" },
    ],
  },
  {
    id: "internal_ops",
    label: "Internal Operations & Staff",
    tabs: [
      { key: "internal_knowledge_base", label: "Knowledge Base SOP", permission: PERMISSIONS.KNOWLEDGE_VIEW || "knowledge_view" },
      { key: "employee_handover", label: "Workload Handover", permission: PERMISSIONS.HANDOVER_VIEW || "handover_view" },
      { key: "internal_notes", label: "Internal Notes", permission: PERMISSIONS.INTERNAL_NOTES_VIEW || "internal_notes_view" },
      { key: "notification_center_2", label: "Notification 2.0 Engine", permission: PERMISSIONS.NOTIFICATIONS_SEND || "notifications_send" },
      { key: "policy_compliance", label: "Policy & Compliance", permission: PERMISSIONS.POLICIES_VIEW || "policies_view" },
    ],
  },
  {
    id: "platform",
    label: "Diagnostics & System",
    tabs: [
      { key: "company_analytics", label: "Company Analytics", permission: PERMISSIONS.ANALYTICS_VIEW || "analytics_view" },
      { key: "feature_flags", label: "Feature Flags", permission: PERMISSIONS.SETTINGS_MANAGE },
      { key: "audit_logs", label: "Audit Trail", permission: PERMISSIONS.AUDIT_LOGS_VIEW },
      { key: "system_health", label: "System Health", permission: PERMISSIONS.SYSTEM_HEALTH_VIEW },
      { key: "system_logs", label: "System Logs", permission: PERMISSIONS.SYSTEM_LOGS_VIEW },
      { key: "sentiment_watchlist", label: "Sentiment Watch", permission: PERMISSIONS.CHAT_VIEW },
    ],
  },
];

const allTabs = TAB_CATEGORIES.flatMap((c) => c.tabs);

const tabConfig = {
  users: {
    columns: ["Name", "Role", "Status", "Joined", "Actions"],
    statuses: ["all", "active", "suspended", "flagged"],
  },
  projects: {
    columns: ["Title", "Category", "Status", "Budget", "Updated", "Actions"],
    statuses: ["all", "posted", "applied", "selected", "in_progress", "completed", "paid"],
  },
  payments: {
    columns: ["Project", "Amount", "Status", "Gateway", "Created", "Actions"],
    statuses: ["all", "created", "authorized", "captured", "failed", "released"],
  },
  disputes: {
    columns: ["Project", "Raised By", "Priority", "Status", "Created", "Actions"],
    statuses: ["all", "open", "in_review", "resolved", "closed"],
  },
  payouts: {
    columns: ["ID", "Freelancer", "Amount", "Payout Method", "Bank Details / UPI", "Requested Date", "Status", "Actions"],
    statuses: ["all"],
  },
  system_logs: {
    columns: ["Category", "Event", "Note", "Timestamp"],
    statuses: ["all"],
  },
  sentiment_watchlist: {
    columns: ["Conversation ID", "Hired Digital Specialist", "Sentiment Mood", "Risk Indicator Score", "Actions"],
    statuses: ["all"],
  },
};

function badgeClass(statusOrPriority) {
  if (
    statusOrPriority === "active" ||
    statusOrPriority === "released" ||
    statusOrPriority === "resolved" ||
    statusOrPriority === "completed" ||
    statusOrPriority === "paid"
  ) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (
    statusOrPriority === "suspended" ||
    statusOrPriority === "failed" ||
    statusOrPriority === "high" ||
    statusOrPriority === "flagged"
  ) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (statusOrPriority === "in_review" || statusOrPriority === "held_in_escrow" || statusOrPriority === "medium") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function asDate(value) {
  if (!value) return "";
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function mapRows(tab, rows) {
  if (tab === "users") {
    return rows.map((row) => ({
      id: row._id || row.id,
      name: row.name || "-",
      username: row.username || "",
      userCode: row.userCode || "",
      role: row.role || "-",
      status: row.moderationStatus || "active",
      fineAmount: row.fineAmount || 0,
      fineStatus: row.fineStatus || "NONE",
      fineReason: row.fineReason || "",
      joinedAt: asDate(row.createdAt),
      isVerified: row.isVerified || false,
      profileCompleted: row.profileCompleted || false,
      subscriptions: row.subscriptions || [],
    }));
  }

  if (tab === "projects") {
    return rows.map((row) => ({
      id: row._id || row.id,
      title: row.title || "-",
      category: row.category || "-",
      status: row.status || "-",
      budget: `${row.currency || "INR"} ${Number(row.budgetMin || 0)}-${Number(row.budgetMax || 0)}`,
      updatedAt: asDate(row.updatedAt || row.createdAt),
    }));
  }

  if (tab === "payments") {
    return rows.map((row) => ({
      id: row._id || row.id,
      project: row.projectRelation?.title || row.projectId || "-",
      projectRelation: row.projectRelation || null,
      recruiterId: row.recruiterId || null,
      freelancerId: row.freelancerId || null,
      amountNum: row.amount || 0,
      amount: `${row.currency || "INR"} ${Number(row.amount || 0).toLocaleString()}`,
      status: row.escrowStatus === "released" ? "released" : row.status || "-",
      escrowStatus: row.escrowStatus || "-",
      method: row.gatewayOrderId ? "Razorpay" : "Gateway",
      createdAt: asDate(row.createdAt),
      createdTime: new Date(row.createdAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      }),
      gatewayOrderId: row.gatewayOrderId || "-",
      gatewayPaymentId: row.gatewayPaymentId || "-"
    }));
  }

  return rows.map((row) => ({
    id: row._id || row.id,
    project: row.projectId?.title || "-",
    raisedBy: row.raisedBy?.role || "-",
    priority: row.priority || "-",
    status: row.status || "-",
    createdAt: asDate(row.createdAt),
  }));
}

function AdminPanel() {
  const { user } = useAuth();
  const role = user?.role || "freelancer";
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("users");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedRange, setSelectedRange] = useState("single_date");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [feedback, setFeedback] = useState("");
  const [statementFilter, setStatementFilter] = useState("");
  const [usersSearch, setUsersSearch] = useState("");
  const [projectsSearch, setProjectsSearch] = useState("");
  const [paymentsSearch, setPaymentsSearch] = useState("");
  const [filterByDate, setFilterByDate] = useState(false);
  const [dirSearch, setDirSearch] = useState("");
  const [isQuickDirectoryOpen, setIsQuickDirectoryOpen] = useState(false);

  const [payoutSetting, setPayoutSetting] = useState(() => {
    return localStorage.getItem("sb_payout_setting") || "manual";
  });
  const [localPayoutRequests, setLocalPayoutRequests] = useState(() => {
    try {
      const saved = localStorage.getItem("sb_payout_requests");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleTogglePayoutSetting = (method) => {
    setPayoutSetting(method);
    localStorage.setItem("sb_payout_setting", method);
    alert(`💰 Payout method set to: ${method === "razorpay" ? "Direct Automated (Razorpay Payouts)" : "Manual Bank/UPI Transfer"}`);
  };

  const handleApprovePayout = (requestId) => {
    const targetReq = localPayoutRequests.find(req => req.id === requestId);
    if (!targetReq) return;

    if (!targetReq.isVerified) {
      const confirmForce = window.confirm(
        `⚠️ WARNING: Freelancer "${targetReq.freelancerName}" is NOT verified yet!\n\nProcessing payouts to unverified accounts carries financial risk.\n\nDo you want to proceed with this payout anyway?`
      );
      if (!confirmForce) return;
    }

    if (window.confirm(`Are you sure you want to mark payout request "${requestId}" of ₹${targetReq.amount.toLocaleString()} as COMPLETED?`)) {
      const updated = localPayoutRequests.map(req => {
        if (req.id === requestId) {
          return { ...req, status: "Completed" };
        }
        return req;
      });
      setLocalPayoutRequests(updated);
      localStorage.setItem("sb_payout_requests", JSON.stringify(updated));
      alert("✅ Payout request successfully marked as COMPLETED!");
    }
  };

  const isPrimarySuperAdmin =
    user?.email === "fn.freelnova@gmail.com" ||
    (user?.adminRole === ADMIN_ROLES.SUPER_ADMIN && !user?.customRoleTitle);

  const isSuperAdmin =
    isPrimarySuperAdmin ||
    (user?.adminRole === ADMIN_ROLES.SUPER_ADMIN && !user?.customRoleTitle);

  const userPermissions = useMemo(() => {
    return Array.isArray(user?.adminPermissions) ? user.adminPermissions : [];
  }, [user]);

  const canViewFinancials =
    isSuperAdmin ||
    userPermissions.includes(PERMISSIONS.FINANCIAL_REPORTS_VIEW) ||
    userPermissions.includes(PERMISSIONS.PAYMENTS_VIEW);

  const tabs = useMemo(() => {
    if (isSuperAdmin) return allTabs;
    return allTabs.filter((t) => {
      if (t.key === "staff") return isPrimarySuperAdmin;
      return !t.permission || userPermissions.includes(t.permission);
    });
  }, [isSuperAdmin, isPrimarySuperAdmin, userPermissions]);

  const authorizedCategories = useMemo(() => {
    return TAB_CATEGORIES.map((cat) => {
      const allowedTabs = cat.tabs.filter((t) => {
        if (t.key === "staff") return isPrimarySuperAdmin;
        return isSuperAdmin || !t.permission || userPermissions.includes(t.permission);
      });
      return {
        ...cat,
        tabs: allowedTabs,
      };
    }).filter((cat) => cat.tabs.length > 0);
  }, [isSuperAdmin, isPrimarySuperAdmin, userPermissions]);

  const activeCategory = useMemo(() => {
    return (
      authorizedCategories.find((cat) => cat.tabs.some((t) => t.key === activeTab)) ||
      authorizedCategories[0] ||
      TAB_CATEGORIES[0]
    );
  }, [authorizedCategories, activeTab]);

  useEffect(() => {
    if (tabs.length > 0 && !tabs.some((t) => t.key === activeTab)) {
      setActiveTab(tabs[0].key);
    }
  }, [tabs, activeTab]);

  const config = tabConfig[activeTab] || tabConfig.users;

  const queryParams = useMemo(() => {
    const params = { page: 1, limit: 100, sort };
    if (filterByDate) {
      params.date = selectedDate;
      params.range = selectedRange;
    }
    if (search.trim()) params.q = search.trim();
    if (statusFilter !== "all") {
      if (activeTab === "users") params.moderationStatus = statusFilter;
      else params.status = statusFilter;
    }
    return params;
  }, [activeTab, search, sort, statusFilter, selectedDate, selectedRange, filterByDate]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", activeTab, queryParams],
    queryFn: () => adminApi.listByTab(activeTab, queryParams),
    enabled:
      role === "admin" &&
      ![
        "system_logs",
        "sentiment_watchlist",
        "payouts",
        "staff",
        "audit_logs",
        "system_health",
        "security_center",
        "financial_ledger",
        "support_tickets",
        "feature_flags",
      ].includes(activeTab),
  });

  // Fetch platform intelligence metrics
  const { data: intel, isLoading: intelLoading } = useQuery({
    queryKey: ["admin_intel", selectedDate, selectedRange],
    queryFn: async () => {
      const res = await adminApi.getIntelligence(selectedDate, selectedRange);
      return res?.data?.data || {};
    },
    enabled: role === "admin" && canViewFinancials,
  });

  // Fetch full list of users for the quick-access directory dropdown
  const { data: quickUsersData } = useQuery({
    queryKey: ["admin_quick_users"],
    queryFn: async () => {
      const res = await adminApi.listUsers({ page: 1, limit: 1000 });
      return res?.data?.data || [];
    },
    enabled: role === "admin" && (isSuperAdmin || userPermissions.includes(PERMISSIONS.USERS_VIEW)),
  });
  const quickUsers = quickUsersData || [];

  const [selectedDetailUserId, setSelectedDetailUserId] = useState(null);

  const [projDirSearch, setProjDirSearch] = useState("");
  const [isQuickProjDirectoryOpen, setIsQuickProjDirectoryOpen] = useState(false);
  const [selectedDetailProjectId, setSelectedDetailProjectId] = useState(null);
  const [selectedDetailPaymentId, setSelectedDetailPaymentId] = useState(null);

  // Fetch full list of projects for the quick-access directory dropdown
  const { data: quickProjectsData } = useQuery({
    queryKey: ["admin_quick_projects"],
    queryFn: async () => {
      const res = await adminApi.listProjects({ page: 1, limit: 1000 });
      return res?.data?.data || [];
    },
    enabled: role === "admin",
  });
  const quickProjects = quickProjectsData || [];

  // Fetch individual project analytics/details
  const { data: projectDetails, isLoading: projDetailsLoading } = useQuery({
    queryKey: ["admin_project_details", selectedDetailProjectId],
    queryFn: async () => {
      const res = await adminApi.getProjectDetails(selectedDetailProjectId);
      return res?.data?.data || null;
    },
    enabled: !!selectedDetailProjectId,
  });

  // Fetch individual user analytics/details
  const { data: userDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ["admin_user_details", selectedDetailUserId],
    queryFn: async () => {
      const res = await adminApi.getUserDetails(selectedDetailUserId);
      return res?.data?.data || null;
    },
    enabled: !!selectedDetailUserId,
  });

  // Reset statement filter when detail sheet closes or opens new user
  useEffect(() => {
    setStatementFilter("");
  }, [selectedDetailUserId]);

  // Filter payments inside user statement by project or counterparty name/username/email
  const filteredPayments = useMemo(() => {
    if (!userDetails || !userDetails.payments) return [];
    const query = statementFilter.toLowerCase().trim();
    if (!query) return userDetails.payments;
    return userDetails.payments.filter(p => {
      const projTitle = (p.project?.title || "").toLowerCase();
      const counterpartyName = (userDetails.user.role === "recruiter" 
        ? p.freelancer?.name 
        : p.recruiter?.name) || "";
      const counterpartyUsername = (userDetails.user.role === "recruiter" 
        ? p.freelancer?.username 
        : p.recruiter?.username) || "";
      const counterpartyEmail = (userDetails.user.role === "recruiter" 
        ? p.freelancer?.email 
        : p.recruiter?.email) || "";

      return projTitle.includes(query) || 
             counterpartyName.toLowerCase().includes(query) || 
             counterpartyUsername.toLowerCase().includes(query) ||
             counterpartyEmail.toLowerCase().includes(query);
    });
  }, [userDetails, statementFilter]);

  // Calculate local sentiment watchlist from local storage chats
  const sentimentWatchlist = useMemo(() => {
    if (activeTab !== "sentiment_watchlist") return [];
    try {
      const requests = JSON.parse(localStorage.getItem("sb_chat_requests") || "[]");
      const list = [];

      requests.forEach(req => {
        const storedMsgs = localStorage.getItem(`sb_chat_msgs_${req.id}`);
        const msgs = storedMsgs ? JSON.parse(storedMsgs) : [];

        let positive = 0;
        let negative = 0;

        msgs.forEach(m => {
          const txt = m.text.toLowerCase();
          if (txt.includes("thank") || txt.includes("perfect") || txt.includes("good") || txt.includes("great") || txt.includes("awesome") || txt.includes("yes") || txt.includes("accept") || txt.includes("solve") || txt.includes("success") || txt.includes("compiled")) {
            positive++;
          }
          if (txt.includes("no") || txt.includes("bad") || txt.includes("error") || txt.includes("issue") || txt.includes("delay") || txt.includes("dispute") || txt.includes("fail") || txt.includes("wait") || txt.includes("locked")) {
            negative++;
          }
        });

        let mood = "Stable Collaboration";
        let score = 92;
        let color = "text-blue-700 bg-blue-50 border-blue-200";

        if (negative > positive) {
          mood = "Alert / Delay Risk";
          score = 45;
          color = "text-rose-700 bg-rose-50 border-rose-200";
        } else if (positive > 0) {
          mood = "High Satisfaction";
          score = 98;
          color = "text-emerald-700 bg-emerald-50 border-emerald-200";
        }

        list.push({
          id: req.id,
          name: req.receiverName || "Freelancer",
          projectTitle: req.projectTitle || "Autonomous Task",
          mood,
          score,
          color,
          messageCount: msgs.length
        });
      });

      return list;
    } catch (e) {
      console.error(e);
      return [];
    }
  }, [activeTab]);

  const reviewMutation = useMutation({
    mutationFn: async ({ rowId, action }) => {
      if (activeTab === "users") {
        if (action === "verify") {
          return adminApi.updateUserStatus(rowId, {
            isVerified: true,
            moderationStatus: "active",
            moderationNote: "Profile verified by Admin",
          });
        }
        if (action === "block") {
          return adminApi.updateUserStatus(rowId, {
            moderationStatus: "blocked",
            moderationNote: "Blocked by Administrator",
          });
        }
        if (action === "verify" || action === "unverify") {
          return adminApi.updateUserStatus(rowId, {
            isVerified: action === "verify",
            isEmailVerified: action === "verify",
            profileCompleted: action === "verify" ? true : undefined,
            moderationNote: action === "verify" ? "Manually verified by Administrator" : "Verification status removed by Administrator",
          });
        }
        if (action === "issue_fine") {
          return adminApi.updateUserStatus(rowId, {
            moderationStatus: "blocked",
            fineAmount: 5000,
            fineStatus: "PENDING",
            fineReason: "Contact details sharing policy violation (Phone/Email/WhatsApp/Telegram)",
            moderationNote: "Blocked for contact details sharing. ₹5,000 fine imposed.",
          });
        }
        if (action === "unblock") {
          return adminApi.updateUserStatus(rowId, {
            moderationStatus: "active",
            fineStatus: "WAIVED",
            moderationNote: "Account unblocked & fine waived by Administrator",
          });
        }
        return adminApi.updateUserStatus(rowId, {
          moderationStatus: action === "flag" ? "suspended" : "active",
          moderationNote: `Action: ${action}`,
        });
      }
      if (activeTab === "projects") {
        return adminApi.moderateProject(rowId, {
          moderationStatus: action === "flag" ? "flagged" : "approved",
          moderationNote: `Action: ${action}`,
        });
      }
      if (activeTab === "payments") {
        return adminApi.reviewPayment(rowId, {
          reviewStatus: action === "flag" ? "flagged" : "approved",
          reviewNote: `Action: ${action}`,
        });
      }
      return adminApi.patchDispute(rowId, {
        status: action === "resolve" ? "resolved" : "under_review",
        resolutionNote: `Action: ${action}`,
      });
    },
    onSuccess: (response) => {
      setFeedback(response?.data?.message || "Admin action completed.");
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      queryClient.invalidateQueries({ queryKey: ["admin_intel"] });
    },
    onError: (error) => {
      setFeedback(error?.response?.data?.message || "Admin action failed.");
    },
  });

  const rows = useMemo(() => {
    if (activeTab === "system_logs") {
      return intel?.auditLogs || [];
    }
    if (activeTab === "sentiment_watchlist") {
      return sentimentWatchlist;
    }
    if (activeTab === "payouts") {
      return localPayoutRequests;
    }
    return mapRows(activeTab, data?.rows || []);
  }, [activeTab, data, intel, sentimentWatchlist, localPayoutRequests]);

  const filteredRows = useMemo(() => {
    const keyword = normalizeText(search.trim());
    const matchesSearch = (row) => {
      if (!keyword) return true;
      return Object.values(row).some((value) => normalizeText(value).includes(keyword));
    };
    return [...rows].filter(matchesSearch);
  }, [rows, search]);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSort("newest");
    setFilterByDate(false);
  };

  const handleAction = (action, rowId) => {
    if (action === "view") {
      if (activeTab === "users") {
        setSelectedDetailUserId(rowId);
        return;
      }
      if (activeTab === "projects") {
        setSelectedDetailProjectId(rowId);
        return;
      }
      if (activeTab === "payments") {
        setSelectedDetailPaymentId(rowId);
        return;
      }
      const row = data?.rows?.find((r) => (r._id || r.id) === rowId);
      if (row) {
        alert(`Record Details:\n${JSON.stringify(row, null, 2)}`);
      }
      return;
    }
    reviewMutation.mutate({ action, rowId });
  };

  if (role !== "admin") {
    return (
      <section className="rounded-3xl border border-slate-200/80 bg-gradient-to-tr from-slate-50 to-blue-50/20 p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Super Admin Panel</h1>
        <p className="mt-2 text-slate-600">This panel is available only for authorized admin and staff members.</p>
      </section>
    );
  }

  return (
    <section className="w-full space-y-6">
      <div className="flex flex-col 2xl:flex-row 2xl:items-center 2xl:justify-between gap-6 rounded-[2rem] border border-blue-200/80 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.28),transparent_30%),linear-gradient(135deg,#0f274f_0%,#163d7a_48%,#2563eb_100%)] p-6 text-white shadow-[0_24px_70px_rgba(37,99,235,0.15)] md:p-8">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-50">
              Platform Control
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider bg-white/20 text-white border border-white/30 backdrop-blur-sm">
              <img
                src={ROLE_ICONS[user?.adminRole] || ROLE_ICONS[ADMIN_ROLES.SUPER_ADMIN]}
                alt="Role Icon"
                className="h-4 w-4 object-contain shrink-0"
              />
              {user?.customRoleTitle || (isPrimarySuperAdmin
                ? "Super Administrator"
                : (ROLE_LABELS[user?.adminRole] || user?.adminRole || "Main Admin"))}
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white">
            {user?.customRoleTitle ? `${user.customRoleTitle} Panel` : (isPrimarySuperAdmin ? "Super Admin Panel" : "Main Admin Panel")}
          </h1>
          <p className="mt-2 text-blue-50/80 text-sm">Enterprise platform administration, Operations control, and Ecosystem oversight.</p>
          {isPrimarySuperAdmin && (
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("staff");
                  setTimeout(() => {
                    const el = document.getElementById("staff-section");
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "start" });
                    } else {
                      window.scrollTo({ top: 500, behavior: "smooth" });
                    }
                  }, 50);
                }}
                className="px-4 py-2 rounded-xl bg-white text-blue-900 font-extrabold text-xs shadow-lg hover:bg-blue-50 cursor-pointer border-0 transition transform active:scale-95"
              >
                Manage Team & Staff RBAC
              </button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 items-end w-full 2xl:w-auto">
          <div className="flex flex-col gap-1.5 min-w-[125px] relative text-center">
            <label className="text-[11px] font-bold text-blue-100 uppercase tracking-wider text-center w-full">
              USER LIST
            </label>
            <button
              onClick={() => setIsQuickDirectoryOpen(!isQuickDirectoryOpen)}
              type="button"
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white outline-none transition hover:bg-white/20 focus:ring-4 focus:ring-white/10 text-xs font-semibold text-center flex items-center justify-center gap-1.5 select-none w-full cursor-pointer"
            >
              <span>Select User...</span>
              <svg className={`h-3.5 w-3.5 transition-transform duration-200 ${isQuickDirectoryOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isQuickDirectoryOpen && (
              <>
                {/* Backdrop to close list when clicking outside */}
                <div 
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setIsQuickDirectoryOpen(false)}
                />
                
                {/* Custom Popover Container */}
                <div className="absolute top-full mt-2 left-0 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl w-80 p-3.5 space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">User Directory</h4>
                    <button 
                      onClick={() => setIsQuickDirectoryOpen(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold bg-transparent border-0 outline-none cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                  
                  <input
                    type="text"
                    value={dirSearch}
                    onChange={(e) => setDirSearch(e.target.value)}
                    placeholder="Search by name or role..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                    onClick={(e) => e.stopPropagation()} // Prevent dropdown from closing on input click
                  />

                  <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pt-1">
                    {(() => {
                      const filtered = quickUsers.filter(u => {
                        const q = dirSearch.toLowerCase().trim();
                        if (!q) return true;
                        return (u.name || "").toLowerCase().includes(q) ||
                               (u.username || "").toLowerCase().includes(q) ||
                               (u.email || "").toLowerCase().includes(q) ||
                               (u.role || "").toLowerCase().includes(q);
                      });

                      if (filtered.length === 0) {
                        return <p className="text-xs text-slate-400 italic py-4 text-center">No users match search.</p>;
                      }

                      return filtered.map(u => {
                        const initials = u.name 
                          ? u.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() 
                          : "US";

                        return (
                          <button
                            key={u.id || u._id}
                            type="button"
                            onClick={() => {
                              setSelectedDetailUserId(u.id || u._id);
                              setIsQuickDirectoryOpen(false);
                              setDirSearch("");
                            }}
                            className="w-full flex items-center gap-3 py-2 px-1.5 hover:bg-slate-50 rounded-xl text-left border-none bg-transparent cursor-pointer transition select-none"
                          >
                            <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-tr ${
                              u.role === "recruiter" 
                                ? "from-blue-500 to-indigo-600" 
                                : u.role === "admin" 
                                  ? "from-red-500 to-rose-600" 
                                  : "from-emerald-500 to-teal-600"
                            }`}>
                              {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{u.name}</p>
                              <p className="text-[10px] text-slate-500 truncate font-mono mt-0.5">
                                {u.username ? `@${u.username} • ` : ""}{u.email}
                              </p>
                            </div>
                            <span className="shrink-0 text-[10px] text-slate-400 font-semibold whitespace-nowrap">
                              {u.createdAt 
                                ? new Date(u.createdAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })
                                : ""}
                            </span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-1.5 min-w-[125px] relative text-center">
            <label className="text-[11px] font-bold text-blue-100 uppercase tracking-wider text-center w-full">
              PROJECT LIST
            </label>
            <button
              onClick={() => setIsQuickProjDirectoryOpen(!isQuickProjDirectoryOpen)}
              type="button"
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white outline-none transition hover:bg-white/20 focus:ring-4 focus:ring-white/10 text-xs font-semibold text-center flex items-center justify-center gap-1.5 select-none w-full cursor-pointer"
            >
              <span>Select Project...</span>
              <svg className={`h-3.5 w-3.5 transition-transform duration-200 ${isQuickProjDirectoryOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isQuickProjDirectoryOpen && (
              <>
                {/* Backdrop to close list when clicking outside */}
                <div 
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setIsQuickProjDirectoryOpen(false)}
                />
                
                {/* Custom Popover Container */}
                <div className="absolute top-full mt-2 left-0 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl w-80 p-3.5 space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Project Directory</h4>
                    <button 
                      onClick={() => setIsQuickProjDirectoryOpen(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold bg-transparent border-0 outline-none cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                  
                  <input
                    type="text"
                    value={projDirSearch}
                    onChange={(e) => setProjDirSearch(e.target.value)}
                    placeholder="Search by title or category..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                    onClick={(e) => e.stopPropagation()} // Prevent dropdown from closing on input click
                  />

                  <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pt-1">
                    {(() => {
                      const filtered = quickProjects.filter(p => {
                        const q = projDirSearch.toLowerCase().trim();
                        if (!q) return true;
                        return (p.title || "").toLowerCase().includes(q) ||
                               (p.category || "").toLowerCase().includes(q);
                      });

                      if (filtered.length === 0) {
                        return <p className="text-xs text-slate-400 italic py-4 text-center">No projects match search.</p>;
                      }

                      return filtered.map(p => {
                        return (
                          <button
                            key={p.id || p._id}
                            type="button"
                            onClick={() => {
                              setSelectedDetailProjectId(p.id || p._id);
                              setIsQuickProjDirectoryOpen(false);
                              setProjDirSearch("");
                            }}
                            className="w-full text-left py-2.5 px-1.5 hover:bg-slate-50 rounded-xl border-none bg-transparent cursor-pointer transition select-none flex flex-col"
                          >
                            <span className="text-xs font-bold text-slate-900 truncate w-full">{p.title}</span>
                            <span className="text-[10px] text-slate-500 font-semibold mt-0.5 capitalize">
                              {p.category} • {p.status}
                            </span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-1.5 min-w-[125px] text-center">
            <label className="text-[11px] font-bold text-blue-100 uppercase tracking-wider text-center w-full" htmlFor="dailyRangeSelector">
              ANALYTICS RANGE
            </label>
            <select
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white outline-none transition focus:border-white/40 focus:bg-white/20 focus:ring-4 focus:ring-white/10 text-xs font-semibold [&>option]:text-slate-900 text-center w-full cursor-pointer"
              id="dailyRangeSelector"
              onChange={(event) => setSelectedRange(event.target.value)}
              value={selectedRange}
              style={{ textAlignLast: "center" }}
            >
              <option value="single_date">Single Date</option>
              <option value="last_10_days">Last 10 Days</option>
              <option value="last_15_days">Last 15 Days</option>
              <option value="last_30_days">Last 30 Days</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-[125px] text-center">
            <label className="text-[11px] font-bold text-blue-100 uppercase tracking-wider text-center w-full" htmlFor="dailyDatePicker">
              TARGET END DATE
            </label>
            <input
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white outline-none transition focus:border-white/40 focus:bg-white/20 focus:ring-4 focus:ring-white/10 text-xs font-semibold text-center w-full cursor-pointer"
              id="dailyDatePicker"
              onChange={(event) => setSelectedDate(event.target.value)}
              type="date"
              value={selectedDate}
              style={{ colorScheme: "dark", textAlign: "center" }}
            />
          </div>
        </div>
      </div>

      {/* Shimmering Loading Skeletons */}
      {intelLoading && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 h-28">
                <div className="h-3 bg-slate-100 rounded w-2/3"></div>
                <div className="h-6 bg-slate-100 rounded w-1/2 mt-4"></div>
                <div className="h-3 bg-slate-100 rounded w-1/3 mt-3"></div>
              </div>
            ))}
          </div>
          <div className="mt-6 animate-pulse rounded-2xl border border-slate-200 bg-white p-5 h-52">
            <div className="h-4 bg-slate-100 rounded w-1/4 mb-4"></div>
            <div className="h-32 bg-slate-50 rounded w-full"></div>
          </div>
        </>
      )}

      {/* Database Standby / Wake-up Notice */}
      {!intelLoading && !intel?.metrics && (
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/50 p-5 text-center">
          <h4 className="text-sm font-bold text-blue-900">Database Cold-Start Wake Up</h4>
          <p className="mt-1 text-xs text-blue-700">
            The free-tier database server goes to sleep after 5 minutes of inactivity. We are waking it up for you.
            Please refresh the page in 5-10 seconds to load the platform turnover charts and statistics!
          </p>
        </div>
      )}

      {/* Advanced Financial Intelligence & Platform Turnover Dashboard */}
      {!intelLoading && intel?.metrics && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-white p-5 shadow-sm hover:shadow-md transition duration-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Platform Turnover</span>
            <h3 className="mt-2 text-2xl font-bold text-slate-900">₹{intel.metrics.totalTurnover.toLocaleString()}</h3>
            <p className={`text-xs mt-1 font-semibold ${intel.metrics.turnoverGrowthPercent >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {intel.metrics.turnoverGrowthPercent >= 0 ? "▲" : "▼"} {Math.abs(intel.metrics.turnoverGrowthPercent)}% vs last week
            </p>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-white p-5 shadow-sm hover:shadow-md transition duration-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Revenue (15% Commission)</span>
            <h3 className="mt-2 text-2xl font-bold text-blue-600">₹{intel.metrics.platformRevenue.toLocaleString()}</h3>
            <p className="text-xs text-slate-500 mt-1">Direct platform earnings</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/60 to-white p-5 shadow-sm hover:shadow-md transition duration-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Escrow Pool</span>
            <h3 className="mt-2 text-2xl font-bold text-amber-600">₹{intel.metrics.activeEscrow.toLocaleString()}</h3>
            <p className="text-xs text-slate-500 mt-1">Secured milestone funds</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white p-5 shadow-sm hover:shadow-md transition duration-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Released Payouts</span>
            <h3 className="mt-2 text-2xl font-bold text-emerald-600">₹{intel.metrics.releasedPayouts.toLocaleString()}</h3>
            <p className="text-xs text-slate-500 mt-1">Completed contracts paid</p>
          </div>
        </div>
      )}

      {/* SVG Interactive Trend Graph */}
      {!intelLoading && intel?.metrics && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Financial Turnover & Revenue Growth Trend</h3>
          <div className="w-full h-40">
            <svg className="w-full h-full" viewBox="0 0 600 150" preserveAspectRatio="none">
              <defs>
                <linearGradient id="turnoverGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <line x1="0" y1="30" x2="600" y2="30" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="75" x2="600" y2="75" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="120" x2="600" y2="120" stroke="#f1f5f9" strokeWidth="1" />

              <path
                d={`M 0,130 Q 120,${130 - (intel.metrics.totalTurnover ? 30 : 0)} 240,${130 - (intel.metrics.totalTurnover ? 50 : 0)} T 480,${130 - (intel.metrics.totalTurnover ? 85 : 0)} T 600,${130 - (intel.metrics.totalTurnover ? 110 : 0)}`}
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
              />
              <path
                d={`M 0,130 Q 120,${130 - (intel.metrics.totalTurnover ? 30 : 0)} 240,${130 - (intel.metrics.totalTurnover ? 50 : 0)} T 480,${130 - (intel.metrics.totalTurnover ? 85 : 0)} T 600,${130 - (intel.metrics.totalTurnover ? 110 : 0)} L 600,150 L 0,150 Z`}
                fill="url(#turnoverGrad)"
              />

              <path
                d={`M 0,140 Q 120,${140 - (intel.metrics.platformRevenue ? 10 : 0)} 240,${140 - (intel.metrics.platformRevenue ? 20 : 0)} T 480,${140 - (intel.metrics.platformRevenue ? 35 : 0)} T 600,${140 - (intel.metrics.platformRevenue ? 50 : 0)}`}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeDasharray="4 2"
              />
            </svg>
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-2">
            <span>Week 1</span>
            <span>Week 2</span>
            <span>Week 3</span>
            <span>Week 4</span>
            <span>Week 5 (Current)</span>
          </div>
        </div>
      )}
      {/* Daily Live Activity Feed for Selected Date */}
      {!intelLoading && intel?.dailyAnalytics && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {selectedRange === "single_date" ? "Daily Analytics Summary" : "Periodic Analytics Summary"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedRange === "single_date" ? `Live activities recorded on ${selectedDate}` : `Aggregated activities for the ${selectedRange.replace(/_/g, " ")} ending on ${selectedDate}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                {intel.dailyAnalytics.summary.newUsersCount} Signups
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                {intel.dailyAnalytics.summary.newProjectsCount} Projects
              </span>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                ₹{intel.dailyAnalytics.summary.paymentsVolume.toLocaleString()} Paid ({intel.dailyAnalytics.summary.paymentsCount} tx)
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-5 md:grid-cols-3">
            {/* User Signups list */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 flex flex-col h-[28rem]">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">New Registrations</h4>
              <div className="mb-3">
                <input
                  type="text"
                  value={usersSearch}
                  onChange={(e) => setUsersSearch(e.target.value)}
                  placeholder="Search signups..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                />
              </div>
              <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                {(() => {
                  const filtered = intel.dailyAnalytics.users.filter((u) => {
                    const q = usersSearch.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      (u.name || "").toLowerCase().includes(q) ||
                      (u.email || "").toLowerCase().includes(q) ||
                      (u.role || "").toLowerCase().includes(q)
                    );
                  });

                  if (filtered.length === 0) {
                    return <p className="text-xs text-slate-400 italic py-4 text-center">No matching signups.</p>;
                  }

                  return filtered.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => setSelectedDetailUserId(u.id)}
                      className="text-xs bg-white border border-slate-100 p-2.5 rounded-lg shadow-xs hover:border-blue-300 hover:bg-blue-50/10 cursor-pointer transition flex flex-col"
                    >
                      <p className="font-bold text-slate-900">{u.name}</p>
                      <p className="text-slate-500 font-medium truncate">{u.email}</p>
                      <span className={`self-start inline-block mt-2 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider border ${u.role === "admin"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : u.role === "recruiter"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                        {u.role === "recruiter" ? "client" : u.role}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Projects Posted list */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 flex flex-col h-[28rem]">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">Projects Posted</h4>
              <div className="mb-3">
                <input
                  type="text"
                  value={projectsSearch}
                  onChange={(e) => setProjectsSearch(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                />
              </div>
              <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                {(() => {
                  const filtered = intel.dailyAnalytics.projects.filter((p) => {
                    const q = projectsSearch.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      (p.title || "").toLowerCase().includes(q) ||
                      (p.category || "").toLowerCase().includes(q)
                    );
                  });

                  if (filtered.length === 0) {
                    return <p className="text-xs text-slate-400 italic py-4 text-center">No matching projects.</p>;
                  }

                  return filtered.map((p) => (
                    <div 
                      key={p.id} 
                      onClick={() => setSelectedDetailProjectId(p.id)}
                      className="text-xs bg-white border border-slate-100 p-2.5 rounded-lg shadow-xs hover:border-blue-300 hover:bg-blue-50/10 cursor-pointer transition flex flex-col"
                    >
                      <p className="font-bold text-slate-900 truncate">{p.title}</p>
                      <p className="text-emerald-700 font-extrabold mt-1">
                        {p.currency} {p.budgetMin.toLocaleString()} - {p.budgetMax.toLocaleString()}
                      </p>
                      <span className="inline-block mt-1 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                        {p.category}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Payments Settled list */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 flex flex-col h-[28rem]">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">Payments Settled</h4>
              <div className="mb-3">
                <input
                  type="text"
                  value={paymentsSearch}
                  onChange={(e) => setPaymentsSearch(e.target.value)}
                  placeholder="Search payments..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                />
              </div>
              <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                {(() => {
                  const filtered = intel.dailyAnalytics.payments.filter((pay) => {
                    const q = paymentsSearch.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      String(pay.amount).includes(q) ||
                      (pay.id || "").toLowerCase().includes(q) ||
                      (pay.status || "").toLowerCase().includes(q) ||
                      (pay.escrowStatus || "").toLowerCase().includes(q)
                    );
                  });

                  if (filtered.length === 0) {
                    return <p className="text-xs text-slate-400 italic py-4 text-center">No matching payments.</p>;
                  }

                  return filtered.map((pay) => (
                    <div 
                      key={pay.id} 
                      onClick={() => setSelectedDetailPaymentId(pay.id)}
                      className="text-xs bg-white border border-slate-100 p-2.5 rounded-lg shadow-xs hover:border-blue-300 hover:bg-blue-50/10 cursor-pointer transition flex justify-between items-start"
                    >
                      <div>
                        <p className="font-extrabold text-slate-900">₹{pay.amount.toLocaleString()}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5 font-mono truncate max-w-[125px]">{pay.id}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[8px] font-bold uppercase border ${pay.status === "captured" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}>
                          {pay.status}
                        </span>
                        <p className="text-[8px] text-slate-400 mt-1 capitalize font-bold">{pay.escrowStatus.replace(/_/g, " ")}</p>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ Security Policy Warnings (Solicitation Watch) */}
      {!intelLoading && intel?.policyViolations && intel.policyViolations.length > 0 && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50/20 p-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-rose-100 pb-3">
            <span className="text-xl">⚠️</span>
            <div>
              <h3 className="text-sm font-bold text-rose-900">Security Policy Alerts</h3>
              <p className="text-xs text-rose-600 mt-0.5">Off-platform contact details sharing detected by client scanners.</p>
            </div>
          </div>
          <div className="mt-4 space-y-3 max-h-60 overflow-y-auto pr-1">
            {intel.policyViolations.map((violation) => {
              const meta = violation.metadata || {};

              return (
                <div key={violation.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white border border-rose-100 p-3 rounded-xl shadow-xs gap-3">
                  <div className="text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900">{meta.userName || "User"}</span>
                      <span className="text-slate-400">({meta.userEmail || "No Email"})</span>
                      <span className="text-[10px] text-slate-500 font-mono">ID: {meta.userId || "N/A"}</span>
                    </div>
                    <p className="mt-1.5 text-slate-700 bg-rose-50/50 border border-rose-100/50 rounded-lg p-2 font-mono text-[11px] leading-relaxed">
                      Violating Message: <span className="font-semibold text-rose-800">"{meta.messageText}"</span>
                    </p>
                    <span className="block mt-1 text-[9px] text-slate-400">{new Date(violation.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex shrink-0 gap-1.5 justify-end">
                    <button
                      type="button"
                      onClick={() => handleAction("view", meta.userId)}
                      className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition cursor-pointer font-semibold"
                    >
                      Inspect Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction("block", meta.userId)}
                      className="rounded-lg bg-rose-600 hover:bg-rose-700 font-bold text-white text-xs px-3 py-1.5 transition cursor-pointer"
                    >
                      Block User
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction("unblock", meta.userId)}
                      className="rounded-lg bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-xs px-3 py-1.5 transition cursor-pointer"
                    >
                      Unblock User
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Systematic Categorized Navigation ────────────────────────────── */}
      <div className="mt-6 space-y-3">
        {/* Tier 1: Category Segmented Bar */}
        <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-100/80 p-1.5 border border-slate-200/80">
          {authorizedCategories.map((cat) => {
            const isCatActive = activeCategory.id === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  if (cat.tabs.length > 0) {
                    setActiveTab(cat.tabs[0].key);
                    setStatusFilter("all");
                    setFeedback("");
                  }
                }}
                type="button"
                className={`rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-2 cursor-pointer select-none ${
                  isCatActive
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200/60 font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60 bg-transparent border border-transparent"
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                    isCatActive ? "bg-blue-100 text-blue-700" : "bg-slate-200/80 text-slate-500"
                  }`}
                >
                  {cat.tabs.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tier 2: Active Category Sub-Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {activeCategory.tabs.map((tab) => {
            const isTabActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setStatusFilter("all");
                  setFeedback("");
                }}
                type="button"
                className={`rounded-xl px-4 py-2 text-xs font-bold transition flex items-center cursor-pointer select-none ${
                  isTabActive
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/40"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "command_center" ? (
        <div className="mt-5">
          <SuperAdminCommandCenter onNavigateTab={(targetTab) => setActiveTab(targetTab)} />
        </div>
      ) : activeTab === "support_sla_tickets" ? (
        <div className="mt-5">
          <SupportTicketSLAModule />
        </div>
      ) : activeTab === "dispute_resolution" ? (
        <div className="mt-5">
          <DisputeResolutionModule />
        </div>
      ) : activeTab === "finance_approvals" ? (
        <div className="mt-5">
          <FinanceApprovalModule />
        </div>
      ) : activeTab === "security_fraud_center" ? (
        <div className="mt-5">
          <SecurityFraudCenterModule />
        </div>
      ) : activeTab === "company_analytics" ? (
        <div className="mt-5">
          <CompanyAnalyticsModule />
        </div>
      ) : activeTab === "internal_knowledge_base" ? (
        <div className="mt-5">
          <InternalKnowledgeBaseModule />
        </div>
      ) : activeTab === "employee_handover" ? (
        <div className="mt-5">
          <EmployeeHandoverModule />
        </div>
      ) : activeTab === "internal_notes" ? (
        <div className="mt-5">
          <InternalNotesModule />
        </div>
      ) : activeTab === "notification_center_2" ? (
        <div className="mt-5">
          <NotificationCenter2Module />
        </div>
      ) : activeTab === "sensitive_action_center" ? (
        <div className="mt-5">
          <SensitiveActionCenterModule />
        </div>
      ) : activeTab === "case_management" ? (
        <div className="mt-5">
          <CaseManagementModule />
        </div>
      ) : activeTab === "policy_compliance" ? (
        <div className="mt-5">
          <PolicyComplianceModule />
        </div>
      ) : activeTab === "staff" ? (
        <div className="mt-5" id="staff-section">
          <StaffManagementSection />
        </div>
      ) : activeTab === "security_center" ? (
        <div className="mt-5">
          <SecurityCenterSection />
        </div>
      ) : activeTab === "financial_ledger" ? (
        <div className="mt-5">
          <FinancialLedgerSection />
        </div>
      ) : activeTab === "support_tickets" ? (
        <div className="mt-5">
          <SupportTicketsSection />
        </div>
      ) : activeTab === "feature_flags" ? (
        <div className="mt-5">
          <FeatureFlagsSection />
        </div>
      ) : activeTab === "audit_logs" ? (
        <div className="mt-5">
          <AuditLogsSection />
        </div>
      ) : activeTab === "system_health" ? (
        <div className="mt-5">
          <SystemHealthSection />
        </div>
      ) : (
        <>
          <section className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/10 p-5 shadow-sm">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="adminSearch">
                  Search
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 text-sm"
                  id="adminSearch"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={`Search ${activeTab}`}
                  type="text"
                  value={search}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="adminStatus">
                  Status Filter
                </label>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 text-sm"
                  id="adminStatus"
                  onChange={(event) => setStatusFilter(event.target.value)}
                  value={statusFilter}
                >
                  {config.statuses.map((status) => (
                    <option key={status} value={status}>
                      {status === "all" ? "All statuses" : status}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="adminSort">
                  Sort
                </label>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 text-sm"
                  id="adminSort"
                  onChange={(event) => setSort(event.target.value)}
                  value={sort}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="az">A-Z</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={filterByDate}
                    onChange={(e) => setFilterByDate(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Filter list by selected date range</span>
                </label>
                <span className="text-slate-300 font-light text-sm select-none">|</span>
                <p className="text-xs text-slate-500">
                  Showing <span className="font-semibold text-slate-900">{filteredRows.length}</span> row(s)
                </p>
              </div>
              <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100" onClick={resetFilters} type="button">
                Reset Filters
              </button>
            </div>
          </section>

          {activeTab === "sentiment_watchlist" ? (
            <article className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
              <h4 className="text-sm font-bold text-blue-900">About Chat Sentiment Watch</h4>
              <p className="mt-1 text-xs text-blue-700 leading-relaxed">
                As an Administrator, you can monitor the communication health between Recruiters and independent Specialists.
                The system performs automatic NLP scans on chat threads to classify the mood into categories like <strong>High Satisfaction</strong>,
                <strong>Stable Collaboration</strong>, or <strong>Alert / Delay Risk</strong>.
                This live monitoring feed enables you to proactively check on low-sentiment contract threads and resolve client satisfaction issues before they escalate into formal disputes or payment holds.
              </p>
            </article>
          ) : null}

          {activeTab === "payouts" ? (
            <article className="mt-5 rounded-[2rem] border border-blue-150 bg-blue-50/30 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900">💰 System Payout Configurations</h4>
                <p className="text-xs text-slate-600 max-w-xl">
                  Choose how freelancers receive withdrawals from the platform. Manual payouts require you to transfer funds via bank/UPI and mark them as paid, while Direct Payouts automate transaction processing.
                </p>
              </div>
              <div className="shrink-0 flex bg-white border border-slate-200 p-1 rounded-2xl text-xs font-semibold shadow-xs">
                <button
                  type="button"
                  onClick={() => handleTogglePayoutSetting("manual")}
                  className={`px-4 py-2.5 rounded-xl transition cursor-pointer border-0 ${payoutSetting === "manual" ? "bg-blue-600 text-white shadow-sm font-extrabold" : "text-slate-500 hover:text-slate-900 bg-transparent"
                    }`}
                >
                  Manual Transfer
                </button>
                <button
                  type="button"
                  onClick={() => handleTogglePayoutSetting("razorpay")}
                  className={`px-4 py-2.5 rounded-xl transition cursor-pointer border-0 ${payoutSetting === "razorpay" ? "bg-blue-600 text-white shadow-sm font-extrabold" : "text-slate-500 hover:text-slate-900 bg-transparent"
                    }`}
                >
                  Razorpay Payouts (Direct)
                </button>
              </div>
            </article>
          ) : null}

          {feedback ? <p className="mt-4 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">{feedback}</p> : null}
          {isLoading ? <p className="mt-4 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">Loading {activeTab}...</p> : null}
          {isError ? <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">Failed to load {activeTab}.</p> : null}

          {!isLoading && !isError ? (
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full bg-white text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    {config.columns.map((column) => (
                      <th className="px-3 py-2 text-left font-semibold" key={column}>
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr className="border-t border-slate-100" key={row.id}>
                      {activeTab === "users" ? (
                        <>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-semibold text-slate-900">{row.name}</p>
                              {row.username &&
                                row.username.toUpperCase() !== row.userCode?.toUpperCase() &&
                                !row.username.toUpperCase().startsWith("FID") &&
                                !row.username.toUpperCase().startsWith("AID") && (
                                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-150 px-1.5 py-0.5 rounded-full lowercase">
                                    @{row.username}
                                  </span>
                                )}
                              {row.userCode && (
                                <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full font-mono uppercase">
                                  {row.userCode}
                                </span>
                              )}
                              {row.subscriptions?.length > 0 && (
                                <span className="rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider select-none animate-pulse">
                                  👑 PRO
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">ID: {row.id}</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${row.profileCompleted
                                  ? row.isVerified
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-slate-50 text-slate-500 border-slate-200"
                                }`}>
                                {row.profileCompleted
                                  ? row.isVerified
                                    ? "Verified"
                                    : "Pending Verification"
                                  : "Incomplete Profile"}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border ${row.role === "admin"
                                ? (row.username === "admin_freelnova" || row.email === "fn.freelnova@gmail.com" || row.userCode === "AID00000001")
                                  ? "bg-rose-100 text-rose-700 border-rose-200"
                                  : "bg-purple-100 text-purple-800 border-purple-200 font-extrabold"
                                : row.role === "recruiter"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}>
                              {row.role === "admin"
                                ? ((row.username === "admin_freelnova" || row.email === "fn.freelnova@gmail.com" || row.userCode === "AID00000001")
                                    ? "SUPER ADMIN"
                                    : (row.customRoleTitle || (row.adminRole === "CUSTOM" ? "MAIN ADMIN" : (row.adminRole ? row.adminRole.replace(/_/g, " ") : "MAIN ADMIN"))))
                                : row.role === "recruiter" ? "client" : row.role}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-col items-start gap-1">
                              <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${badgeClass(row.status)}`}>{row.status}</span>
                              {row.fineStatus && row.fineStatus !== "NONE" && (
                                <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase border ${
                                  row.fineStatus === "PAID"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : row.fineStatus === "PENDING"
                                      ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                                      : "bg-slate-50 text-slate-600 border-slate-200"
                                }`}>
                                  ₹{row.fineAmount || 5000} Fine ({row.fineStatus})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-slate-700">{row.joinedAt}</td>
                        </>
                      ) : null}

                      {activeTab === "projects" ? (
                        <>
                          <td className="px-3 py-2">
                            <p className="font-semibold text-slate-900">{row.title}</p>
                            <p className="text-xs text-slate-500">ID: {row.id}</p>
                          </td>
                          <td className="px-3 py-2 text-slate-700">{row.category}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full border px-2 py-1 text-xs font-semibold capitalize ${badgeClass(row.status)}`}>{row.status}</span>
                          </td>
                          <td className="px-3 py-2 text-slate-700">{row.budget}</td>
                          <td className="px-3 py-2 text-slate-700">{row.updatedAt}</td>
                        </>
                      ) : null}

                      {activeTab === "payments" ? (
                        <>
                          <td className="px-3 py-2">
                            <p className="font-semibold text-slate-900">{row.project}</p>
                            <p className="text-xs text-slate-500">ID: {row.id}</p>
                          </td>
                          <td className="px-3 py-2 text-slate-700">{row.amount}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full border px-2 py-1 text-xs font-semibold capitalize ${badgeClass(row.status)}`}>{row.status}</span>
                          </td>
                          <td className="px-3 py-2 text-slate-700">{row.method}</td>
                          <td className="px-3 py-2 text-slate-700">{row.createdAt}</td>
                        </>
                      ) : null}

                      {activeTab === "disputes" ? (
                        <>
                          <td className="px-3 py-2">
                            <p className="font-semibold text-slate-900">{row.project}</p>
                            <p className="text-xs text-slate-500">ID: {row.id}</p>
                          </td>
                          <td className="px-3 py-2 text-slate-700">{row.raisedBy}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full border px-2 py-1 text-xs font-semibold capitalize ${badgeClass(row.priority)}`}>{row.priority}</span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full border px-2 py-1 text-xs font-semibold capitalize ${badgeClass(row.status)}`}>{row.status}</span>
                          </td>
                          <td className="px-3 py-2 text-slate-700">{row.createdAt}</td>
                        </>
                      ) : null}

                      {activeTab === "system_logs" ? (
                        <>
                          <td className="px-3 py-2">
                            <span className={`rounded-full border px-2 py-1 text-xs font-semibold capitalize ${row.category === "payment" ? "border-blue-200 bg-blue-50 text-blue-700" :
                              row.category === "subscription" ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
                                "border-rose-200 bg-rose-50 text-rose-700"
                              }`}>
                              {row.category}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-900">{row.event}</td>
                          <td className="px-3 py-2 text-slate-700">{row.note}</td>
                          <td className="px-3 py-2 text-slate-600">{new Date(row.createdAt).toLocaleString()}</td>
                        </>
                      ) : null}

                      {activeTab === "sentiment_watchlist" ? (
                        <>
                          <td className="px-3 py-2 font-mono text-xs text-slate-500">
                            {row.id}
                          </td>
                          <td className="px-3 py-2">
                            <p className="font-semibold text-slate-900">{row.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{row.projectTitle}</p>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full border px-2 py-1 text-xs font-semibold capitalize ${row.color}`}>
                              {row.mood}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div className={`h-full ${row.score < 60 ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${row.score}%` }}></div>
                              </div>
                              <span className="font-semibold text-xs text-slate-700">{row.score}% Health</span>
                            </div>
                          </td>
                        </>
                      ) : null}

                      {activeTab === "payouts" ? (
                        <>
                          <td className="px-3 py-2 font-mono text-xs text-slate-500">
                            {row.id}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-slate-900">{row.freelancerName}</p>
                              <span className={`rounded-full px-2 py-0.5 text-[8px] font-extrabold uppercase border ${row.isVerified
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                                }`}>
                                {row.isVerified ? "Verified" : "Unverified"}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 font-black text-slate-900">
                            ₹{row.amount.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 font-semibold text-blue-700">
                            {row.payoutMethod}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-700 font-mono">
                            {row.details}
                          </td>
                          <td className="px-3 py-2 text-slate-500 font-semibold">
                            {row.requestedDate}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2.5 py-0.5 font-bold text-[9px] border uppercase ${row.status === "Completed" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700 animate-pulse"
                              }`}>
                              {row.status}
                            </span>
                          </td>
                        </>
                      ) : null}

                      <td className="px-3 py-2">
                        {activeTab === "payouts" ? (
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedDetailPaymentId(row.id)}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 font-semibold"
                            >
                              View
                            </button>
                            {row.status === "Pending Admin Approval" ? (
                              <button
                                type="button"
                                onClick={() => handleApprovePayout(row.id)}
                                className="rounded-md border border-emerald-300 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50 font-bold"
                              >
                                Mark as Paid
                              </button>
                            ) : null}
                          </div>
                        ) : ["system_logs", "sentiment_watchlist"].includes(activeTab) ? (
                          <span className="text-xs text-slate-400">Read-Only Audit</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            <button className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 font-semibold" onClick={() => handleAction("view", row.id)} type="button">
                              View
                            </button>
                            {activeTab === "users" && row.status !== "blocked" && (
                              <button className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50" onClick={() => handleAction("block", row.id)} type="button">
                                Block
                              </button>
                            )}
                            {activeTab === "users" && (
                              <button
                                className="rounded-md border border-amber-300 bg-amber-50/50 px-2 py-1 text-xs text-amber-800 hover:bg-amber-100 font-bold cursor-pointer"
                                onClick={() => {
                                  if (window.confirm(`Issue ₹5,000 Fine & Block user "${row.name}" for contact details sharing?`)) {
                                    handleAction("issue_fine", row.id);
                                  }
                                }}
                                type="button"
                              >
                                ⚠️ Issue ₹5k Fine
                              </button>
                            )}
                            {activeTab === "users" && (row.status !== "active" || row.fineStatus === "PENDING") && (
                              <button className="rounded-md border border-emerald-300 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50 font-bold" onClick={() => handleAction("unblock", row.id)} type="button">
                                Unblock / Waive
                              </button>
                            )}
                            {activeTab === "users" && (
                              row.isVerified ? (
                                <span className="rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-1 text-xs font-extrabold inline-flex items-center gap-1 select-none">
                                  ✓ Verified
                                </span>
                              ) : (
                                <button
                                  className="rounded-md border border-emerald-500 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-xs font-extrabold transition cursor-pointer shadow-xs"
                                  onClick={() => handleAction("verify", row.id)}
                                  type="button"
                                >
                                  ✓ Verify
                                </button>
                              )
                            )}
                            {activeTab !== "users" && (
                              <>
                                <button className="rounded-md border border-amber-300 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50" onClick={() => handleAction("flag", row.id)} type="button">
                                  Flag
                                </button>
                                <button className="rounded-md border border-blue-300 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50" onClick={() => handleAction("resolve", row.id)} type="button">
                                  Resolve
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {!isLoading && !isError && filteredRows.length === 0 ? (
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">No records found for current search/filter.</div>
          ) : null}
        </>
      )}

      {/* Premium Slide-over User Detail Analytics Drawer */}
      {selectedDetailUserId && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* Background backdrop blur */}
            <div
              onClick={() => setSelectedDetailUserId(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            ></div>

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-2xl transform bg-white shadow-2xl transition-all duration-300 ease-in-out border-l border-slate-100 flex flex-col">

                {/* Header */}
                <div className="border-b border-slate-100 px-6 py-5 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900" id="slide-over-title">
                      User Intelligence Sheet
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">Comprehensive profile & transaction audits</p>
                  </div>
                  <button
                    onClick={() => setSelectedDetailUserId(null)}
                    type="button"
                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                  >
                    <span className="sr-only">Close panel</span>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {detailsLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm font-semibold text-slate-500">Compiling user analytics record...</p>
                    </div>
                  ) : userDetails ? (
                    <>
                      {/* User Core Info Card */}
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-bold text-slate-900">{userDetails.user.name}</h3>
                            {userDetails.user.username &&
                              userDetails.user.username.toUpperCase() !== userDetails.user.userCode?.toUpperCase() &&
                              !userDetails.user.username.toUpperCase().startsWith("FID") &&
                              !userDetails.user.username.toUpperCase().startsWith("AID") && (
                                <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-150 px-2 py-0.5 rounded-full lowercase">
                                  @{userDetails.user.username}
                                </span>
                              )}
                            {userDetails.user.userCode && (
                              <span className="text-xs font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full font-mono uppercase">
                                {userDetails.user.userCode}
                              </span>
                            )}
                            {(() => {
                              const activeSub = userDetails.user.subscriptions?.find(
                                (sub) =>
                                  sub.status === "active" &&
                                  (!sub.expiresAt || new Date(sub.expiresAt) > new Date())
                              );
                              if (!activeSub) return null;
                              return (
                                <span className="rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 select-none animate-pulse">
                                  👑 PRO {activeSub.plan === "pro_yearly" ? "YEARLY" : "MONTHLY"}
                                </span>
                              );
                            })()}
                            {userDetails.user.isInternational && (
                              <span className="rounded-full bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 text-[10px] font-bold">
                                ✈️ Global
                              </span>
                            )}
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider border ${userDetails.user.role === "admin"
                              ? userDetails.user.adminRole && userDetails.user.adminRole !== "SUPER_ADMIN"
                                ? "bg-purple-100 text-purple-700 border-purple-200"
                                : "bg-rose-100 text-rose-700 border-rose-200"
                              : userDetails.user.role === "recruiter"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}>
                              {userDetails.user.role === "admin"
                                ? userDetails.user.adminRole ? userDetails.user.adminRole.replace(/_/g, " ") : "SUPER ADMIN"
                                : userDetails.user.role === "recruiter" ? "client" : userDetails.user.role}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 mt-1">{userDetails.user.email}</p>
                          <p className="text-xs text-slate-400 mt-2">
                            Member since {new Date(userDetails.user.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "long",
                              year: "numeric"
                            })}
                          </p>
                          <div className="mt-3">
                            {userDetails.user.isVerified ? (
                              <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider select-none">
                                ✓ Verified Profile
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  handleAction("verify", userDetails.user.id);
                                  setSelectedDetailUserId(null);
                                }}
                                className="rounded-xl px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider transition shadow-xs cursor-pointer border bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-emerald-200/50"
                              >
                                ✓ Approve & Verify Profile
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="sm:text-right">
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                            {userDetails.user.role === "recruiter" ? "Funds Sent Out" : "Earnings Gathered"}
                          </span>
                          <h4 className="text-2xl font-black text-slate-900 mt-1">
                            ₹{userDetails.totalVolume.toLocaleString()}
                          </h4>
                          <span className="text-[10px] text-slate-500 mt-0.5 block">Captured Volume</span>
                        </div>
                      </div>

                      {/* Onboarding Verification Details Card */}
                      {userDetails.user.profileCompleted && (
                        <div className="rounded-2xl border border-blue-100 bg-blue-50/20 p-5 space-y-3">
                          <div className="flex items-center justify-between border-b border-blue-100/50 pb-2">
                            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Onboarding Verification Details</h4>
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${userDetails.user.isVerified
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}>
                              {userDetails.user.isVerified ? "Verified" : "Pending Verification"}
                            </span>
                          </div>

                          <div className="grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
                            <div>
                              <p className="text-slate-500">Profile Category:</p>
                              <p className="font-bold text-slate-950 capitalize">{userDetails.user.category}</p>
                            </div>

                            <div>
                              <p className="text-slate-500">Phone Number:</p>
                              <p className="font-semibold text-slate-950">{userDetails.user.phone || "-"}</p>
                            </div>

                            {userDetails.user.isInternational ? (
                              <>
                                <div>
                                  <p className="text-slate-500">Passport / National ID:</p>
                                  <p className="font-semibold text-slate-950">
                                    {userDetails.user.passportOrNationalId || "-"}
                                  </p>
                                </div>

                                {userDetails.user.passportPhoto && (
                                  <div>
                                    <p className="text-slate-500">Passport Photo:</p>
                                    <a
                                      href={userDetails.user.passportPhoto}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200 hover:bg-blue-100 transition mt-1"
                                    >
                                      View Passport Photo
                                    </a>
                                  </div>
                                )}

                                <div>
                                  <p className="text-slate-500">Tax ID / SSN:</p>
                                  <p className="font-semibold text-slate-950">{userDetails.user.taxIdNumber || "-"}</p>
                                </div>

                                <div>
                                  <p className="text-slate-500">Global Timezone:</p>
                                  <p className="font-semibold text-slate-950">{userDetails.user.timezone || "-"}</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <p className="text-slate-500">Aadhaar Card:</p>
                                  <p className="font-semibold text-slate-950">
                                    {userDetails.user.aadhaarCard || "-"}
                                  </p>
                                </div>

                                {userDetails.user.aadhaarCardPhoto && (
                                  <div>
                                    <p className="text-slate-500">Aadhaar Photo:</p>
                                    <a
                                      href={userDetails.user.aadhaarCardPhoto}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200 hover:bg-blue-100 transition mt-1"
                                    >
                                      View Aadhaar Photo
                                    </a>
                                  </div>
                                )}

                                <div>
                                  <p className="text-slate-500">PAN Card:</p>
                                  <p className="font-semibold text-slate-950">{userDetails.user.panCard || "-"}</p>
                                </div>
                              </>
                            )}

                            {userDetails.user.category === "student" ? (
                              <>
                                <div>
                                  <p className="text-slate-500">School/College Name:</p>
                                  <p className="font-semibold text-slate-950">{userDetails.user.schoolOrCollege || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500">Result (Grade/Percentage):</p>
                                  <p className="font-semibold text-slate-950">{userDetails.user.schoolResult || "-"}</p>
                                </div>
                                <div className="sm:col-span-2">
                                  <p className="text-slate-500">Verification ID / Drive Link:</p>
                                  {userDetails.user.schoolIdCard ? (
                                    <a
                                      href={userDetails.user.schoolIdCard}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200 hover:bg-blue-100 transition mt-1"
                                    >
                                      View Verification Link (Drive / URL)
                                    </a>
                                  ) : (
                                    <p className="font-semibold text-slate-900 mt-1">-</p>
                                  )}
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <p className="text-slate-500">Company Name:</p>
                                  <p className="font-semibold text-slate-950">{userDetails.user.companyName || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500">Company / Employee ID:</p>
                                  <p className="font-semibold text-slate-950">{userDetails.user.companyId || "-"}</p>
                                </div>
                                <div className="sm:col-span-2">
                                  <p className="text-slate-500">Verification ID / Drive Link:</p>
                                  {userDetails.user.schoolIdCard ? (
                                    <a
                                      href={userDetails.user.schoolIdCard}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200 hover:bg-blue-100 transition mt-1"
                                    >
                                      View Verification Link (Drive / URL)
                                    </a>
                                  ) : (
                                    <p className="font-semibold text-slate-900 mt-1">-</p>
                                  )}
                                </div>
                              </>
                            )}

                            <div className="sm:col-span-2 border-t border-blue-100/50 pt-2 mt-1">
                              <p className="font-bold text-blue-900 uppercase tracking-wider text-[10px] mb-2">
                                Bank Payout Details {userDetails.user.isInternational && "(Global SWIFT/IBAN)"}
                              </p>
                              <div className="grid gap-2 grid-cols-3">
                                <div>
                                  <p className="text-[10px] text-slate-500">Bank Name</p>
                                  <p className="font-semibold text-slate-950">{userDetails.user.bankName || "-"}</p>
                                </div>
                                {userDetails.user.isInternational ? (
                                  <>
                                    <div className="col-span-2">
                                      <p className="text-[10px] text-slate-500">IBAN Account Number</p>
                                      <p className="font-semibold text-slate-950 truncate">{userDetails.user.ibanAccountNo || "-"}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-slate-500">SWIFT / BIC Code</p>
                                      <p className="font-semibold text-slate-950">{userDetails.user.swiftBic || "-"}</p>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div>
                                      <p className="text-[10px] text-slate-500">Account Number</p>
                                      <p className="font-semibold text-slate-950">{userDetails.user.bankAccountNo || "-"}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-slate-500">IFSC Code</p>
                                      <p className="font-semibold text-slate-950">{userDetails.user.bankIfsc || "-"}</p>
                                    </div>
                                  </>
                                )}
                              </div>
                              <div className="grid gap-2 grid-cols-2 border-t border-slate-100/50 pt-2 mt-2">
                                <div>
                                  <p className="text-[10px] text-slate-500">Account Holder Name</p>
                                  <p className="font-semibold text-slate-950">{userDetails.user.bankHolderName || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-500">UPI ID</p>
                                  <p className="font-semibold text-blue-600 font-mono">{userDetails.user.upiId || "-"}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 flex justify-between items-center gap-3">
                            <button
                              type="button"
                              onClick={async () => {
                                const targetUser = userDetails.user;
                                try {
                                  const res = await chatApi.initiateConversation({ recipientId: targetUser.id, title: "Account Compliance & Support" });
                                  const convId = res?.data?.conversation?.id;
                                  if (convId) {
                                    navigate(`/messages?chat=${convId}`);
                                    return;
                                  }
                                } catch (e) {
                                  console.error("Failed to initiate admin conversation:", e);
                                }
                                navigate("/messages");
                              }}
                              className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 cursor-pointer transition border-0 flex items-center gap-1.5"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              Message / Chat with User
                            </button>

                            {!userDetails.user.isVerified && (
                              <button
                                type="button"
                                onClick={() => {
                                  reviewMutation.mutate({ action: "verify", rowId: userDetails.user.id });
                                  setSelectedDetailUserId(null);
                                }}
                                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 cursor-pointer transition border-0"
                              >
                                Approve & Verify User
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Project Engagement Section */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Project Engagement
                        </h4>
                        <div className="border border-slate-100 rounded-2xl p-4 bg-white space-y-3 max-h-48 overflow-y-auto">
                          {userDetails.projects.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-4 text-center">No projects registered.</p>
                          ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                              {userDetails.projects.map((proj) => (
                                <div key={proj.id} className="border border-slate-50 bg-slate-50/20 rounded-xl p-3 space-y-1">
                                  <h5 className="text-xs font-bold text-slate-900 truncate">{proj.title}</h5>
                                  <div className="flex items-center justify-between mt-2 text-[10px]">
                                    <span className="text-slate-500 font-semibold">
                                      ₹{proj.budgetMin?.toLocaleString()} - {proj.budgetMax?.toLocaleString()}
                                    </span>
                                    <span className={`rounded-full px-2 py-0.5 font-bold uppercase tracking-wider ${proj.status === "completed" || proj.projectStatus === "completed"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-blue-50 text-blue-700"
                                      }`}>
                                      {proj.status || proj.projectStatus}
                                    </span>
                                  </div>
                                  {proj.applicationStatus && (
                                    <p className="text-[9px] text-slate-400 font-semibold">
                                      Application: {proj.applicationStatus}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Official Account Statement Section */}
                      <div className="space-y-4 border-t border-slate-100 pt-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                              Official Account Statement
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">Comprehensive audit of payouts & escrow activities</p>
                          </div>
                          <div className="relative max-w-xs w-full">
                            <input
                              type="text"
                              value={statementFilter}
                              onChange={(e) => setStatementFilter(e.target.value)}
                              placeholder="Filter statement by username/project..."
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-3 pr-8 py-2 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
                            />
                            {statementFilter && (
                              <button
                                onClick={() => setStatementFilter("")}
                                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-sm font-bold border-none outline-none bg-transparent cursor-pointer"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-xs">
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-150 text-left text-xs">
                              <thead className="bg-slate-50 font-bold text-slate-700">
                                <tr>
                                  <th className="px-4 py-3">Date & Time</th>
                                  <th className="px-4 py-3">Transaction Details</th>
                                  <th className="px-4 py-3">Type</th>
                                  <th className="px-4 py-3 text-right">Amount</th>
                                  <th className="px-4 py-3 text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredPayments.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                                      No payment transaction statement records found.
                                    </td>
                                  </tr>
                                ) : (
                                  filteredPayments.map((p) => {
                                    const isDebit = userDetails.user.role === "recruiter";
                                    const counterparty = isDebit ? p.freelancer : p.recruiter;
                                    const transactionDate = new Date(p.createdAt).toLocaleString("en-IN", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: true
                                    });

                                    return (
                                      <tr key={p.id} className="hover:bg-slate-50/50 transition">
                                        <td className="px-4 py-3 text-slate-500 font-medium whitespace-nowrap">
                                          {transactionDate}
                                        </td>
                                        <td className="px-4 py-3 space-y-0.5">
                                          <p className="font-bold text-slate-900 truncate max-w-xs">{p.project?.title || "Contract Milestone Payment"}</p>
                                          {counterparty ? (
                                            <p className="text-[10px] text-slate-500">
                                              {isDebit ? "Paid to: " : "Received from: "}
                                              <span className="font-semibold text-slate-800">{counterparty.name}</span>
                                              {counterparty.username && (
                                                <span className="text-blue-600 font-semibold ml-1">@{counterparty.username}</span>
                                              )}
                                            </p>
                                          ) : (
                                            <p className="text-[10px] text-slate-400">System Direct Escrow</p>
                                          )}
                                          <p className="text-[9px] text-slate-400 font-mono">TXN: {p.id}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                            isDebit 
                                              ? "bg-rose-50 text-rose-700 border border-rose-100" 
                                              : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                          }`}>
                                            {isDebit ? "DEBIT" : "CREDIT"}
                                          </span>
                                        </td>
                                        <td className={`px-4 py-3 text-right font-black text-sm whitespace-nowrap ${
                                          isDebit ? "text-slate-900" : "text-emerald-600"
                                        }`}>
                                          {isDebit ? "-" : "+"}₹{p.amount.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                            p.status === "captured"
                                              ? "bg-emerald-100 text-emerald-800"
                                              : p.status === "released"
                                                ? "bg-blue-100 text-blue-800"
                                                : "bg-amber-100 text-amber-800 animate-pulse"
                                          }`}>
                                            {p.status}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500 py-10 text-center">Failed to compile details for this user.</p>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 px-6 py-4 bg-slate-50 flex justify-end">
                  <button
                    onClick={() => setSelectedDetailUserId(null)}
                    type="button"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Close Sheet
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* Premium Slide-over Project Detail Analytics Drawer */}
      {selectedDetailProjectId && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* Background backdrop blur */}
            <div
              onClick={() => setSelectedDetailProjectId(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            ></div>

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-2xl transform bg-white shadow-2xl transition-all duration-300 ease-in-out border-l border-slate-100 flex flex-col">

                {/* Header */}
                <div className="border-b border-slate-100 px-6 py-5 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900" id="slide-over-title">
                      Project Intelligence Sheet
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">Comprehensive project audits, proposal bids, & escrow payments</p>
                  </div>
                  <button
                    onClick={() => setSelectedDetailProjectId(null)}
                    type="button"
                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition border-0 bg-transparent cursor-pointer"
                  >
                    <span className="sr-only">Close panel</span>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {projDetailsLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm font-semibold text-slate-500">Compiling project analytics record...</p>
                    </div>
                  ) : projectDetails ? (
                    <>
                      {/* Project Core Info Card */}
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/30 p-5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-150 pb-2.5">
                          <div>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-150 px-2 py-0.5 rounded-full uppercase font-mono">
                              {projectDetails.projectCode || "PROJECT"}
                            </span>
                            <h3 className="text-xl font-bold text-slate-900 mt-1">{projectDetails.title}</h3>
                          </div>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                            projectDetails.status === "completed" || projectDetails.status === "paid"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : projectDetails.status === "cancelled"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}>
                            {projectDetails.status}
                          </span>
                        </div>

                        <div className="grid gap-x-4 gap-y-3 text-xs sm:grid-cols-3 pt-1">
                          <div>
                            <p className="text-slate-500 font-semibold">Category</p>
                            <p className="font-bold text-slate-900 mt-0.5 capitalize">{projectDetails.category}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 font-semibold">Budget Range</p>
                            <p className="font-bold text-slate-900 mt-0.5">
                              {projectDetails.currency || "INR"} {projectDetails.budgetMin?.toLocaleString()} - {projectDetails.budgetMax?.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500 font-semibold">Posted Date</p>
                            <p className="font-bold text-slate-900 mt-0.5">
                              {new Date(projectDetails.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric"
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 text-xs space-y-1.5 border-t border-slate-100">
                          <p className="text-slate-500 font-semibold">Project Description</p>
                          <p className="text-slate-700 leading-relaxed bg-white border border-slate-100 rounded-xl p-3 max-h-32 overflow-y-auto">
                            {projectDetails.description}
                          </p>
                        </div>

                        {projectDetails.skills && projectDetails.skills.length > 0 && (
                          <div className="pt-2 text-xs space-y-1.5">
                            <p className="text-slate-500 font-semibold">Required Skills</p>
                            <div className="flex flex-wrap gap-1.5">
                              {projectDetails.skills.map((skill, idx) => (
                                <span key={idx} className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 capitalize">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Recruiter & Freelancer (Hired) Double Card */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        {/* Recruiter */}
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/20 p-4 space-y-2.5">
                          <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                            Client (Recruiter)
                          </h4>
                          {projectDetails.recruiter ? (
                            <div className="space-y-1">
                              <p className="font-bold text-slate-900 text-sm">{projectDetails.recruiter.name}</p>
                              {projectDetails.recruiter.companyName && (
                                <p className="text-xs text-slate-600 font-medium">{projectDetails.recruiter.companyName}</p>
                              )}
                              <p className="text-[10px] text-slate-400 font-mono">{projectDetails.recruiter.email}</p>
                              {projectDetails.recruiter.username && (
                                <p className="text-[10px] text-blue-600 font-semibold mt-1">@{projectDetails.recruiter.username}</p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">Unknown Recruiter</p>
                          )}
                        </div>

                        {/* Freelancer */}
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/20 p-4 space-y-2.5">
                          <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                            Assigned Talent (Freelancer)
                          </h4>
                          {projectDetails.freelancer ? (
                            <div className="space-y-1">
                              <p className="font-bold text-slate-900 text-sm">{projectDetails.freelancer.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{projectDetails.freelancer.email}</p>
                              {projectDetails.freelancer.username && (
                                <p className="text-[10px] text-blue-600 font-semibold mt-1">@{projectDetails.freelancer.username}</p>
                              )}
                              <p className="text-[10px] text-slate-500 font-medium mt-1">
                                Rating: <span className="font-bold text-slate-800">{projectDetails.freelancer.ratingAvg || 0}★</span>
                              </p>
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center pb-4">
                              <p className="text-xs text-slate-400 italic">No Freelancer Hired Yet</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Proposals / Bids List */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Bid & Proposal History ({projectDetails.applications?.length || 0})
                        </h4>
                        <div className="border border-slate-100 rounded-2xl p-4 bg-white space-y-3 max-h-64 overflow-y-auto">
                          {!projectDetails.applications || projectDetails.applications.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-4 text-center">No proposals submitted yet.</p>
                          ) : (
                            <div className="space-y-3 divide-y divide-slate-100">
                              {projectDetails.applications.map((app, idx) => (
                                <div key={app.id} className={`pt-3 ${idx === 0 ? "pt-0" : ""} space-y-2`}>
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <p className="text-xs font-bold text-slate-950">
                                        {app.freelancer?.name || "Freelancer"}
                                      </p>
                                      {app.freelancer?.username && (
                                        <p className="text-[10px] text-blue-600 font-semibold">@{app.freelancer.username}</p>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase border ${
                                        app.status === "selected"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : app.status === "shortlisted"
                                            ? "bg-blue-50 text-blue-700 border-blue-200"
                                            : "bg-slate-50 text-slate-500 border-slate-200"
                                      }`}>
                                        {app.status}
                                      </span>
                                      <p className="text-[10px] text-slate-500 mt-1">
                                        Applied: {new Date(app.createdAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 bg-slate-50/50 rounded-xl p-2.5 text-[11px]">
                                    <div>
                                      <span className="text-slate-500 font-semibold">Bid Amount: </span>
                                      <span className="font-bold text-slate-900">₹{app.bidAmount?.toLocaleString()}</span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-slate-500 font-semibold">Delivery: </span>
                                      <span className="font-bold text-slate-900">{app.deliveryDays} days</span>
                                    </div>
                                  </div>

                                  <div className="text-xs bg-slate-50/30 border border-slate-100 rounded-xl p-2.5 text-slate-700 leading-normal">
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Proposal Pitch</p>
                                    <p className="whitespace-pre-line text-[11px] font-medium">{app.proposal}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Escrow & Payment Records */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Platform Escrow & Payments
                        </h4>
                        <div className="border border-slate-100 rounded-2xl bg-white overflow-hidden shadow-xs">
                          <table className="min-w-full divide-y divide-slate-150 text-left text-xs">
                            <thead className="bg-slate-50 font-bold text-slate-700">
                              <tr>
                                <th className="px-4 py-2.5">Date</th>
                                <th className="px-4 py-2.5">Gateway Payment ID</th>
                                <th className="px-4 py-2.5 text-right">Amount</th>
                                <th className="px-4 py-2.5 text-center">Status</th>
                                <th className="px-4 py-2.5 text-center">Escrow</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
                              {!projectDetails.payments || projectDetails.payments.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400 italic">
                                    No financial payments recorded for this project.
                                  </td>
                                </tr>
                              ) : (
                                projectDetails.payments.map((pay) => (
                                  <tr key={pay.id} className="hover:bg-slate-50/50 transition">
                                    <td className="px-4 py-2.5 text-slate-500 font-semibold whitespace-nowrap">
                                      {new Date(pay.createdAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}
                                    </td>
                                    <td className="px-4 py-2.5 font-mono text-[10px] text-slate-600">
                                      {pay.gatewayPaymentId || "Pending Gateway"}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-black whitespace-nowrap">
                                      ₹{pay.amount?.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                                        pay.status === "captured"
                                          ? "bg-emerald-100 text-emerald-800"
                                          : pay.status === "failed"
                                            ? "bg-rose-100 text-rose-800"
                                            : "bg-amber-100 text-amber-800 animate-pulse"
                                      }`}>
                                        {pay.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                                        pay.escrowStatus === "released"
                                          ? "bg-blue-100 text-blue-800"
                                          : pay.escrowStatus === "held_in_escrow"
                                            ? "bg-amber-100 text-amber-850"
                                            : "bg-slate-100 text-slate-600"
                                      }`}>
                                        {pay.escrowStatus || "N/A"}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500 py-10 text-center">Failed to compile details for this project.</p>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 px-6 py-4 bg-slate-50 flex justify-end">
                  <button
                    onClick={() => setSelectedDetailProjectId(null)}
                    type="button"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Close Sheet
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {selectedDetailPaymentId && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity" 
              onClick={() => setSelectedDetailPaymentId(null)}
            />

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-3xl bg-slate-50 shadow-2xl flex flex-col h-full border-l border-slate-200">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-5 text-white flex items-center justify-between shrink-0">
                  <div>
                    <h2 className="text-lg font-bold">Platform Transaction Statement</h2>
                    <p className="text-xs text-blue-100 mt-0.5 font-medium">Official Digital Escrow Statement & Bank Audit</p>
                  </div>
                  <button
                    onClick={() => setSelectedDetailPaymentId(null)}
                    type="button"
                    className="text-white/80 hover:text-white text-xl font-bold bg-transparent border-0 cursor-pointer"
                  >
                    X
                  </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {(() => {
                    // Resolve the selected payment (either escrow payment or payout)
                    const mappedPaymentsList = mapRows("payments", data?.rows || []);
                    let selectedPayment = mappedPaymentsList.find(p => p.id === selectedDetailPaymentId);
                    
                    if (!selectedPayment) {
                      const payout = localPayoutRequests.find(p => p.id === selectedDetailPaymentId);
                      if (payout) {
                        selectedPayment = {
                          id: payout.id,
                          type: "admin_payout",
                          project: "Withdrawal Payout",
                          projectRelation: { title: "Withdrawal Payout", category: "Withdrawal" },
                          amount: `INR ${Number(payout.amount || 0).toLocaleString()}`,
                          amountNum: payout.amount,
                          status: payout.status === "Completed" ? "released" : "held_in_escrow",
                          escrowStatus: payout.status === "Completed" ? "released" : "held_in_escrow",
                          method: payout.payoutMethod || "Manual Transfer",
                          createdAt: payout.requestedDate ? new Date(payout.requestedDate).toISOString().slice(0, 10) : "",
                          createdTime: payout.requestedDate ? new Date(payout.requestedDate).toLocaleString() : "",
                          gatewayOrderId: "N/A",
                          gatewayPaymentId: payout.id,
                          freelancerId: {
                            name: payout.freelancerName,
                            role: "freelancer",
                            email: "No Email Provided"
                          },
                          recruiterId: {
                            name: "FreelNova Platform Admin",
                            role: "admin",
                            email: "admin@freelnova.com"
                          },
                          bankDetails: payout.details || "-"
                        };
                      }
                    }

                    if (!selectedPayment) {
                      return <p className="text-sm text-slate-500 py-10 text-center">Failed to compile details for this transaction.</p>;
                    }

                    // 1. Gather all client escrow payments
                    const allEscrowPayments = mappedPaymentsList.map(p => ({
                      id: p.id,
                      type: "escrow_payment",
                      date: p.createdAt ? new Date(p.createdAt) : new Date(),
                      dateStr: p.createdAt || "",
                      timeStr: p.createdTime || "",
                      fromName: p.recruiterId?.name || "Client",
                      fromEmail: p.recruiterId?.email || "",
                      fromUsername: p.recruiterId?.username || "",
                      toName: p.freelancerId?.name || "Freelancer",
                      toEmail: p.freelancerId?.email || "",
                      toUsername: p.freelancerId?.username || "",
                      projectTitle: p.projectRelation?.title || p.project || "Project Service",
                      details: `Gateway Order: ${p.gatewayOrderId || "-"} | Payment ID: ${p.gatewayPaymentId || "-"}`,
                      amount: Number(p.amountNum || 0),
                      amountStr: `+₹${Number(p.amountNum || 0).toLocaleString()}`,
                      amountColor: "text-emerald-700 font-extrabold",
                      status: p.status,
                      bankDetails: `Razorpay: ${p.gatewayPaymentId || p.gatewayOrderId || "Deposit"}`
                    }));

                    // 2. Gather all admin payouts
                    const allPayouts = localPayoutRequests.map(p => ({
                      id: p.id,
                      type: "admin_payout",
                      date: p.requestedDate ? new Date(p.requestedDate) : new Date(),
                      dateStr: p.requestedDate ? new Date(p.requestedDate).toISOString().slice(0, 10) : "",
                      timeStr: p.requestedDate ? new Date(p.requestedDate).toLocaleString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true }) : "",
                      fromName: "FreelNova Admin",
                      fromEmail: "admin@freelnova.com",
                      fromUsername: "admin",
                      toName: p.freelancerName || "Freelancer",
                      toEmail: "",
                      toUsername: "",
                      projectTitle: "Withdrawal Payout",
                      details: `Payout Method: ${p.payoutMethod || "-"} | Details: ${p.details || "-"}`,
                      amount: Number(p.amount || 0),
                      amountStr: `-₹${Number(p.amount || 0).toLocaleString()}`,
                      amountColor: "text-rose-700 font-extrabold",
                      status: p.status === "Completed" ? "released" : "held_in_escrow",
                      bankDetails: `${p.payoutMethod || "Bank"}: ${p.details || "-"}`
                    }));

                    // Combine and sort chronologically/newest first
                    const combinedLedger = [...allEscrowPayments, ...allPayouts].sort((a, b) => b.date - a.date);

                    // Group combined by month-year
                    const groupedLedger = {};
                    combinedLedger.forEach(entry => {
                      const monthYear = entry.date.toLocaleString("en-US", { month: "long", year: "numeric" });
                      if (!groupedLedger[monthYear]) {
                        groupedLedger[monthYear] = [];
                      }
                      groupedLedger[monthYear].push(entry);
                    });

                    const sortedMonths = Object.keys(groupedLedger).sort((a, b) => new Date(b) - new Date(a));

                    return (
                      <>
                        {/* Transaction Receipt Card */}
                        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
                            <div>
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-150 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                {selectedPayment.type === "admin_payout" ? "Payout ID" : "Escrow ID"}: {selectedPayment.id}
                              </span>
                              <h3 className="text-lg font-extrabold text-slate-900 mt-2">
                                {selectedPayment.projectRelation?.title || selectedPayment.project}
                              </h3>
                            </div>
                            <div className="sm:text-right">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Transaction Amount</span>
                              <h3 className={`text-2xl font-black mt-0.5 ${selectedPayment.type === "admin_payout" ? "text-rose-600" : "text-slate-900"}`}>
                                {selectedPayment.type === "admin_payout" ? "-" : ""}{selectedPayment.amount}
                              </h3>
                            </div>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-3 text-xs pt-1">
                            <div>
                              <p className="text-slate-500 font-semibold">Payment Status</p>
                              <span className={`inline-block rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border mt-1 ${
                                selectedPayment.status === "captured" || selectedPayment.status === "released" || selectedPayment.status === "Completed"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : selectedPayment.status === "failed"
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                              }`}>
                                {selectedPayment.status}
                              </span>
                            </div>

                            <div>
                              <p className="text-slate-500 font-semibold">Escrow / Payout Status</p>
                              <span className={`inline-block rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border mt-1 ${
                                selectedPayment.escrowStatus === "released" || selectedPayment.status === "Completed"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : selectedPayment.escrowStatus === "held_in_escrow"
                                    ? "bg-amber-50 text-amber-850 border-amber-200"
                                    : "bg-slate-50 text-slate-600 border-slate-200"
                              }`}>
                                {selectedPayment.escrowStatus || "Pending"}
                              </span>
                            </div>

                            <div>
                              <p className="text-slate-500 font-semibold">Date & Time</p>
                              <p className="font-bold text-slate-900 mt-1">{selectedPayment.createdTime}</p>
                            </div>
                          </div>

                          {/* Bank & Gateway Identifiers */}
                          <div className="grid gap-4 sm:grid-cols-2 text-xs border-t border-slate-100 pt-3">
                            <div>
                              <p className="text-slate-500 font-semibold">Gateway / Channel</p>
                              <p className="font-mono text-slate-800 font-semibold mt-0.5">
                                {selectedPayment.method || selectedPayment.payoutMethod || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500 font-semibold">Bank details / Ref Code</p>
                              <p className="font-mono text-slate-800 font-semibold mt-0.5">
                                {selectedPayment.bankDetails || selectedPayment.gatewayPaymentId || "-"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Recruiter & Freelancer Double Info Card */}
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-2">
                            <span className="text-[9px] font-extrabold text-blue-700 bg-blue-50/50 px-2 py-0.5 rounded uppercase tracking-wider">
                              Paid By (Client / Sender)
                            </span>
                            {selectedPayment.recruiterId ? (
                              <div className="space-y-0.5 pt-1">
                                <p className="text-sm font-bold text-slate-900">{selectedPayment.recruiterId.name}</p>
                                {selectedPayment.recruiterId.username && (
                                  <p className="text-xs text-blue-600 font-semibold">@{selectedPayment.recruiterId.username}</p>
                                )}
                                <p className="text-[10px] text-slate-400 font-mono">{selectedPayment.recruiterId.email}</p>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic font-semibold">Platform Pool / Escrow</p>
                            )}
                          </div>

                          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-2">
                            <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50/50 px-2 py-0.5 rounded uppercase tracking-wider">
                              Received By (Freelancer / Recipient)
                            </span>
                            {selectedPayment.freelancerId ? (
                              <div className="space-y-0.5 pt-1">
                                <p className="text-sm font-bold text-slate-900">{selectedPayment.freelancerId.name}</p>
                                {selectedPayment.freelancerId.username && (
                                  <p className="text-xs text-blue-600 font-semibold">@{selectedPayment.freelancerId.username}</p>
                                )}
                                <p className="text-[10px] text-slate-400 font-mono">{selectedPayment.freelancerId.email || "No Email Provided"}</p>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">No Freelancer Hired Yet</p>
                            )}
                          </div>
                        </div>

                      </>
                    );
                  })()}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 px-6 py-4 bg-slate-50 flex justify-end">
                  <button
                    onClick={() => setSelectedDetailPaymentId(null)}
                    type="button"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Close Statement
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}
    </section>
  );
}

export default AdminPanel;


