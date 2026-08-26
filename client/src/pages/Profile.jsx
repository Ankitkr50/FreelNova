import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import BasicInfoSection from "../components/profile/BasicInfoSection.jsx";
import BioSection from "../components/profile/BioSection.jsx";
import ExperienceSection from "../components/profile/ExperienceSection.jsx";
import PortfolioSection from "../components/profile/PortfolioSection.jsx";
import ProfileNavLinks from "../components/profile/ProfileNavLinks.jsx";
import SkillsSection from "../components/profile/SkillsSection.jsx";
import HourlyRateSection from "../components/profile/HourlyRateSection.jsx";
import WorkExperienceSection from "../components/profile/WorkExperienceSection.jsx";
import PortfolioItemsSection from "../components/profile/PortfolioItemsSection.jsx";
import WorkPassportCard from "../components/profile/WorkPassportCard.jsx";
import VerifiedSkillGraph from "../components/profile/VerifiedSkillGraph.jsx";
import ReputationBadgeCard from "../components/growth/ReputationBadgeCard.jsx";
import AITwinModal from "../components/profile/AITwinModal.jsx";
import InviteFreelancerModal from "../components/common/InviteFreelancerModal.jsx";
import { useQuery } from "@tanstack/react-query";
import http from "../api/http.js";
import { useProfileQuery, useUpdateProfileMutation } from "../hooks/useProfile.js";
import { useAuth } from "../hooks/useAuth.js";
import { getDisplayUsername, getDisplayUserCode } from "../utils/userHandle.js";
import { calculateProfileCompletion, getMissingFields } from "../utils/profile.js";
import { ROUTES } from "../constants/routes.js";

function getAdminRoleBadgeDetails(role, adminRole, customRoleTitle, email) {
  if (role !== "admin") return null;
  const isPrimary = email === "fn.freelnova@gmail.com";
  const label = customRoleTitle || (adminRole === "CUSTOM" ? "Main Admin" : (adminRole ? adminRole.replace(/_/g, " ") : (isPrimary ? "Super Admin" : "Main Admin")));
  return {
    label,
    color: "bg-purple-100 text-purple-950 border-purple-300 font-extrabold"
  };
}

function formatJoined(dateValue) {
  if (!dateValue) return "Joined recently";

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return "Joined recently";

  return `Joined ${parsed.toLocaleString("en-US", { month: "long", year: "numeric" })}`;
}

function getFreelancerTierBadge(count = 0) {
  if (count >= 50) {
    return { 
      label: "Emerald Level 5", 
      detail: "50+ Clients Milestone", 
      icon: "/badges/emerald.png",
      color: "bg-emerald-100 text-emerald-950 border-emerald-300 font-extrabold shadow-xs" 
    };
  } else if (count >= 20) {
    return { 
      label: "Platinum Level 4", 
      detail: "20+ Clients Milestone", 
      icon: "/badges/platinum.png",
      color: "bg-blue-100 text-blue-950 border-blue-300 font-bold" 
    };
  } else if (count >= 10) {
    return { 
      label: "Gold Level 3", 
      detail: "10+ Clients Milestone", 
      icon: "/badges/gold.png",
      color: "bg-amber-100 text-amber-950 border-amber-300 font-bold" 
    };
  } else if (count >= 5) {
    return { 
      label: "Silver Level 2", 
      detail: "5+ Clients Milestone", 
      icon: "/badges/silver.png",
      color: "bg-slate-100 text-slate-900 border-slate-300 font-bold" 
    };
  } else if (count >= 1) {
    return { 
      label: "Bronze Level 1", 
      detail: "1st Client Milestone", 
      icon: "/badges/bronze.png",
      color: "bg-amber-50 text-amber-900 border-amber-200 font-bold" 
    };
  } else {
    return { 
      label: "Rising Talent", 
      detail: "New FreelNova Member", 
      icon: "/badges/bronze.png",
      color: "bg-slate-100 text-slate-700 border-slate-200 font-bold" 
    };
  }
}

function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  
  const { data: profile, isLoading, isError } = useProfileQuery(userId);
  const updateProfileMutation = useUpdateProfileMutation();
  const [skillInput, setSkillInput] = useState("");
  const [activeTab, setActiveTab] = useState("about"); // "about" | "portfolio" | "experience"

  const passportTargetId = userId || currentUser?.id;
  const { data: passportData, isLoading: isPassportLoading } = useQuery({
    queryKey: ["work_passport", passportTargetId],
    queryFn: async () => {
      if (!passportTargetId) return null;
      const res = await http.get(`/users/${passportTargetId}/work-passport`);
      return res.data?.data;
    },
    enabled: Boolean(passportTargetId),
  });

  const { data: skillGraphData, isLoading: isSkillGraphLoading } = useQuery({
    queryKey: ["skill_graph", passportTargetId],
    queryFn: async () => {
      if (!passportTargetId) return null;
      const res = await http.get(`/users/${passportTargetId}/skill-graph`);
      return res.data?.data;
    },
    enabled: Boolean(passportTargetId),
  });

  const isOwnProfile = !userId || userId === currentUser?.id;

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed || !profile) return;

    const alreadyExists = (profile.skills || []).some(
      (item) => item.toLowerCase() === trimmed.toLowerCase()
    );
    if (alreadyExists) return;

    const nextSkills = [...(profile.skills || []), trimmed];
    updateProfileMutation.mutate({ skills: nextSkills });
    setSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove) => {
    if (!profile) return;
    const nextSkills = (profile.skills || []).filter((item) => item !== skillToRemove);
    updateProfileMutation.mutate({ skills: nextSkills });
  };

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAITwinModal, setShowAITwinModal] = useState(false);

  const handleContact = () => {
    if (!profile) return;

    if (currentUser?.role !== "recruiter" && currentUser?.role !== "admin") {
      alert("Only clients or administrators can contact freelancers.");
      return;
    }

    setShowInviteModal(true);
  };

  const handleBookConsultation = () => {
    alert(`📅 Consultation request sent to ${profile?.name}!\nThey will reach out to you via Messages to confirm a time slot.`);
    handleContact();
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center text-sm text-slate-500">
        Fetching profile data...
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-[2rem] p-12 text-center text-sm text-rose-700">
        Failed to load profile data. User may not exist or is inactive.
      </div>
    );
  }

  const firstName = profile.name?.split(" ")[0] || "User";
  const topSkill = profile.skills?.[0] || "FreelNova";
  const joinedLabel = formatJoined(profile.createdAt);
  const adminBadge = getAdminRoleBadgeDetails(profile.role, profile.adminRole, profile.customRoleTitle, profile.email);

  const activeProfile = profile ? { ...currentUser, ...profile } : currentUser;
  const completionPercent = calculateProfileCompletion(activeProfile);
  const missingList = getMissingFields(activeProfile);

  // RENDER OWN PROFILE
  if (isOwnProfile) {
    return (
      <section className="space-y-8 animate-fadeIn">
        <div className="rounded-[2rem] bg-[linear-gradient(135deg,#0f274f_0%,#163d7a_52%,#2563eb_100%)] px-6 py-8 md:px-8 md:py-10 shadow-[0_20px_60px_rgba(15,23,42,0.12)] text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
                Welcome back, {profile.name || "User"}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-blue-100/90">
                {joinedLabel}. Manage your profile, showcase your works, set your hourly rate, and review client invitations.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Link
                className="inline-block rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-blue-900 shadow-[0_8px_20px_rgba(0,0,0,0.15)] transition hover:-translate-y-0.5 hover:bg-blue-50"
                to={ROUTES.EDIT_PROFILE}
              >
                Edit Profile
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
          <div className="space-y-6">
            {/* Profile Completion Progress Card */}
            {profile.role !== "admin" && (
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_38px_rgba(15,23,42,0.06)] space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Profile Strength</span>
                  <span className="text-sm font-black text-blue-600">{completionPercent}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500" 
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                {missingList.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] leading-relaxed text-slate-500">
                      <span className="font-semibold text-rose-500">Missing:</span> {missingList.join(", ")}
                    </p>
                    <Link 
                      to={profile.profileCompleted ? ROUTES.EDIT_PROFILE : ROUTES.COMPLETE_PROFILE}
                      className="block w-full text-center rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 hover:bg-blue-100 transition py-2.5 text-xs font-bold"
                    >
                      Complete Profile
                    </Link>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_38px_rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-4">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white uppercase shadow-sm">
                  {firstName.charAt(0)}
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900">{profile.name || "FreelNova User"}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-bold text-blue-600">@{getDisplayUsername(profile)}</p>
                    <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[10px] font-extrabold font-mono tracking-wider select-none">
                      {getDisplayUserCode(profile)}
                    </span>
                    {(() => {
                      const proUsers = JSON.parse(localStorage.getItem("sb_pro_user_ids") || "[]");
                      const isProfilePro = profile.isPro || (profile.subscriptions && profile.subscriptions.length > 0) || proUsers.includes(profile.id);
                      return isProfilePro ? (
                        <img
                          src="/badges/pro_verified.png"
                          alt="Pro Verified"
                          className="h-4 w-4 object-contain inline-block shrink-0"
                          title="FreelNova Pro Verified Active Member"
                        />
                      ) : null;
                    })()}
                  </div>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{joinedLabel}</p>
                  <div className="mt-1.5">
                    {adminBadge ? (
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[9px] uppercase tracking-wider border ${adminBadge.color || "bg-purple-100 text-purple-950 border-purple-300 font-extrabold"}`}>
                        {profile.customRoleTitle || adminBadge.label || adminBadge.short}
                      </span>
                    ) : (
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                        profile.role === "admin"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : profile.role === "recruiter"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}>
                        {profile.role || "freelancer"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Top Skill</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{topSkill}</p>
                </div>
                {profile.role === "freelancer" && (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Hourly Rate</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">₹{(profile.hourlyRate || 0).toLocaleString()} / hr</p>
                  </div>
                )}
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Portfolio Links</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{profile.portfolioLinks?.length || 0} linked items</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Experience</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{profile.experienceYears || 0}+ years</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_38px_rgba(15,23,42,0.06)]">
              <h2 className="text-2xl font-bold text-slate-900">
                Most popular services in <span className="text-blue-600">{topSkill}</span>
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Manage your services, projects, and bio details dynamically to attract high-paying clients.
              </p>

              <div className="mt-6">
                <ProfileNavLinks />
              </div>
            </div>

            <div className="grid gap-4">
              {profile.role === "freelancer" && (
                <WorkPassportCard passportData={passportData} isLoading={isPassportLoading} />
              )}
              <BasicInfoSection values={profile} />
              <SkillsSection
                skills={profile.skills}
                editable={false}
                skillsInput=""
                onAddSkill={() => {}}
                onRemoveSkill={() => {}}
                onSkillInputChange={() => {}}
              />
              <BioSection bio={profile.bio} />
              {profile.role === "freelancer" && (
                <HourlyRateSection hourlyRate={profile.hourlyRate} editable={false} />
              )}
              <ExperienceSection education={profile.education} experienceYears={profile.experienceYears} />
              {profile.role === "freelancer" && (
                <WorkExperienceSection experience={profile.workExperience} editable={false} />
              )}
              <PortfolioSection links={profile.portfolioLinks || []} />
              {profile.role === "freelancer" && (
                <PortfolioItemsSection portfolioItems={profile.portfolioItems} editable={false} />
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // RENDER PUBLIC FREELANCER PROFILE VIEW (FIVERR PRO STYLE MATCHING SCREENSHOT 2)
  return (
    <section className="space-y-6 animate-fadeIn max-w-7xl mx-auto pb-12">
      {/* Top Header Card (White background matching Screenshot #2) */}
      <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 md:p-8 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar Circle */}
            <div className="relative">
              <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-gradient-to-tr from-slate-900 to-slate-800 text-2xl font-black text-white flex items-center justify-center uppercase shadow-md border-2 border-white">
                {profile.name?.charAt(0)}
              </div>
              <div className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white" title="Online Status" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  {profile.name}
                  <span className="text-xs font-bold text-blue-600 lowercase bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5">
                    @{getDisplayUsername(profile)}
                    {(() => {
                      const proUsers = JSON.parse(localStorage.getItem("sb_pro_user_ids") || "[]");
                      const isProfilePro = profile.isPro || (profile.subscriptions && profile.subscriptions.length > 0) || proUsers.includes(profile.id);
                      return isProfilePro ? (
                        <img
                          src="/badges/pro_verified.png"
                          alt="Pro Verified"
                          className="h-4 w-4 object-contain inline-block shrink-0"
                          title="FreelNova Pro Verified Active Member"
                        />
                      ) : null;
                    })()}
                  </span>
                </h1>
                {(() => {
                  const completedJobs = profile.completedProjectsCount || profile.projectsCompleted || profile.contracts?.length || 1;
                  const tierBadge = getFreelancerTierBadge(completedJobs);
                  return (
                    <>
                      <div className="flex items-center gap-1 text-xs font-bold bg-amber-50/80 border border-amber-200/60 px-2.5 py-1 rounded-full text-amber-800">
                        <span className="text-amber-500 font-extrabold">★ {profile.ratingAvg ? profile.ratingAvg.toFixed(1) : "4.9"}</span>
                        <span className="text-slate-600 font-medium">({completedJobs} Jobs Done)</span>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] ${tierBadge.color} shadow-xs`}>
                        {tierBadge.label}
                      </span>
                    </>
                  );
                })()}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-600 font-semibold flex-wrap pt-0.5">
                <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md text-slate-800">
                  {profile.experienceYears || 3}+ Years Experience
                </span>
                <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md text-slate-800">
                  {formatJoined(profile.createdAt)}
                </span>
                <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md text-slate-800">
                  {profile.location || "India"}
                </span>
                <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold px-2.5 py-1 rounded-md">
                  Hourly Rate: ₹{(profile.hourlyRate || 500).toLocaleString()} / hr
                </span>
              </div>
              <p className="text-xs font-bold text-blue-600 mt-1">{profile.headline || "Senior Full Stack Engineer & UI/UX Specialist"}</p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 w-full md:w-auto">
            <div className="flex gap-2 w-full md:w-auto">
              <button
                onClick={() => setShowAITwinModal(true)}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold px-4 py-3 shadow-md transition cursor-pointer border-0 shrink-0"
              >
                Ask AI Twin
              </button>
              <button
                onClick={handleContact}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-6 py-3 shadow-md transition cursor-pointer border-0 shrink-0"
              >
                ✉️ Contact me
              </button>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">Average response time: 1 hour</span>
          </div>
        </div>

        {showAITwinModal && (
          <AITwinModal freelancer={profile} onClose={() => setShowAITwinModal(false)} />
        )}

        {/* Tab Header Bar */}
        <div className="border-t border-slate-100 pt-4 flex gap-8 text-xs font-bold text-slate-500">
          <button
            onClick={() => setActiveTab("about")}
            className={`pb-2 border-b-2 transition cursor-pointer ${
              activeTab === "about" ? "border-emerald-600 text-emerald-600 font-extrabold" : "border-transparent hover:text-slate-800"
            }`}
          >
            About Me
          </button>
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`pb-2 border-b-2 transition cursor-pointer ${
              activeTab === "portfolio" ? "border-emerald-600 text-emerald-600 font-extrabold" : "border-transparent hover:text-slate-800"
            }`}
          >
            Services ({profile.portfolioItems?.length || 3})
          </button>
          <button
            onClick={() => setActiveTab("experience")}
            className={`pb-2 border-b-2 transition cursor-pointer ${
              activeTab === "experience" ? "border-emerald-600 text-emerald-600 font-extrabold" : "border-transparent hover:text-slate-800"
            }`}
          >
            Portfolio & Reviews
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="space-y-8">
        {activeTab === "about" && (
          <div className="space-y-8">
            <WorkPassportCard passportData={passportData} isLoading={isPassportLoading} />
            <ReputationBadgeCard reputation={{
              reputationScore: Math.round((profile.ratingAvg / 5) * 100) || 92,
              role: profile.role || "freelancer",
              completionRate: 100,
              onTimeRate: 98,
              repeatClientRate: 40,
              badges: [
                { label: "HIGHLY RELIABLE", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                { label: "VERIFIED SPECIALIST", color: "bg-purple-50 text-purple-700 border-purple-200" },
                { label: "TOP RATED", color: "bg-amber-50 text-amber-800 border-amber-200" },
              ],
            }} />
            <VerifiedSkillGraph skillGraphData={skillGraphData} isLoading={isSkillGraphLoading} />
            {/* Bio summary */}
            <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Professional Summary</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {profile.bio || "High-performing specialist with verified expertise in web applications, system design, and client deliverables."}
              </p>
            </div>

            {/* Gamified BADGES EARNED Section matching design screenshot */}
            {(() => {
              const completedJobs = profile.completedProjectsCount || profile.projectsCompleted || profile.contracts?.length || 1;
              return (
                <div className="rounded-[2rem] border border-slate-200/90 bg-white p-6 md:p-8 shadow-xs space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-1 w-6 bg-amber-500 rounded-full" />
                      <h3 className="text-xs font-black text-amber-800 uppercase tracking-widest">
                        BADGES EARNED
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      {completedJobs >= 1 ? "4 Milestones Unlocked" : "1 Milestone Unlocked"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {/* Bronze Level 1 Badge */}
                    <div className={`p-4 rounded-2xl border text-center flex flex-col items-center gap-2 transition-all ${
                      completedJobs >= 1 ? "bg-amber-50/60 border-amber-200 shadow-xs" : "bg-slate-50 border-slate-200 opacity-60"
                    }`}>
                      <div className="relative h-14 w-14 flex items-center justify-center">
                        <img src="/badges/bronze.png" alt="Bronze Level 1" className="h-full w-full object-contain drop-shadow-md" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-xs text-amber-900">Bronze L1</p>
                        <p className="text-[10px] font-bold text-amber-700">1st Client Milestone</p>
                        <span className="inline-block text-[9px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full mt-1">
                          Common
                        </span>
                      </div>
                    </div>

                    {/* Silver Level 2 Badge */}
                    <div className={`p-4 rounded-2xl border text-center flex flex-col items-center gap-2 transition-all ${
                      completedJobs >= 5 ? "bg-slate-100/80 border-slate-300 shadow-xs" : "bg-slate-50 border-slate-200 opacity-60"
                    }`}>
                      <div className="relative h-14 w-14 flex items-center justify-center">
                        <img src="/badges/silver.png" alt="Silver Level 2" className="h-full w-full object-contain drop-shadow-md" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-xs text-slate-900">Silver L2</p>
                        <p className="text-[10px] font-bold text-slate-700">5+ Clients Milestone</p>
                        <span className="inline-block text-[9px] font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-full mt-1">
                          Uncommon
                        </span>
                      </div>
                    </div>

                    {/* Gold Level 3 Badge */}
                    <div className={`p-4 rounded-2xl border text-center flex flex-col items-center gap-2 transition-all ${
                      completedJobs >= 10 ? "bg-amber-100/50 border-amber-300 shadow-xs" : "bg-slate-50 border-slate-200 opacity-60"
                    }`}>
                      <div className="relative h-14 w-14 flex items-center justify-center">
                        <img src="/badges/gold.png" alt="Gold Level 3" className="h-full w-full object-contain drop-shadow-md" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-xs text-amber-950">Gold L3</p>
                        <p className="text-[10px] font-bold text-amber-800">10+ Clients Milestone</p>
                        <span className="inline-block text-[9px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full mt-1">
                          Rare
                        </span>
                      </div>
                    </div>

                    {/* Platinum Level 4 Badge */}
                    <div className={`p-4 rounded-2xl border text-center flex flex-col items-center gap-2 transition-all ${
                      completedJobs >= 20 ? "bg-blue-50/60 border-blue-300 shadow-xs" : "bg-slate-50 border-slate-200 opacity-60"
                    }`}>
                      <div className="relative h-14 w-14 flex items-center justify-center">
                        <img src="/badges/platinum.png" alt="Platinum Level 4" className="h-full w-full object-contain drop-shadow-md" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-xs text-blue-950">Platinum L4</p>
                        <p className="text-[10px] font-bold text-blue-800">20+ Clients Milestone</p>
                        <span className="inline-block text-[9px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full mt-1">
                          Epic
                        </span>
                      </div>
                    </div>

                    {/* Emerald Level 5 Badge */}
                    <div className={`p-4 rounded-2xl border text-center flex flex-col items-center gap-2 transition-all ${
                      completedJobs >= 50 ? "bg-emerald-50/80 border-emerald-300 shadow-xs" : "bg-slate-50 border-slate-200 opacity-60"
                    }`}>
                      <div className="relative h-14 w-14 flex items-center justify-center">
                        <img src="/badges/emerald.png" alt="Emerald Level 5" className="h-full w-full object-contain drop-shadow-md" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-xs text-emerald-950">Emerald L5</p>
                        <p className="text-[10px] font-bold text-emerald-800">50+ Clients Milestone</p>
                        <span className="inline-block text-[9px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full mt-1">
                          Legendary
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Skills Pills matching 2nd screenshot */}
            <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {(profile.skills && profile.skills.length > 0 ? profile.skills : ["Adobe Illustrator expert", "Adobe Photoshop expert", "Booklet designer", "Magazine designer", "Catalog designer", "React", "Node.js"]).map((skill, idx) => (
                  <span
                    key={idx}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                  >
                    {skill}
                  </span>
                ))}
                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">
                  +17
                </span>
              </div>
            </div>

            {/* See My Services Grid matching 2nd screenshot */}
            <div className="space-y-4">
              <h3 className="text-lg font-extrabold text-slate-900">See my services</h3>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {(profile.portfolioItems && profile.portfolioItems.length > 0 ? profile.portfolioItems : [
                  {
                    id: "s1",
                    title: "Logo Design & Branding",
                    description: "I will design saas startup, timeless software ai, tech software, crypto, agency logo",
                    imageUrl: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=500&auto=format&fit=crop&q=80",
                    price: 3000
                  },
                  {
                    id: "s2",
                    title: "Catalog & Booklet Design",
                    description: "I will design fashion magazine, catalog, lookbook, booklet and bespoke brochure",
                    imageUrl: "https://images.unsplash.com/photo-1542744094-3a3172720449?w=500&auto=format&fit=crop&q=80",
                    price: 3999
                  },
                  {
                    id: "s3",
                    title: "Landing Page UI/UX",
                    description: "I will design saas landing page UI, homepage, or website UI and boost your business",
                    imageUrl: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=500&auto=format&fit=crop&q=80",
                    price: 4999
                  }
                ]).map((service) => (
                  <div key={service.id || service.title} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between">
                    <div>
                      <div className="h-40 w-full bg-slate-100 overflow-hidden">
                        <img src={service.imageUrl || "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&auto=format&fit=crop&q=80"} alt={service.title} className="h-full w-full object-cover" />
                      </div>
                      <div className="p-4 space-y-2">
                        <h4 className="font-bold text-xs text-slate-900">{service.title}</h4>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{service.description}</p>
                      </div>
                    </div>
                    <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-between mt-3">
                      <div>
                        <span className="text-[10px] text-slate-400 block">From</span>
                        <span className="font-extrabold text-xs text-slate-900">₹{(service.price || 3000).toLocaleString()} <span className="font-normal text-slate-400">/ project</span></span>
                      </div>
                      <button
                        onClick={handleContact}
                        className="rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs px-3.5 py-1.5 transition cursor-pointer border-0"
                      >
                        More details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hourly Basis Box matching 2nd screenshot */}
            <div className="rounded-[2rem] border border-blue-100 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 p-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
              <div>
                <h4 className="text-base font-extrabold text-slate-900">Want to work on an hourly basis?</h4>
                <p className="text-xs text-slate-600 mt-0.5">Tell {profile.name} what you need for custom milestone pricing at ₹{(profile.hourlyRate || 1500).toLocaleString()}/hr.</p>
              </div>
              <button
                onClick={handleBookConsultation}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3 shadow-md transition cursor-pointer border-0"
              >
                Request Hourly Contract
              </button>
            </div>
          </div>
        )}

        {activeTab === "portfolio" && (
          <div className="space-y-6">
            <PortfolioItemsSection portfolioItems={profile.portfolioItems} editable={false} />
            <PortfolioSection links={profile.portfolioLinks || []} />
          </div>
        )}

        {activeTab === "experience" && (
          <div className="space-y-6">
            <WorkExperienceSection experience={profile.workExperience} editable={false} />
            <ExperienceSection education={profile.education} experienceYears={profile.experienceYears} />
          </div>
        )}
      </div>

      <InviteFreelancerModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        freelancer={profile}
      />
    </section>
  );
}

export default Profile;
