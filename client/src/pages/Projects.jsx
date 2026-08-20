import { useMemo, useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import ProjectCard from "../components/projects/ProjectCard.jsx";
import ProjectsTable from "../components/projects/ProjectsTable.jsx";
import { useProjectsQuery, useFreelancersQuery } from "../hooks/useProjects.js";
import { useAuth } from "../hooks/useAuth.js";
import { useRazorpay } from "../hooks/useRazorpay.js";
import InviteFreelancerModal from "../components/common/InviteFreelancerModal.jsx";
import InstantHireModal from "../components/growth/InstantHireModal.jsx";

const initialFilters = {
  search: "",
  category: "all",
  skill: "all",
  location: "all",
  budgetMin: "",
  budgetMax: "",
  sort: "newest",
  experienceLevel: "all",
  budgetType: "all",
  paymentStatus: "all",
  badgeLevel: "all",
  hourlyMin: "",
  hourlyMax: "",
  verifiedOnly: false,
};

function sortProjects(projects, sortType) {
  const list = [...projects];

  if (sortType === "budget_low") {
    list.sort((a, b) => a.budgetMin - b.budgetMin);
  } else if (sortType === "budget_high") {
    list.sort((a, b) => b.budgetMax - a.budgetMax);
  } else if (sortType === "proposals") {
    list.sort((a, b) => b.proposalsCount - a.proposalsCount);
  } else {
    list.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
  }

  return list;
}

const AI_AGENT_TALENTS = [
  {
    id: "agent_codex",
    name: "Codex-AI Developer",
    headline: "Autonomous Software & API Agent",
    bio: "Capable of writing fully functional REST APIs, database models (Prisma), frontend components (React), debugging codebases, and outputting execution logs.",
    ratingAvg: "4.9",
    skills: ["React", "Node.js", "Express", "Prisma", "PostgreSQL", "Debugging"],
    rate: "₹400 / task",
    experienceYears: "Next-Gen AI"
  },
  {
    id: "agent_pixelcraft",
    name: "PixelCraft-AI Designer",
    headline: "Automated UI/UX & Asset Generator",
    bio: "Specialized in creating wireframes, SVG designs, layout themes, Tailwind styling configurations, and fully responsive CSS mockups.",
    ratingAvg: "4.8",
    skills: ["UI/UX Design", "Figma", "Tailwind CSS", "SVG", "Responsive Layouts"],
    rate: "₹300 / task",
    experienceYears: "Next-Gen AI"
  },
  {
    id: "agent_scribe",
    name: "Scribe-AI Copywriter",
    headline: "Content & SEO Strategy Engine",
    bio: "Capable of producing high-converting marketing copywriting, SEO articles, detailed technical documentations, and pitches for client acquisition.",
    ratingAvg: "4.7",
    skills: ["Copywriting", "SEO Optimization", "Technical Writing", "Marketing Strategy"],
    rate: "₹150 / task",
    experienceYears: "Next-Gen AI"
  }
];

function formatMemberJoined(dateValue) {
  if (!dateValue) return "Joined Aug 2026";
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return "Joined Aug 2026";
  return `Joined ${parsed.toLocaleString("en-US", { month: "short", year: "numeric" })}`;
}

function getFreelancerTierBadge(count = 0) {
  if (count >= 50) {
    return { 
      label: "Emerald Level 5", 
      shortLabel: "Emerald L5",
      detail: "50+ Clients Milestone Completed", 
      icon: "/badges/emerald.png",
      color: "bg-emerald-100 text-emerald-950 border-emerald-300 font-extrabold shadow-xs" 
    };
  } else if (count >= 20) {
    return { 
      label: "Platinum Level 4", 
      shortLabel: "Platinum L4",
      detail: "20+ Clients Milestone Completed", 
      icon: "/badges/platinum.png",
      color: "bg-blue-100 text-blue-950 border-blue-300 font-bold" 
    };
  } else if (count >= 10) {
    return { 
      label: "Gold Level 3", 
      shortLabel: "Gold L3",
      detail: "10+ Clients Milestone Completed", 
      icon: "/badges/gold.png",
      color: "bg-amber-100 text-amber-950 border-amber-300 font-bold" 
    };
  } else if (count >= 5) {
    return { 
      label: "Silver Level 2", 
      shortLabel: "Silver L2",
      detail: "5+ Clients Milestone Completed", 
      icon: "/badges/silver.png",
      color: "bg-slate-100 text-slate-900 border-slate-300 font-bold" 
    };
  } else if (count >= 1) {
    return { 
      label: "Bronze Level 1", 
      shortLabel: "Bronze L1",
      detail: "1st Client Milestone Completed", 
      icon: "/badges/bronze.png",
      color: "bg-amber-50 text-amber-900 border-amber-200 font-bold" 
    };
  } else {
    return { 
      label: "Rising Talent", 
      shortLabel: "Rising",
      detail: "New FreelNova Member", 
      icon: "/badges/bronze.png",
      color: "bg-slate-100 text-slate-700 border-slate-200 font-bold" 
    };
  }
}

function CustomBadgeTierSelect({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const options = [
    { value: "all", label: "All Badge Tiers", icon: null },
    { value: "level1", label: "Bronze Level 1 (1+ Jobs)", icon: "/badges/bronze.png" },
    { value: "level2", label: "Silver Level 2 (5+ Jobs)", icon: "/badges/silver.png" },
    { value: "level3", label: "Gold Level 3 (10+ Jobs)", icon: "/badges/gold.png" },
    { value: "level4", label: "Platinum Level 4 (20+ Jobs)", icon: "/badges/platinum.png" },
    { value: "level5", label: "Emerald Level 5 (50+ Jobs)", icon: "/badges/emerald.png" },
  ];

  const selectedOpt = options.find((o) => o.value === value) || options[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none transition hover:bg-slate-100"
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOpt.icon ? (
            <img src={selectedOpt.icon} alt="" className="h-5 w-5 object-contain shrink-0" />
          ) : (
            <span className="text-xs font-bold text-slate-500">🏆</span>
          )}
          <span className="truncate">{selectedOpt.label}</span>
        </div>
        <svg className="w-4 h-4 text-slate-500 shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-slate-200 bg-white shadow-xl py-1 max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition cursor-pointer text-left ${
                value === opt.value ? "bg-blue-50 text-blue-700 font-bold" : "text-slate-800 hover:bg-slate-50"
              }`}
            >
              {opt.icon ? (
                <img src={opt.icon} alt="" className="h-5 w-5 object-contain shrink-0" />
              ) : (
                <span className="w-5 text-center text-xs font-bold text-slate-400">🏆</span>
              )}
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Projects() {
  const { user } = useAuth();
  const { openCheckout } = useRazorpay();
  const [searchType, setSearchType] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const typeParam = params.get("type");
    if (typeParam === "projects" || typeParam === "talent" || typeParam === "ai_agents") {
      if (user?.role === "admin" && typeParam !== "projects") {
        return "projects";
      }
      return typeParam;
    }
    if (user?.role === "recruiter") {
      return "talent";
    }
    return "projects";
  });
  const { data: projects = [], isLoading, isError } = useProjectsQuery();
  const location = useLocation();
  const [filters, setFilters] = useState(initialFilters);

  // Sync url search query, category, and type with filters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchQuery = params.get("search");
    const categoryQuery = params.get("category");
    const typeParam = params.get("type");
    
    if (searchQuery !== null || categoryQuery !== null) {
      setFilters((prev) => ({
        ...prev,
        search: searchQuery !== null ? searchQuery : prev.search,
        category: categoryQuery !== null ? categoryQuery : prev.category,
      }));
    }

    if (typeParam === "projects" || typeParam === "talent" || typeParam === "ai_agents") {
      if ((user?.role === "freelancer" || user?.role === "admin") && typeParam !== "projects") {
        setSearchType("projects");
      } else if (user?.role === "recruiter" && typeParam === "projects") {
        setSearchType("talent");
      } else {
        setSearchType(typeParam);
      }
    } else {
      if (user?.role === "freelancer" || user?.role === "admin") {
        setSearchType("projects");
      } else if (user?.role === "recruiter") {
        if (searchType === "projects") {
          setSearchType("talent");
        }
      }
    }
  }, [location.search, user, searchType]);

  const [viewMode, setViewMode] = useState("cards");
  const [savedIds, setSavedIds] = useState([]);
  const [selectedTalents, setSelectedTalents] = useState([]);
  const [expandedBios, setExpandedBios] = useState({});

  // Fetch freelancers from backend
  const { data: freelancers = [], isLoading: isLoadingFreelancers } = useFreelancersQuery({
    q: filters.search,
  });

  const filteredFreelancers = useMemo(() => {
    let list = freelancers.filter((freelancer) => {
      // 1. Keyword search filter
      const search = filters.search.trim().toLowerCase();
      if (search) {
        const matchesName = (freelancer.name || "").toLowerCase().includes(search);
        const matchesUsername = (freelancer.username || "").toLowerCase().includes(search);
        const matchesHeadline = (freelancer.headline || "").toLowerCase().includes(search);
        const matchesBio = (freelancer.bio || "").toLowerCase().includes(search);
        const matchesSkills = (freelancer.skills || []).some((s) => String(s).toLowerCase().includes(search));
        if (!matchesName && !matchesUsername && !matchesHeadline && !matchesBio && !matchesSkills) {
          return false;
        }
      }

      // 2. Skill filter
      if (filters.skill !== "all") {
        const skillGroups = {
          "mern stack": ["react", "node", "express", "mongodb", "mern", "javascript"],
          "machine learning (ml)": ["ml", "machine learning", "python", "pytorch", "tensorflow", "scikit-learn", "numpy", "pandas"],
          "artificial intelligence (ai)": ["ai", "artificial intelligence", "openai", "llm", "prompt engineering", "langchain", "deep learning"],
          "graphics & design": ["figma", "ui", "ux", "design", "illustrator", "photoshop", "ui/ux", "graphics"],
          "mobile development": ["react native", "flutter", "swift", "kotlin", "android", "ios", "mobile"],
          "backend development": ["node", "express", "python", "django", "fastapi", "golang", "postgres", "sql", "mongodb", "prisma"],
          "video editing": ["video", "video editing", "premiere", "after effects", "motion", "editing"],
          "logo & brand design": ["logo", "brand", "branding", "graphics", "illustrator", "design"],
          "copywriting & content": ["copywriting", "content", "writing", "blogs", "technical writing", "articles"],
          "seo & marketing": ["seo", "marketing", "digital marketing", "growth", "sem"]
        };

        const filterVal = filters.skill.toLowerCase();
        const freelancerSkills = (freelancer.skills || []).flatMap(s => 
          String(s || "").split(",").map(item => item.trim().toLowerCase())
        );

        const hasSkill = skillGroups[filterVal]
          ? skillGroups[filterVal].some(skill => freelancerSkills.includes(skill))
          : freelancerSkills.includes(filterVal);

        if (!hasSkill) return false;
      }

      // 3. Badge Level filter
      const completedJobs = freelancer.completedProjectsCount || freelancer.projectsCompleted || freelancer.contracts?.length || 1;
      if (filters.badgeLevel !== "all") {
        if (filters.badgeLevel === "level1" && completedJobs < 1) return false;
        if (filters.badgeLevel === "level2" && completedJobs < 5) return false;
        if (filters.badgeLevel === "level3" && completedJobs < 10) return false;
        if (filters.badgeLevel === "level4" && completedJobs < 20) return false;
        if (filters.badgeLevel === "level5" && completedJobs < 50) return false;
      }

      // 4. Hourly Rate filter
      const rate = freelancer.hourlyRate || 500;
      if (filters.hourlyMin !== "" && rate < Number(filters.hourlyMin)) return false;
      if (filters.hourlyMax !== "" && rate > Number(filters.hourlyMax)) return false;

      // 5. Experience level filter
      const expYears = Number(freelancer.experienceYears) || 3;
      if (filters.experienceLevel === "entry" && expYears > 2) return false;
      if (filters.experienceLevel === "intermediate" && (expYears < 2 || expYears > 5)) return false;
      if (filters.experienceLevel === "expert" && expYears < 5) return false;

      // 6. Verified filter
      if (filters.verifiedOnly && !freelancer.isVerified && !(freelancer.subscriptions?.length > 0)) {
        return false;
      }

      return true;
    });

    // 7. Sorting
    if (filters.sort === "rate_low") {
      list.sort((a, b) => (a.hourlyRate || 500) - (b.hourlyRate || 500));
    } else if (filters.sort === "rate_high") {
      list.sort((a, b) => (b.hourlyRate || 500) - (a.hourlyRate || 500));
    } else if (filters.sort === "jobs_done") {
      list.sort((a, b) => (b.completedProjectsCount || b.projectsCompleted || 1) - (a.completedProjectsCount || a.projectsCompleted || 1));
    } else if (filters.sort === "experience") {
      list.sort((a, b) => (Number(b.experienceYears) || 3) - (Number(a.experienceYears) || 3));
    } else {
      list.sort((a, b) => new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now()));
    }

    return list;
  }, [freelancers, filters]);

  // Load saved projects from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("sb_saved_projects") || "[]");
      setSavedIds(saved);
    } catch (e) {
      setSavedIds([]);
    }
  }, []);

  const handleToggleSave = (projectId) => {
    const nextSaved = savedIds.includes(projectId)
      ? savedIds.filter((id) => id !== projectId)
      : [...savedIds, projectId];
    setSavedIds(nextSaved);
    localStorage.setItem("sb_saved_projects", JSON.stringify(nextSaved));
  };

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(projects.map((project) => project.category)))],
    [projects],
  );
  const skills = useMemo(
    () => [
      "all",
      ...Array.from(
        new Set(
          projects.flatMap((project) => 
            (project.skills || []).flatMap(s => String(s || "").split(",").map(item => item.trim().toLowerCase()))
          )
        )
      )
    ],
    [projects],
  );
  const trendingSkills = useMemo(() => skills.filter((skill) => skill !== "all").slice(0, 8), [skills]);
  const featuredCategories = useMemo(() => categories.filter((category) => category !== "all").slice(0, 6), [categories]);
  const workModes = useMemo(
    () => Array.from(new Set(projects.map((project) => project.location).filter(Boolean))),
    [projects],
  );

  const filteredProjects = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const minBudget = filters.budgetMin !== "" ? Number(filters.budgetMin) : null;
    const maxBudget = filters.budgetMax !== "" ? Number(filters.budgetMax) : null;
    if (minBudget !== null && maxBudget !== null && minBudget > maxBudget) return [];

    const filtered = projects.filter((project) => {
      const matchesSearch =
        !search ||
        project.title.toLowerCase().includes(search) ||
        project.description.toLowerCase().includes(search) ||
        project.skills.some((skill) => skill.toLowerCase().includes(search));

      const matchesCategory = filters.category === "all" || project.category === filters.category;

      let matchesSkill = true;
      if (filters.skill !== "all") {
        const skillGroups = {
          "mern stack": ["react", "node", "express", "mongodb", "mern", "javascript"],
          "machine learning (ml)": ["ml", "machine learning", "python", "pytorch", "tensorflow", "scikit-learn", "numpy", "pandas"],
          "artificial intelligence (ai)": ["ai", "artificial intelligence", "openai", "llm", "prompt engineering", "langchain", "deep learning"],
          "graphics & design": ["figma", "ui", "ux", "design", "illustrator", "photoshop", "ui/ux", "graphics"],
          "mobile development": ["react native", "flutter", "swift", "kotlin", "android", "ios", "mobile"],
          "backend development": ["node", "express", "python", "django", "fastapi", "golang", "postgres", "sql", "mongodb", "prisma"]
        };
        const filterVal = filters.skill.toLowerCase();
        const projectSkills = (project.skills || []).flatMap(s => 
          String(s || "").split(",").map(item => item.trim().toLowerCase())
        );
        if (skillGroups[filterVal]) {
          matchesSkill = skillGroups[filterVal].some(skill => projectSkills.includes(skill));
        } else {
          matchesSkill = projectSkills.includes(filterVal);
        }
      }

      const matchesLocation = filters.location === "all" || project.location === filters.location;
      const matchesMinBudget = minBudget === null || project.budgetMax >= minBudget;
      const matchesMaxBudget = maxBudget === null || project.budgetMin <= maxBudget;

      // Experience Level mockup filter
      const matchesExperience =
        filters.experienceLevel === "all" ||
        (filters.experienceLevel === "entry" && project.budgetMin < 300) ||
        (filters.experienceLevel === "intermediate" && project.budgetMin >= 300 && project.budgetMin < 800) ||
        (filters.experienceLevel === "expert" && project.budgetMin >= 800);

      // Job Type (Fixed vs Hourly) mockup filter
      const matchesType =
        filters.budgetType === "all" ||
        (filters.budgetType === "fixed" && project.budgetMax >= 150) ||
        (filters.budgetType === "hourly" && project.budgetMax < 150);

      // Payment Status mockup filter
      const matchesPayment =
        filters.paymentStatus === "all" ||
        (filters.paymentStatus === "verified" && project.recruiter?.rating > 3) ||
        (filters.paymentStatus === "unverified" && project.recruiter?.rating <= 3);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesSkill &&
        matchesLocation &&
        matchesMinBudget &&
        matchesMaxBudget &&
        matchesExperience &&
        matchesType &&
        matchesPayment
      );
    });

    const uniqueFiltered = Array.from(new Set(filtered.map((p) => p.id)))
      .map((id) => filtered.find((p) => p.id === id));

    return sortProjects(uniqueFiltered, filters.sort);
  }, [projects, filters]);

  const budgetRangeError =
    filters.budgetMin !== "" && filters.budgetMax !== "" && Number(filters.budgetMin) > Number(filters.budgetMax)
      ? "Min budget cannot be greater than max budget."
      : "";

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleClearFilters = () => {
    setFilters(initialFilters);
  };

  const [inviteModalFreelancer, setInviteModalFreelancer] = useState(null);

  const handleInvite = (freelancer) => {
    if (!user) {
      navigate(ROUTES.LOGIN);
      return;
    }
    setInviteModalFreelancer(freelancer);
  };

  const handleBulkInvite = () => {
    if (selectedTalents.length === 0) return;
    const projectTitle = prompt(
      `Invite all ${selectedTalents.length} selected freelancers. Enter project title:`,
      "React Frontend Gig"
    );
    if (!projectTitle) return;

    const requests = JSON.parse(localStorage.getItem("sb_chat_requests") || "[]");
    
    selectedTalents.forEach(talentId => {
      const talent = freelancers.find(f => f.id === talentId);
      if (!talent) return;
      
      const alreadyHired = requests.find(r => r.receiverId === talent.id && r.projectTitle === projectTitle);
      if (alreadyHired) return;

      const newReq = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        senderId: user?.id || "recruiter_1",
        senderName: user?.name || "Hiring Manager",
        senderRole: "Recruiter",
        receiverId: talent.id,
        receiverName: talent.name,
        projectTitle,
        status: "pending",
        createdAt: new Date().toISOString()
      };
      requests.push(newReq);
    });

    localStorage.setItem("sb_chat_requests", JSON.stringify(requests));
    alert(`Bulk invitation successfully sent to all ${selectedTalents.length} candidates!`);
    setSelectedTalents([]);
  };

  const handleHireAIAgent = (agent) => {
    const requests = JSON.parse(localStorage.getItem("sb_chat_requests") || "[]");
    const alreadyHired = requests.find(r => r.receiverId === agent.id);
    if (alreadyHired) {
      alert(`${agent.name} is already active in your chat workspace! Opening Messages.`);
      window.location.href = "/messages";
      return;
    }

    if (!user) {
      alert("Please login first to hire an AI Agent.");
      window.location.href = "/login";
      return;
    }

    if (user.role !== "recruiter") {
      alert("Only client accounts can hire AI Agents.");
      return;
    }

    const priceMap = {
      agent_codex: 400,
      agent_pixelcraft: 300,
      agent_scribe: 150
    };
    const price = priceMap[agent.id] || 100;

    const confirmHire = window.confirm(`Confirm hiring ${agent.name} for ${agent.rate}? (Auto-accepted chat invitation)`);
    if (!confirmHire) return;

    openCheckout({
      amount: price * 100, // in paise
      currency: "INR",
      keyId: "rzp_test_SccNR3IGzdIMlu",
      name: "FreelNova AI Agent Hiring",
      description: `Hire ${agent.name} for autonomous task`,
      prefillName: user.name || "",
      prefillEmail: user.email || "",
      onSuccess: (response) => {
        try {
          const localPayments = JSON.parse(localStorage.getItem("sb_local_payments") || "[]");
          const newPayment = {
            id: `local_pay_${Date.now()}`,
            projectId: `ai_task_${agent.id}`,
            applicantId: agent.id,
            amount: price,
            tax: price * 0.1, 
            net: price * 0.9, 
            status: "paid",
            createdAt: new Date().toISOString()
          };
          localPayments.push(newPayment);
          localStorage.setItem("sb_local_payments", JSON.stringify(localPayments));
        } catch (e) {
          console.error(e);
        }

        const requests = JSON.parse(localStorage.getItem("sb_chat_requests") || "[]");
        const existingIdx = requests.findIndex((r) => r.id === agent.id);
        const newReq = {
          id: agent.id,
          senderId: user.id,
          senderName: user.name || "Hiring Manager",
          senderRole: "Recruiter",
          receiverId: agent.id,
          receiverName: agent.name,
          projectTitle: "AI Autonomous Task",
          status: "accepted",
          createdAt: new Date().toISOString()
        };

        if (existingIdx >= 0) {
          requests[existingIdx] = newReq;
        } else {
          requests.unshift(newReq);
        }
        localStorage.setItem("sb_chat_requests", JSON.stringify(requests));

        const initialMsgs = [
          { sender: "system", text: `${agent.name} has joined the contract workspace.` },
          { sender: "other", text: `Hello! I am ${agent.name}, your autonomous AI assistant. Assign me a task (e.g. 'Write a login page' or 'Generate landing page copy') and I will write the code and simulate execution logs directly in this chat!` }
        ];
        localStorage.setItem(`sb_chat_msgs_${agent.id}`, JSON.stringify(initialMsgs));

        alert(`🎉 Hired ${agent.name}! Opening messages to begin task delegation.`);
        window.location.href = `/messages?chat=${agent.id}`;
      },
      onError: (err) => {
        alert(err?.description || "Payment failed. Payment is required to hire the AI Agent.");
      }
    });
  };

  return (
    <section className="space-y-6">
      {/* Header Banner */}
      <div className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-[16px]">
        <div className="bg-[linear-gradient(135deg,#0f274f_0%,#163d7a_52%,#2563eb_100%)] px-6 py-8 text-white md:px-8 md:py-10">
          <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-50">
            Marketplace
          </span>
          <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Browse Marketplace</h1>
              <p className="mt-2 text-sm text-blue-50/85">
                Explore gig projects and elite freelance talent, or apply to contracts on a secure workspace.
              </p>
            </div>
            {/* Search Type Mode Switcher */}
            <div className="flex bg-white/10 border border-white/15 p-1.5 rounded-2xl text-xs font-semibold">
              {(!user || user.role === "freelancer" || user.role === "admin") && (
                <button
                  onClick={() => setSearchType("projects")}
                  className={`px-4 py-2 rounded-xl transition ${
                    searchType === "projects" ? "bg-white text-blue-950 font-bold" : "text-white/80 hover:text-white"
                  }`}
                >
                  Find Work
                </button>
              )}
              {(!user || user.role === "recruiter") && (
                <button
                  onClick={() => setSearchType("talent")}
                  className={`px-4 py-2 rounded-xl transition ${
                    searchType === "talent" ? "bg-white text-blue-950 font-bold" : "text-white/80 hover:text-white"
                  }`}
                >
                  Find Talent
                </button>
              )}
              {(!user || user.role === "recruiter") && (
                <button
                  onClick={() => setSearchType("ai_agents")}
                  className={`px-4 py-2 rounded-xl transition ${
                    searchType === "ai_agents" ? "bg-white text-blue-950 font-bold" : "text-white/80 hover:text-white"
                  }`}
                >
                  🤖 AI Agents
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="border-t border-slate-200/80 bg-white/70 px-6 py-5 md:px-8">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Categories</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {featuredCategories.map((category) => (
                  <button
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      filters.category === category
                        ? "border-blue-300 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/40"
                    }`}
                    key={category}
                    onClick={() => handleFilterChange("category", category)}
                    type="button"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Trending skills</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {trendingSkills.map((skill) => (
                  <button
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      filters.skill === skill
                        ? "border-blue-300 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/40"
                    }`}
                    key={skill}
                    onClick={() => handleFilterChange("skill", skill)}
                    type="button"
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Filters Sidebar + Search Results */}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Filters Sidebar */}
        <aside className="border border-slate-200/80 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)] rounded-[2rem] p-5 h-fit space-y-4 sticky top-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Filters</h3>
            <button className="text-xs font-semibold text-blue-600 hover:text-blue-700" onClick={handleClearFilters}>
              Reset
            </button>
          </div>

          <div className="space-y-2.5 text-sm">
            {/* Keyword Search */}
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Keyword</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                placeholder="Search phrase..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
              />
            </div>

            {searchType === "projects" && (
              <>
                {/* Budget Type */}
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Budget Type</label>
                  <select
                    value={filters.budgetType}
                    onChange={(e) => handleFilterChange("budgetType", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 font-medium outline-none transition focus:border-blue-400 focus:bg-white"
                  >
                    <option value="all">All Budgets</option>
                    <option value="fixed">Fixed Price</option>
                    <option value="hourly">Hourly Contract</option>
                  </select>
                </div>

                {/* Experience Level */}
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Experience Level</label>
                  <select
                    value={filters.experienceLevel}
                    onChange={(e) => handleFilterChange("experienceLevel", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 font-medium outline-none transition focus:border-blue-400 focus:bg-white"
                  >
                    <option value="all">All Levels</option>
                    <option value="entry">Entry Level (₹)</option>
                    <option value="intermediate">Intermediate (₹₹)</option>
                    <option value="expert">Expert Level (₹₹₹)</option>
                  </select>
                </div>

                {/* Client Payment Verification */}
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Client History</label>
                  <select
                    value={filters.paymentStatus}
                    onChange={(e) => handleFilterChange("paymentStatus", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 font-medium outline-none transition focus:border-blue-400 focus:bg-white"
                  >
                    <option value="all">All Clients</option>
                    <option value="verified">Payment Verified Only</option>
                    <option value="unverified">Payment Unverified</option>
                  </select>
                </div>

                {/* Categories */}
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Category</label>
                  <select
                    value={filters.category}
                    onChange={(e) => handleFilterChange("category", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 font-medium outline-none transition focus:border-blue-400 focus:bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c === "all" ? "All Categories" : c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Budget Min/Max range */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">Min Price</label>
                    <input
                      type="number"
                      value={filters.budgetMin}
                      onChange={(e) => handleFilterChange("budgetMin", e.target.value)}
                      placeholder="Min"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 font-medium outline-none focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">Max Price</label>
                    <input
                      type="number"
                      value={filters.budgetMax}
                      onChange={(e) => handleFilterChange("budgetMax", e.target.value)}
                      placeholder="Max"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 font-medium outline-none focus:bg-white"
                    />
                  </div>
                </div>
              </>
            )}

            {searchType === "talent" && (
              <>
                {/* Core Skill Filter */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Core Skill
                  </label>
                  <select
                    value={filters.skill}
                    onChange={(e) => handleFilterChange("skill", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                  >
                    <option value="all">All Skills</option>
                    <option value="react">React / Frontend</option>
                    <option value="mern stack">MERN Stack</option>
                    <option value="backend development">Backend & APIs</option>
                    <option value="graphics & design">UI/UX & Graphic Design</option>
                    <option value="logo & brand design">Logo & Brand Design</option>
                    <option value="video editing">Video Editing & Motion</option>
                    <option value="mobile development">Mobile Apps (iOS/Android)</option>
                    <option value="artificial intelligence (ai)">Artificial Intelligence (AI)</option>
                    <option value="machine learning (ml)">Machine Learning (ML)</option>
                    <option value="copywriting & content">Copywriting & Content</option>
                    <option value="seo & marketing">SEO & Digital Marketing</option>
                  </select>
                </div>

                {/* Badge Tier Level Filter */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Badge Level Tier
                  </label>
                  <CustomBadgeTierSelect
                    value={filters.badgeLevel || "all"}
                    onChange={(val) => handleFilterChange("badgeLevel", val)}
                  />
                </div>

                {/* Hourly Rate Filter */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Hourly Rate (₹ / hr)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={filters.hourlyMin || ""}
                      onChange={(e) => handleFilterChange("hourlyMin", e.target.value)}
                      placeholder="Min ₹"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-blue-400 transition"
                    />
                    <input
                      type="number"
                      value={filters.hourlyMax || ""}
                      onChange={(e) => handleFilterChange("hourlyMax", e.target.value)}
                      placeholder="Max ₹"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-blue-400 transition"
                    />
                  </div>
                </div>

                {/* Experience Level Filter */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Experience Level
                  </label>
                  <select
                    value={filters.experienceLevel || "all"}
                    onChange={(e) => handleFilterChange("experienceLevel", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                  >
                    <option value="all">Any Experience</option>
                    <option value="entry">Entry Level (0 - 2 Years)</option>
                    <option value="intermediate">Intermediate (2 - 5 Years)</option>
                    <option value="expert">Senior Specialist (5+ Years)</option>
                  </select>
                </div>

                {/* Verified Pros Checkbox Toggle */}
                <div className="pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl hover:bg-slate-100/80 transition">
                    <input
                      type="checkbox"
                      checked={!!filters.verifiedOnly}
                      onChange={(e) => handleFilterChange("verifiedOnly", e.target.checked)}
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Verified Pros Only
                    </span>
                  </label>
                </div>
              </>
            )}

            {/* Sorting */}
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 uppercase tracking-wider">Sort By</label>
              <select
                value={filters.sort}
                onChange={(e) => handleFilterChange("sort", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white transition"
              >
                {searchType === "talent" ? (
                  <>
                    <option value="newest">Newest Members</option>
                    <option value="jobs_done">Most Jobs Completed</option>
                    <option value="rate_low">Hourly Rate: Low to High</option>
                    <option value="rate_high">Hourly Rate: High to Low</option>
                    <option value="experience">Most Experienced</option>
                  </>
                ) : (
                  <>
                    <option value="newest">Newest First</option>
                    <option value="budget_low">Budget: Low to High</option>
                    <option value="budget_high">Budget: High to Low</option>
                    <option value="proposals">Highest Proposals</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </aside>

        {/* Results Stream */}
        <div className="space-y-4 flex flex-col min-h-[350px]">
          {searchType === "projects" ? (
            <>
              {/* Projects Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 border border-slate-200/80 bg-white p-4 rounded-2xl shadow-sm">
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setViewMode("cards")}
                    className={`px-3.5 py-1.5 rounded-lg transition ${
                      viewMode === "cards" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Cards Grid
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`px-3.5 py-1.5 rounded-lg transition ${
                      viewMode === "table" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Table List
                  </button>
                </div>
                <div className="text-xs text-slate-600 font-medium">
                  Showing <span className="font-bold text-slate-900">{filteredProjects.length}</span> active projects
                </div>
              </div>

              {/* Projects List */}
              {isLoading ? (
                <div className="bg-white border border-slate-200 rounded-[2rem] p-8 text-center text-sm text-slate-500">
                  Fetching latest projects...
                </div>
              ) : isError ? (
                <div className="bg-rose-50 border border-rose-200 rounded-[2rem] p-8 text-center text-sm text-rose-700">
                  Failed to load project database.
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-[2rem] p-10 text-center space-y-3">
                  <h3 className="font-bold text-slate-900">No Projects Found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    No results match your selected filters. Try broadening your budget bounds or searching another keyword.
                  </p>
                  <button onClick={handleClearFilters} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
                    Clear Active Filters
                  </button>
                </div>
              ) : viewMode === "cards" ? (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {filteredProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      isSaved={savedIds.includes(project.id)}
                      onToggleSave={handleToggleSave}
                    />
                  ))}
                </div>
              ) : (
                <ProjectsTable projects={filteredProjects} />
              )}
            </>
          ) : searchType === "talent" ? (
            <>
              {/* Talent Browser controls */}
              <div className="flex items-center justify-between border border-slate-200/80 bg-white p-4 rounded-2xl shadow-sm">
                <span className="text-xs text-slate-600 font-medium">
                  Talent pool matching parameters: <span className="font-bold text-slate-900">{filteredFreelancers.length}</span> profiles
                </span>
              </div>

              {/* Freelancers Directory List */}
              {isLoadingFreelancers ? (
                <div className="bg-white border border-slate-200 rounded-[2rem] p-8 text-center text-sm text-slate-500">
                  Searching freelancer profiles...
                </div>
              ) : filteredFreelancers.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-[2rem] p-10 text-center space-y-3">
                  <h3 className="font-bold text-slate-900">No Talent Found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Try searching for another skill like 'React', 'Design', or 'Prisma'.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3">
                    {filteredFreelancers.map((talent) => {
                      const coverImg = talent.portfolioItems?.[0]?.imageUrl || "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80";
                      const isSaved = savedIds.includes(talent.id);
                      const completedJobs = talent.completedProjectsCount || talent.projectsCompleted || talent.contracts?.length || 1;
                      const tierBadge = getFreelancerTierBadge(completedJobs);

                      return (
                        <div
                          key={talent.id}
                          className="border border-slate-200/90 bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between group"
                        >
                          <div>
                            {/* Top Media Cover Banner */}
                            <div className="relative h-40 w-full bg-slate-100 overflow-hidden">
                              <Link to={`/profile/${talent.id}`}>
                                <img
                                  src={coverImg}
                                  alt={talent.name}
                                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleToggleSave(talent.id)}
                                className={`absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center backdrop-blur-md transition cursor-pointer border-0 ${
                                  isSaved ? "bg-rose-500 text-white" : "bg-slate-900/40 text-white hover:bg-slate-900/60"
                                }`}
                              >
                                {isSaved ? "❤️" : "♡"}
                              </button>
                            </div>

                            {/* Card Content */}
                            <div className="p-4 space-y-2.5">
                              {/* Seller Row */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="relative shrink-0">
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 font-black text-white text-xs flex items-center justify-center uppercase border border-slate-200 shadow-xs">
                                      {talent.name?.charAt(0)}
                                    </div>
                                    <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border border-white" />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <Link to={`/profile/${talent.id}`} className="font-extrabold text-xs text-slate-900 truncate hover:text-blue-600">
                                      {talent.name}
                                    </Link>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] font-bold text-blue-600 lowercase">
                                        @{talent.username || (talent.name ? talent.name.toLowerCase().replace(/\s+/g, "") : "user")}
                                      </span>
                                      {(() => {
                                        const proUsers = JSON.parse(localStorage.getItem("sb_pro_user_ids") || "[]");
                                        const isTalentPro = talent.isPro || (talent.subscriptions && talent.subscriptions.length > 0) || proUsers.includes(talent.id);
                                        return isTalentPro ? (
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
                                </div>

                                {/* Dynamic Milestone Tier Badge with 3D Emblem Icon */}
                                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[9px] flex items-center gap-1 ${tierBadge.color}`} title={tierBadge.detail}>
                                  <img src={tierBadge.icon} alt="Badge" className="h-4 w-4 object-contain drop-shadow-xs" />
                                  {tierBadge.label}
                                </span>
                              </div>

                              {/* Gig Title */}
                              <Link to={`/profile/${talent.id}`} className="block">
                                <h4 className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2 hover:text-blue-600 transition-colors">
                                  I will {talent.headline ? talent.headline.toLowerCase() : "deliver full stack web development and ui design"}
                                </h4>
                              </Link>

                              {/* Skills Pills */}
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {(talent.skills || ["React", "Node.js", "UI/UX"]).slice(0, 3).map((sk, sIdx) => (
                                  <span key={sIdx} className="bg-slate-100 text-slate-700 text-[9px] font-semibold px-2 py-0.5 rounded">
                                    {sk}
                                  </span>
                                ))}
                                {(talent.skills?.length || 0) > 3 && (
                                  <span className="bg-slate-100 text-slate-500 text-[9px] font-semibold px-1.5 py-0.5 rounded">
                                    +{(talent.skills.length - 3)}
                                  </span>
                                )}
                              </div>

                              {/* Rating, Experience & Joined Row */}
                              <div className="space-y-1 pt-1.5 border-t border-slate-100">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-1">
                                    <span className="text-amber-500 font-extrabold">★ {talent.ratingAvg ? talent.ratingAvg.toFixed(1) : "4.9"}</span>
                                    <span className="text-slate-500 font-medium text-[11px]">({completedJobs} Jobs Done)</span>
                                  </div>
                                  <span className="font-extrabold text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                                    🎓 {talent.experienceYears || 3}+ yrs exp
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                  <span>📅 {formatMemberJoined(talent.createdAt)}</span>
                                  <span className="text-slate-500 font-semibold">{tierBadge.detail}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Footer Price & Role Row */}
                          <div className="p-4 pt-0 space-y-2">
                            <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between text-xs">
                              <span className="text-xs font-semibold text-slate-500">Hourly Rate</span>
                              <span className="font-black text-slate-900 text-xs bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                                ₹{(talent.hourlyRate || 500).toLocaleString()} / hr
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 pt-1">
                              <span className="font-bold text-[11px] text-slate-700 truncate max-w-[130px]" title={talent.headline || "Full Stack Engineer"}>
                                💼 {talent.headline || "Full Stack Engineer"}
                              </span>
                              <button
                                onClick={() => handleInvite(talent)}
                                className="font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition cursor-pointer border-0 text-xs shrink-0"
                              >
                                Hire / Invite
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bulk Invite Action Bar */}
                  {user?.role === "recruiter" && selectedTalents.length > 0 && (
                    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-slate-900 border border-slate-800 text-white rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-6 justify-between max-w-md w-full">
                      <span className="text-xs font-bold">
                        {selectedTalents.length} Candidate(s) Selected
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedTalents([])}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl px-3 py-2 text-xs font-semibold transition cursor-pointer"
                        >
                          Clear
                        </button>
                        <button
                          onClick={handleBulkInvite}
                          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-xs font-extrabold transition cursor-pointer"
                        >
                          Send Bulk Invite
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {/* AI Agents controls */}
              <div className="flex items-center justify-between border border-slate-200/80 bg-white p-4 rounded-2xl shadow-sm">
                <span className="text-xs text-slate-600 font-medium">
                  Autonomous AI Agent Workforce: <span className="font-bold text-slate-900">3</span> active digital specialists
                </span>
                <button
                  onClick={() => {
                    const requests = JSON.parse(localStorage.getItem("sb_chat_requests") || "[]");
                    const cleared = requests.filter(r => !r.receiverId.startsWith("agent_"));
                    localStorage.setItem("sb_chat_requests", JSON.stringify(cleared));
                    localStorage.removeItem("sb_chat_msgs_agent_codex");
                    localStorage.removeItem("sb_chat_msgs_agent_pixelcraft");
                    localStorage.removeItem("sb_chat_msgs_agent_scribe");
                    alert("AI Agent hiring state reset! You can now test hiring them with the new payment flow.");
                    window.location.reload();
                  }}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl px-3.5 py-1.5 transition cursor-pointer"
                >
                  Reset AI Hires (Testing)
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {AI_AGENT_TALENTS.map((agent) => (
                  <div key={agent.id} className="border border-slate-200/80 bg-white/95 shadow-sm rounded-[1.75rem] p-5 flex flex-col justify-between hover:border-blue-200 transition">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{agent.name}</h3>
                          <p className="text-xs text-blue-600 font-semibold mt-0.5">{agent.headline}</p>
                        </div>
                        <div className="flex items-center text-xs text-amber-500 font-bold bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg">
                          ★ <span className="ml-1 text-slate-700">{agent.ratingAvg}</span>
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                        {agent.bio}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {agent.skills.map((s) => (
                          <span key={s} className="rounded-md bg-slate-50 border border-slate-200 px-2.5 py-0.5 text-[10px] text-slate-600">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                      <div className="text-xs">
                        <span className="text-slate-500">Rate: </span>
                        <span className="font-semibold text-slate-900">{agent.rate}</span>
                      </div>
                      <button
                        onClick={() => handleHireAIAgent(agent)}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 border border-blue-600 text-white px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        Hire AI Agent
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <InviteFreelancerModal
        isOpen={Boolean(inviteModalFreelancer)}
        onClose={() => setInviteModalFreelancer(null)}
        freelancer={inviteModalFreelancer}
      />
    </section>
  );
}

export default Projects;
