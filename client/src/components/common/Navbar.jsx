import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { NavLink, useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes.js";
import { authApi } from "../../api/auth.api.js";
import { useNotificationsQuery, useMarkNotificationReadMutation, useMarkAllNotificationsReadMutation, useBroadcastAnnouncementMutation, useRecipientsQuery } from "../../hooks/useNotifications.js";
import { useAuth } from "../../hooks/useAuth.js";
import { getDisplayUsername, getDisplayUserCode } from "../../utils/userHandle.js";
import BrandMark from "./BrandMark.jsx";
import Container from "./Container.jsx";


const roleMenus = {
  guest: [
    { label: "FreelNova Pro", to: ROUTES.PRO },
    { label: "Login", to: ROUTES.LOGIN },
    { label: "Register", to: ROUTES.REGISTER, cta: true },
  ],
  freelancer: [
    { label: "FreelNova Pro", to: ROUTES.PRO },
    { label: "Find Work", to: ROUTES.PROJECTS },
    { label: "Dashboard", to: ROUTES.DASHBOARD },
  ],
  recruiter: [
    { label: "FreelNova Pro", to: ROUTES.PRO },
    { label: "Find Talent", to: ROUTES.PROJECTS },
    { label: "Dashboard", to: ROUTES.DASHBOARD },
  ],
  admin: [
    { label: "Dashboard", to: ROUTES.DASHBOARD },
    { label: "Super Admin Panel", to: ROUTES.ADMIN },
    { label: "Statement", to: ROUTES.STATEMENT },
  ],
};

function linkClass({ isActive }) {
  return `rounded-xl px-3 py-2 text-sm font-medium transition ${isActive ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
    }`;
}

function HeaderIcon({ children, badge, onClick, to, title }) {
  const content = (
    <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
      {children}
      {badge ? (
        <span className="absolute right-1 top-1 min-w-[18px] rounded-full bg-blue-600 px-1 text-center text-[10px] font-bold text-white">
          {badge}
        </span>
      ) : null}
    </span>
  );

  if (to) {
    return (
      <NavLink className="inline-flex" title={title} to={to}>
        {content}
      </NavLink>
    );
  }

  return (
    <button className="inline-flex" onClick={onClick} title={title} type="button">
      {content}
    </button>
  );
}

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const markReadMutation = useMarkNotificationReadMutation();
  const markAllReadMutation = useMarkAllNotificationsReadMutation();
  const broadcastMutation = useBroadcastAnnouncementMutation();
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastFeedback, setBroadcastFeedback] = useState("");
  const [broadcastTargetType, setBroadcastTargetType] = useState("ALL");
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [recipientSearchQuery, setRecipientSearchQuery] = useState("");

  const { data: recipientSearchResults = [], isLoading: isSearchingRecipients } = useRecipientsQuery({
    q: recipientSearchQuery,
    enabled: isBroadcastModalOpen && broadcastTargetType === "SELECTED",
  });
  const [readMocks, setReadMocks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("sb_read_mocks") || "[]");
    } catch {
      return [];
    }
  });

  const [copiedInviteLink, setCopiedInviteLink] = useState(false);

  const { data: notificationData } = useNotificationsQuery({
    limit: 8,
    enabled: isAuthenticated,
  });

  const isSuperAdminUser =
    user?.role === "admin" ||
    user?.adminRole === "SUPER_ADMIN" ||
    String(user?.userCode || "").startsWith("AID") ||
    user?.email === "fn.freelnova@gmail.com";

  const [allReadOptimistic, setAllReadOptimistic] = useState(false);

  const notificationsList = useMemo(() => {
    const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let list = (notificationData?.items || []).map(n => ({
      ...n,
      isRead: allReadOptimistic ? true : n.isRead,
      read: allReadOptimistic ? true : (n.read || n.isRead),
    }));

    // Exclude notifications older than 7 days
    list = list.filter((n) => {
      const createdMs = n.createdAt ? new Date(n.createdAt).getTime() : Date.now();
      return createdMs >= sevenDaysAgoMs;
    });

    if (isSuperAdminUser) {
      list = list.filter((n) => n.type !== "SYSTEM_BROADCAST" && n.entityType !== "BROADCAST");
    }
    if (isAuthenticated && user?.isPro && user?.role === "freelancer") {
      list.unshift(
        {
          id: "mock_view_1",
          title: "Application View",
          message: "Hiring Manager viewed your profile for 'React Frontend Gig'",
          read: allReadOptimistic || readMocks.includes("mock_view_1"),
          isRead: allReadOptimistic || readMocks.includes("mock_view_1"),
          createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        },
        {
          id: "mock_view_2",
          title: "Application Activity",
          message: "Client opened your cover letter for 'Node REST API' project",
          read: allReadOptimistic || readMocks.includes("mock_view_2"),
          isRead: allReadOptimistic || readMocks.includes("mock_view_2"),
          createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        }
      );
    }
    return list;
  }, [notificationData, isAuthenticated, user, readMocks, isSuperAdminUser, allReadOptimistic]);

  const unreadCount = useMemo(() => {
    return notificationsList.filter((n) => !n.read && !n.isRead).length;
  }, [notificationsList]);

  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const checkUnreadMessages = () => {
      try {
        let count = 0;
        const currentUserId = user.id;
        const chatReqs = JSON.parse(localStorage.getItem("sb_chat_requests") || "[]");
        const activeChat = localStorage.getItem(`sb_user_active_chat_${currentUserId}`);

        chatReqs.forEach((req) => {
          const msgs = JSON.parse(localStorage.getItem(`sb_chat_msgs_${req.id}`) || "[]");
          if (msgs.length > 0) {
            const lastMsg = msgs[msgs.length - 1];
            if (lastMsg.senderId !== currentUserId && activeChat !== req.id) {
              const readKey = `sb_chat_read_${req.id}_${currentUserId}`;
              const lastReadId = localStorage.getItem(readKey);
              if (lastReadId !== lastMsg.id) {
                count++;
              }
            }
          }
        });

        setUnreadMessagesCount(count);
      } catch (e) {}
    };

    checkUnreadMessages();
    window.addEventListener("storage", checkUnreadMessages);
    const interval = setInterval(checkUnreadMessages, 1000);
    return () => {
      window.removeEventListener("storage", checkUnreadMessages);
      clearInterval(interval);
    };
  }, [isAuthenticated, user]);

  const [selectedNotification, setSelectedNotification] = useState(null);

  const handleMarkAllRead = () => {
    const nextRead = [...readMocks, "mock_view_1", "mock_view_2"];
    setReadMocks(nextRead);
    localStorage.setItem("sb_read_mocks", JSON.stringify(nextRead));
    setAllReadOptimistic(true);
    markAllReadMutation.mutate();
  };

  const handleNotificationClick = (notif) => {
    setSelectedNotification(notif);
    setIsNotificationsOpen(false);

    const id = notif.id;
    if (String(id).startsWith("mock_")) {
      const nextRead = [...readMocks];
      if (!nextRead.includes(id)) {
        nextRead.push(id);
      }
      setReadMocks(nextRead);
      localStorage.setItem("sb_read_mocks", JSON.stringify(nextRead));
    } else {
      markReadMutation.mutate(id);
    }
  };

  const role = user?.role ?? "guest";
  const menu = useMemo(() => {
    if (role === "admin") {
      const isPrimaryOwner = user?.email === "fn.freelnova@gmail.com" || (user?.adminRole === "SUPER_ADMIN" && !user?.customRoleTitle);
      const adminTitle = isPrimaryOwner
        ? "Super Admin"
        : (user?.customRoleTitle || (user?.adminRole === "CUSTOM" ? "Main Admin" : (user?.adminRole ? user.adminRole.replace(/_/g, " ") : "Main Admin")));
      return [
        { label: "Dashboard", to: ROUTES.DASHBOARD },
        { label: `${adminTitle} Panel`, to: ROUTES.ADMIN },
        { label: "Statement", to: ROUTES.STATEMENT },
      ];
    }
    return roleMenus[role] ?? roleMenus.guest;
  }, [role, user]);
  const initials = (user?.name || user?.email || "S").trim().charAt(0).toUpperCase();

  const quickMenu = useMemo(() => {
    const items = [
      { label: "Profile", to: ROUTES.PROFILE },
      { label: "Messages", to: ROUTES.MESSAGES },
      { label: "Dashboard", to: ROUTES.DASHBOARD },
    ];

    if (role === "recruiter") {
      items.push(
        { label: "Project Autopilot", to: ROUTES.PROJECT_AUTOPILOT },
        { label: "Workforce Workspace", to: ROUTES.COMPANY_WORKSPACE },
        { label: "Security Center", to: ROUTES.SECURITY_CENTER },
        { label: "Edit Profile", to: ROUTES.EDIT_PROFILE }
      );
    } else if (role === "admin") {
      const isPrimaryOwner = user?.email === "fn.freelnova@gmail.com" || (user?.adminRole === "SUPER_ADMIN" && !user?.customRoleTitle);
      const adminTitle = isPrimaryOwner
        ? "Super Admin"
        : (user?.customRoleTitle || (user?.adminRole === "CUSTOM" ? "Main Admin" : (user?.adminRole ? user.adminRole.replace(/_/g, " ") : "Main Admin")));
      items.push(
        { label: `${adminTitle} Panel`, to: ROUTES.ADMIN },
        { label: "Statement", to: ROUTES.STATEMENT },
        { label: "Security Center", to: ROUTES.SECURITY_CENTER },
        { label: "Edit Profile", to: ROUTES.EDIT_PROFILE }
      );
    } else {
      // Freelancer role or guest default
      items.push(
        { label: "Career Autopilot", to: ROUTES.CAREER_AUTOPILOT },
        { label: "Income OS", to: ROUTES.INCOME_OS },
        { label: "Business OS", to: ROUTES.BUSINESS_OS },
        { label: "Security Center", to: ROUTES.SECURITY_CENTER },
        { label: "Edit Profile", to: ROUTES.EDIT_PROFILE }
      );
    }

    return items;
  }, [role, user]);

  // 1. Clear local auth state immediately — user is logged out right now,
  //    no matter what the server responds with.
  // 2. Fire API call in background as best-effort server cleanup.
  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    navigate(ROUTES.LOGIN, { replace: true });
    // Fire-and-forget — swallows any 401/network error silently.
    authApi.logout().catch(() => { });
  };


  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = search.trim();

    if (query) {
      navigate(`${ROUTES.PROJECTS}?search=${encodeURIComponent(query)}`);
      return;
    }

    navigate(ROUTES.PROJECTS);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <Container className="py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="hidden min-w-0 items-center gap-1.5 md:flex md:flex-1 max-w-2xl">
            <BrandMark className="flex-shrink-0" compact />
            <form className="ml-4 flex w-full items-center gap-2" onSubmit={handleSearchSubmit}>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="What service are you looking for today?"
                type="text"
                value={search}
              />
              <button
                className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-sm shrink-0"
                type="submit"
              >
                Search
              </button>
            </form>
          </div>

          <div className="md:hidden">
            <BrandMark className="flex-shrink-0" compact />
          </div>

          <button
            aria-label="Toggle menu"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 p-2 text-slate-700 transition hover:bg-slate-100 md:hidden"
            onClick={() => setIsMenuOpen((value) => !value)}
            type="button"
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </button>

          <div className="hidden items-center gap-2 md:flex">
            {menu.map((item) => {
              if (item.label === "Register") {
                return (
                  <NavLink
                    className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-sm shadow-blue-500/20"
                    key={item.label}
                    to={item.to}
                  >
                    {item.label}
                  </NavLink>
                );
              }
              if (item.label === "Login") {
                return (
                  <NavLink
                    className="rounded-2xl border border-blue-200 bg-blue-50/45 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 hover:text-blue-800"
                    key={item.label}
                    to={item.to}
                  >
                    {item.label}
                  </NavLink>
                );
              }
              if (item.label === "FreelNova Pro") {
                return (
                  <NavLink
                    className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:from-blue-100 hover:to-indigo-100"
                    key={item.label}
                    to={item.to}
                  >
                    {item.label}
                  </NavLink>
                );
              }
              return (
                <NavLink className={linkClass} key={item.label} to={item.to}>
                  {item.label}
                </NavLink>
              );
            })}

            {isAuthenticated ? (
              <>
                <div className="relative">
                  <HeaderIcon
                    badge={unreadCount > 0 ? unreadCount : ""}
                    title="Notifications"
                    onClick={() => {
                      setIsNotificationsOpen(!isNotificationsOpen);
                      setIsUserMenuOpen(false);
                    }}
                  >
                    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <path d="M12 4.5a4 4 0 0 0-4 4v2.2c0 .6-.2 1.2-.6 1.7L6 14.5h12l-1.4-2.1a3 3 0 0 1-.6-1.7V8.5a4 4 0 0 0-4-4ZM10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                    </svg>
                  </HeaderIcon>

                  {isNotificationsOpen && (
                    <div className="absolute right-0 top-12 w-80 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_24px_70px_rgba(15,23,42,0.16)] text-slate-700 z-[100]">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 px-1">
                        <div className="flex items-center gap-2">
                          <img src="https://cdn-icons-png.flaticon.com/128/9783/9783934.png" alt="Notifications" className="h-4 w-4 object-contain shrink-0" />
                          <p className="font-bold text-sm">Notifications</p>
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {notificationsList.length > 0 ? (
                          notificationsList.map((notif) => (
                            <div
                              key={notif.id}
                              onClick={() => {
                                handleNotificationClick(notif);
                              }}
                              className={`p-2.5 rounded-xl text-xs cursor-pointer transition border ${notif.read
                                  ? "bg-white border-transparent hover:bg-slate-50"
                                  : "bg-blue-50/50 border-blue-100/40 hover:bg-blue-50 font-medium"
                                }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <img src="https://cdn-icons-png.flaticon.com/128/9783/9783934.png" alt="Notice" className="h-3.5 w-3.5 object-contain shrink-0" />
                                  <p className="font-bold text-slate-900 leading-snug truncate">{(notif.title || "").replace(/📢/g, "").replace(/\uD83D\uDCEF/g, "").trim()}</p>
                                </div>
                                <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap shrink-0">
                                  {notif.time || "Just now"}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 mt-0.5 leading-normal line-clamp-2">
                                {notif.message || notif.desc || "Click to view full announcement details."}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-slate-400 font-medium">
                            No notifications yet
                          </div>
                        )}
                      </div>

                      {/* Super Admin Broadcast Trigger Button */}
                      {user?.role === "admin" && (
                        <div className="border-t border-slate-100 pt-2.5 mt-2">
                          <button
                            onClick={() => {
                              setIsNotificationsOpen(false);
                              setIsBroadcastModalOpen(true);
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition border-0 cursor-pointer"
                          >
                            <img src="https://cdn-icons-png.flaticon.com/128/9783/9783934.png" alt="" className="h-4 w-4 object-contain shrink-0 brightness-0 invert" />
                            <span>Send Notification / Announcement</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Direct Messages Shortcut */}
                <HeaderIcon badge={unreadMessagesCount > 0 ? unreadMessagesCount : null} title="Messages" to={ROUTES.MESSAGES}>
                  <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <path d="M7 8h10M7 12h7m-7 8 3-3h7a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                  </svg>
                </HeaderIcon>

                <div className="relative ml-1">
                  <button
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ring-2 transition hover:brightness-110 relative ${user?.isPro ? "bg-blue-600 ring-blue-300" : "bg-amber-600 ring-white"
                      }`}
                    onClick={() => setIsUserMenuOpen((value) => !value)}
                    type="button"
                  >
                    {initials}
                    {user?.isPro && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 border border-white text-[8px] text-slate-900 font-extrabold shadow-xs animate-bounce" title="Pro Account">
                        👑
                      </span>
                    )}
                  </button>

                  {isUserMenuOpen ? (
                    <div className="absolute right-0 top-12 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.16)] z-[100]">
                      <div className="border-b border-slate-100 px-2 pb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-slate-900">{user?.name || "FreelNova user"}</p>
                          <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[9px] font-extrabold font-mono tracking-wider select-none">
                            {getDisplayUserCode(user)}
                          </span>
                          {(() => {
                            if (user?.adminRole || user?.role === "admin") {
                              const roleKey = user?.adminRole || "SUPER_ADMIN";
                              const roleMap = {
                                SUPER_ADMIN: { label: "SUPER ADMIN", style: "bg-rose-100 text-rose-700 border-rose-200 font-extrabold" },
                                FINANCE_ADMIN: { label: "FINANCE ADMIN", style: "bg-purple-100 text-purple-800 border-purple-200 font-extrabold" },
                                SUPPORT_STAFF: { label: "SUPPORT STAFF", style: "bg-purple-100 text-purple-800 border-purple-200 font-extrabold" },
                                MODERATOR: { label: "MODERATOR", style: "bg-purple-100 text-purple-800 border-purple-200 font-extrabold" },
                                DEVELOPER: { label: "DEVELOPER", style: "bg-purple-100 text-purple-800 border-purple-200 font-extrabold" },
                                CUSTOM: { label: "STAFF ADMIN", style: "bg-purple-100 text-purple-800 border-purple-200 font-extrabold" },
                              };
                              const badge = roleMap[roleKey] || roleMap.SUPER_ADMIN;
                              const displayLabel = user?.customRoleTitle || (user?.adminRole === "CUSTOM" ? "MAIN ADMIN" : badge.label);
                              return (
                                <span className={`rounded-full px-2 py-0.5 text-[8px] uppercase tracking-wider border select-none ${badge.style}`}>
                                  {displayLabel}
                                </span>
                              );
                            }

                            if (user?.role) {
                              return (
                                <span className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider border select-none ${
                                  user.role === "recruiter"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}>
                                  {user.role === "recruiter" ? "client" : user.role}
                                </span>
                              );
                            }
                            return null;
                          })()}
                          {user?.isPro && (
                            <span className="rounded-md bg-gradient-to-r from-blue-500 to-blue-600 text-white border border-blue-200/50 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider select-none">
                              PRO
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <p className="text-xs font-bold text-blue-600">@{getDisplayUsername(user)}</p>
                          {(() => {
                            const proUsers = JSON.parse(localStorage.getItem("sb_pro_user_ids") || "[]");
                            const isUserPro = user?.isPro || (user?.subscriptions && user?.subscriptions.length > 0) || (user?.id && proUsers.includes(user.id)) || (localStorage.getItem("fn_pro_active") === "true");
                            return isUserPro ? (
                              <img
                                src="/badges/pro_verified.png"
                                alt="Pro Verified"
                                className="h-3.5 w-3.5 object-contain inline-block shrink-0"
                                title="FreelNova Pro Verified Active Member"
                              />
                            ) : null;
                          })()}
                        </div>
                      </div>
                      <div className="py-2">
                        {quickMenu.map((item) => (
                          <NavLink
                            className="block rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                            key={item.label}
                            onClick={() => setIsUserMenuOpen(false)}
                            to={item.to}
                          >
                            {item.label}
                          </NavLink>
                        ))}
                      </div>
                      <div className="border-t border-slate-100 pt-2">
                        <button
                          className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          onClick={handleLogout}
                          type="button"
                        >
                          Sign out

                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </div>

        {isMenuOpen ? (
          <div className="mt-3 flex flex-col gap-2 border-t border-slate-200 pt-3 md:hidden">
            <form className="mb-2 flex w-full items-center gap-2" onSubmit={(e) => { setIsMenuOpen(false); handleSearchSubmit(e); }}>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search services, skills, or projects..."
                type="text"
                value={search}
              />
              <button
                className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 shrink-0"
                type="submit"
              >
                Search
              </button>
            </form>
            {menu.map((item) =>
              item.cta ? (
                <NavLink
                  className="rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 text-center"
                  key={item.label}
                  onClick={() => setIsMenuOpen(false)}
                  to={item.to}
                >
                  {item.label}
                </NavLink>
              ) : (
                <NavLink className={linkClass} key={item.label} onClick={() => setIsMenuOpen(false)} to={item.to}>
                  {item.label}
                </NavLink>
              ),
            )}
            {isAuthenticated ? (
              <div className="border-t border-slate-100 pt-2 space-y-1">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl mb-1">
                  <div className="h-8 w-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{user?.name || "User"}</p>
                    <p className="text-[10px] text-blue-600 font-semibold truncate">@{getDisplayUsername(user)}</p>
                  </div>
                </div>
                <NavLink className={linkClass} onClick={() => setIsMenuOpen(false)} to={ROUTES.MESSAGES}>
                  💬 Messages
                </NavLink>
                <NavLink className={linkClass} onClick={() => setIsMenuOpen(false)} to={ROUTES.PROFILE}>
                  👤 My Profile & Settings
                </NavLink>
                <button
                  className="w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 mt-2 text-left"
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  type="button"
                >
                  🚪 Sign out
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        {message ? <p className="mt-2 text-xs text-slate-600">{message}</p> : null}
      </Container>

      {/* Super Admin Targeted Announcement & Notification Modal (Portal to body) */}
      {isBroadcastModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 animate-fadeIn my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100 shadow-xs shrink-0">
                  <img src="https://cdn-icons-png.flaticon.com/128/9783/9783934.png" alt="Send System Notification" className="h-6 w-6 object-contain" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-snug">Send System Notification</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Super Admin Targeted Announcement & Direct Messaging</p>
                </div>
              </div>
              <button
                onClick={() => { setIsBroadcastModalOpen(false); setBroadcastFeedback(""); }}
                className="text-slate-400 hover:text-slate-700 font-bold text-xl cursor-pointer border-0 bg-transparent p-1"
              >
                ✕
              </button>
            </div>

            {broadcastFeedback && (
              <div className={`p-3.5 rounded-xl border text-xs font-bold ${
                broadcastFeedback.startsWith("✅")
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : broadcastFeedback.startsWith("⚠️")
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : broadcastFeedback.startsWith("❌")
                  ? "bg-rose-50 border-rose-200 text-rose-900"
                  : "bg-blue-50 border-blue-200 text-blue-900"
              }`}>
                {broadcastFeedback}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const titleToSend = broadcastTitle.trim() || "FreelNova Platform Notice";
                const messageToSend = broadcastMessage.trim();
                if (!messageToSend) {
                  setBroadcastFeedback("⚠️ Please write notification message details before dispatching.");
                  return;
                }

                if (broadcastTargetType === "SELECTED" && selectedRecipients.length === 0) {
                  setBroadcastFeedback("⚠️ Please search and select at least one recipient user.");
                  return;
                }

                const recipientIds = selectedRecipients.map((u) => u.id);

                setBroadcastFeedback("⏳ Dispatching notification to target audience...");

                broadcastMutation.mutate(
                  {
                    title: titleToSend,
                    message: messageToSend,
                    targetType: broadcastTargetType,
                    recipientIds,
                  },
                  {
                    onSuccess: (res) => {
                      const count = res?.data?.data?.totalRecipients ?? selectedRecipients.length;
                      setBroadcastFeedback(`✅ Notification sent successfully to ${count} user(s)!`);
                      setBroadcastTitle("");
                      setBroadcastMessage("");
                      setSelectedRecipients([]);
                      setRecipientSearchQuery("");
                      setBroadcastTargetType("ALL");
                      setTimeout(() => {
                        setIsBroadcastModalOpen(false);
                        setBroadcastFeedback("");
                      }, 2200);
                    },
                    onError: (err) => {
                      setBroadcastFeedback(`❌ Dispatch failed: ${err?.response?.data?.message || err.message}`);
                    }
                  }
                );
              }}
              className="space-y-4"
            >
              {/* Target Audience Scope Selector */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
                  1. Target Audience Scope
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "ALL", label: "All Users", icon: "https://cdn-icons-png.flaticon.com/128/149/149071.png", desc: "Everyone on platform" },
                    { id: "FREELANCER", label: "Freelancers", icon: "https://cdn-icons-png.flaticon.com/128/8176/8176046.png", desc: "All freelancers only" },
                    { id: "CLIENT", label: "Clients", icon: "https://cdn-icons-png.flaticon.com/128/6009/6009864.png", desc: "All clients/recruiters" },
                    { id: "PRO", label: "Pro Members", icon: "https://cdn-icons-png.flaticon.com/128/7529/7529732.png", desc: "Pro active subscribers" },
                    { id: "SELECTED", label: "Individual User(s)", icon: "https://cdn-icons-png.flaticon.com/128/1159/1159983.png", desc: "Selected specific user(s)" },
                  ].map((target) => (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => setBroadcastTargetType(target.id)}
                      className={`p-2.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        broadcastTargetType === target.id
                          ? "bg-blue-50/80 border-blue-500 ring-2 ring-blue-200 text-blue-900 font-bold"
                          : "bg-slate-50/50 border-slate-200 hover:bg-slate-100/70 text-slate-700 font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <img src={target.icon} alt={target.label} className="h-4 w-4 object-contain shrink-0" />
                        <span className="text-xs font-bold">{target.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-normal leading-tight mt-1">{target.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Individual / Selected User Search section */}
              {broadcastTargetType === "SELECTED" && (
                <div className="space-y-2 p-3.5 rounded-2xl bg-blue-50/30 border border-blue-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>🔍 Search & Select Recipients</span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-extrabold">
                        {selectedRecipients.length} selected
                      </span>
                    </label>
                    {selectedRecipients.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedRecipients([])}
                        className="text-[10px] text-rose-600 hover:text-rose-700 font-bold border-0 bg-transparent cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {/* Selected User Chips */}
                  {selectedRecipients.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-white rounded-xl border border-slate-200">
                      {selectedRecipients.map((u) => (
                        <span
                          key={u.id}
                          className="inline-flex items-center gap-1.5 bg-blue-100/80 text-blue-900 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-blue-200"
                        >
                          <span>{u.name || u.username || u.email}</span>
                          {u.userCode && <span className="text-[9px] font-mono text-blue-700">({u.userCode})</span>}
                          <button
                            type="button"
                            onClick={() => setSelectedRecipients(selectedRecipients.filter((x) => x.id !== u.id))}
                            className="text-blue-600 hover:text-rose-600 font-bold border-0 bg-transparent cursor-pointer ml-0.5 text-xs"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Search Input Box */}
                  <div className="relative">
                    <input
                      type="text"
                      value={recipientSearchQuery}
                      onChange={(e) => setRecipientSearchQuery(e.target.value)}
                      placeholder="Type name, email, @username, or UserCode (FID/CID/AID)..."
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    {isSearchingRecipients && (
                      <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-medium animate-pulse">
                        Searching...
                      </span>
                    )}
                  </div>

                  {/* Search Results Dropdown List */}
                  {recipientSearchResults.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-sm">
                      {recipientSearchResults.map((u) => {
                        const isAlreadySelected = selectedRecipients.some((x) => x.id === u.id);
                        return (
                          <div
                            key={u.id}
                            onClick={() => {
                              if (isAlreadySelected) {
                                setSelectedRecipients(selectedRecipients.filter((x) => x.id !== u.id));
                              } else {
                                setSelectedRecipients([...selectedRecipients, u]);
                              }
                            }}
                            className={`p-2 px-3 text-xs flex items-center justify-between cursor-pointer transition ${
                              isAlreadySelected ? "bg-blue-50 font-bold text-blue-900" : "hover:bg-slate-50 text-slate-800 font-medium"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                                u.role === "recruiter" ? "bg-blue-600" : u.role === "admin" ? "bg-rose-600" : "bg-emerald-600"
                              }`}>
                                {(u.name || u.email || "U").charAt(0).toUpperCase()}
                              </span>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-semibold text-slate-900">{u.name || "User"}</p>
                                  {u.userCode && <span className="text-[9px] font-mono text-slate-500">({u.userCode})</span>}
                                  <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${
                                    u.role === "recruiter" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  }`}>
                                    {u.role === "recruiter" ? "client" : u.role}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400">{u.email}</p>
                              </div>
                            </div>
                            <span className="text-xs font-bold">{isAlreadySelected ? "✓ Selected" : "+ Add"}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {recipientSearchQuery && recipientSearchResults.length === 0 && !isSearchingRecipients && (
                    <p className="text-[11px] text-slate-400 italic text-center py-1">No matching users found.</p>
                  )}
                </div>
              )}

              {/* 2. Notice Title */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  2. Notice Title (Optional)
                </label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="e.g. System Maintenance Notice (Defaults to 'Platform Notice' if blank)"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* 3. Notification Message */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  3. Notification Message
                </label>
                <textarea
                  rows={4}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Write your message here. Target recipients will see this notification in their bell dropdown icon..."
                  className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                  required
                />
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={broadcastMutation.isPending}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 text-xs font-extrabold transition cursor-pointer border-0 shadow-md flex items-center justify-center gap-2"
                >
                  <img src="https://cdn-icons-png.flaticon.com/128/9783/9783934.png" alt="" className="h-4 w-4 object-contain shrink-0 brightness-0 invert" />
                  <span>
                    {broadcastMutation.isPending
                      ? "Dispatching..."
                      : `Dispatch to ${
                          broadcastTargetType === "ALL"
                            ? "All Users"
                            : broadcastTargetType === "FREELANCER"
                            ? "All Freelancers"
                            : broadcastTargetType === "CLIENT"
                            ? "All Clients"
                            : broadcastTargetType === "PRO"
                            ? "Pro Members"
                            : `${selectedRecipients.length} Selected User(s)`
                        }`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* View Notification Details Modal (Portal to body) */}
      {selectedNotification && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 relative my-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100 shadow-xs shrink-0">
                  <img src="https://cdn-icons-png.flaticon.com/128/9783/9783934.png" alt="Notification" className="h-6 w-6 object-contain" />
                </span>
                <div>
                  <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-extrabold text-blue-800 uppercase tracking-wider">
                    {selectedNotification.type || "System Announcement"}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1 leading-snug">
                    {(selectedNotification.title || "Platform Announcement").replace(/^📢\s*/, "")}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedNotification(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-xl cursor-pointer border-0 bg-transparent p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
              {(() => {
                const rawMsg = selectedNotification.message || selectedNotification.desc || "No message content.";
                // Extract URL if present in metadata or message
                const extractedUrl = selectedNotification.metadata?.inviteUrl || (rawMsg.match(/https?:\/\/[^\s]+/g) || [])[0];
                // Clean message text by removing raw URL string if embedded in message
                const cleanedMsg = rawMsg.replace(/https?:\/\/[^\s]+/g, "").replace(/Click the link below to accept invitation:?\s*/gi, "").trim();

                return (
                  <>
                    <p className="text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                      {cleanedMsg || rawMsg}
                    </p>

                    {extractedUrl && (
                      <div className="pt-3 border-t border-slate-200/80 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                            🚀 Invitation Link
                          </span>
                          {copiedInviteLink && (
                            <span className="text-[11px] font-extrabold text-emerald-600 animate-fadeIn">
                              ✓ Copied to Clipboard!
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xs">
                          <input
                            type="text"
                            readOnly
                            value={extractedUrl}
                            onClick={(e) => e.target.select()}
                            className="w-full bg-transparent px-2.5 py-1 text-xs font-mono text-blue-700 outline-none select-all truncate font-semibold"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(extractedUrl);
                              setCopiedInviteLink(true);
                              setTimeout(() => setCopiedInviteLink(false), 2500);
                            }}
                            className="shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 transition cursor-pointer border-0"
                          >
                            {copiedInviteLink ? "✓ Copied" : "Copy Link"}
                          </button>
                        </div>

                        <div className="pt-1">
                          <a
                            href={extractedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-xs font-extrabold text-white shadow-md hover:from-blue-700 hover:to-indigo-700 transition"
                          >
                            <span>🚀 Accept Staff Invitation</span>
                          </a>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="flex items-center justify-between border-t border-slate-200/60 pt-3 text-[11px] text-slate-500">
                <span>Sent by: <strong className="text-slate-700">{selectedNotification.metadata?.sender || "FreelNova Platform Admin"}</strong></span>
                <span>{selectedNotification.createdAt ? new Date(selectedNotification.createdAt).toLocaleString() : "Just now"}</span>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setSelectedNotification(null)}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 text-xs font-bold transition cursor-pointer border-0 shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}

export default Navbar;
