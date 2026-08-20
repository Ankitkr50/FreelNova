import AdminDashboard from "../components/dashboard/AdminDashboard.jsx";
import FreelancerDashboard from "../components/dashboard/FreelancerDashboard.jsx";
import RecruiterDashboard from "../components/dashboard/RecruiterDashboard.jsx";
import FreelNovaProPanel from "../components/dashboard/FreelNovaProPanel.jsx";
import ActionCenterCard from "../components/common/ActionCenterCard.jsx";
import { Link } from "react-router-dom";
import { ROUTES } from "../constants/routes.js";
import { useAuth } from "../hooks/useAuth.js";
import { useDashboardQuery } from "../hooks/useDashboard.js";
import { useProfileQuery } from "../hooks/useProfile.js";
import { calculateProfileCompletion, getMissingFields } from "../utils/profile.js";

function Dashboard() {
  const { user } = useAuth();
  const { data: liveProfile } = useProfileQuery();
  const role = user?.role || "freelancer";
  const firstName = user?.name?.split(" ")[0] || "there";
  const { data, isLoading, isError } = useDashboardQuery(role);

  const activeUser = liveProfile ? { ...user, ...liveProfile } : user;
  const completionPercent = calculateProfileCompletion(activeUser);
  const missingList = getMissingFields(activeUser);

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-[16px]">
        <div className="bg-[linear-gradient(135deg,#0f274f_0%,#163d7a_52%,#2563eb_100%)] px-6 py-8 text-white md:px-8 md:py-10">
          <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-50">
            Workspace
          </span>
          <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Welcome back, {firstName}</h1>
              <p className="mt-2 text-sm text-blue-50/85">
                Pick up where you left off and manage your {role === "recruiter" ? "client" : role} workflow from one place.
              </p>
            </div>
            <Link
              className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-blue-950 shadow-[0_16px_30px_rgba(2,6,23,0.15)] transition hover:-translate-y-0.5 hover:bg-blue-50"
              to={ROUTES.PROJECTS}
            >
              {role === "recruiter" || role === "admin" ? "Find Talent" : "Browse Projects"}
            </Link>
          </div>
        </div>
      </div>

      {/* Profile Completion Indicator */}
      {/* Profile Completion Widget (Only shown for freelancers/clients if profile is under 100% complete) */}
      {role !== "admin" && completionPercent < 100 && (
        <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Profile Completion Status</h3>
                <p className="text-xs text-slate-500 mt-1">Complete your details to build trust and get verified by admins.</p>
              </div>
              <span className="text-xl font-black text-blue-600">{completionPercent}%</span>
            </div>
            
            {/* Progress Bar */}
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500" 
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            
            {/* Missing Fields list */}
            {missingList.length > 0 && (
              <p className="text-[11px] text-slate-500">
                <span className="font-semibold text-rose-500">To do: </span>
                Please add your <span className="font-semibold text-slate-700">{missingList.join(", ")}</span> to reach 100% completion.
              </p>
            )}
          </div>
          
          <Link
            to={ROUTES.EDIT_PROFILE}
            className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-6 py-3.5 shadow-md transition cursor-pointer text-center whitespace-nowrap"
          >
            Complete Profile Now
          </Link>
        </div>
      )}

      {isLoading ? (
        <div className="border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-[16px]  rounded-[2rem] p-6">
          <p className="text-sm text-slate-600">Loading dashboard data...</p>
        </div>
      ) : null}

      {isError ? (
        <div className="border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-[16px]  rounded-[2rem] border-rose-200 bg-rose-50 p-6">
          <p className="text-sm text-rose-700">Failed to load dashboard information.</p>
        </div>
      ) : null}

      <ActionCenterCard />
      <FreelNovaProPanel />

      {!isLoading && !isError ? (
        role === "recruiter" ? (
          <RecruiterDashboard data={data || {}} />
        ) : role === "admin" ? (
          <AdminDashboard data={data || {}} />
        ) : (
          <FreelancerDashboard data={data || {}} />
        )
      ) : null}
    </section>
  );
}

export default Dashboard;


