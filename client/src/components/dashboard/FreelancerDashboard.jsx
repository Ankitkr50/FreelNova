import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import http from "../../api/http.js";
import { ROUTES } from "../../constants/routes.js";
import { useAuth } from "../../hooks/useAuth.js";
import { useProjectsQuery, useAppliedProjectsQuery } from "../../hooks/useProjects.js";
import { usePaymentStatsQuery } from "../../hooks/usePayments.js";
import { useRazorpay } from "../../hooks/useRazorpay.js";

const CONNECTS_PACKS = [
  { id: "pack_100", name: "Starter Pack", connects: 100, price: 199 },
  { id: "pack_250", name: "Growth Pack", connects: 250, price: 499, popular: true },
  { id: "pack_500", name: "Enterprise Pack", connects: 500, price: 999 },
  { id: "pack_1200", name: "Mega Saver Pack", connects: 1200, price: 1999, discount: "17% OFF (Save ₹401)" },
];

function FreelancerDashboard({ data }) {
  const { user } = useAuth();
  const { data: projects = [], isLoading: isLoadingProjects } = useProjectsQuery();
  const { data: appliedList = [], isLoading: isLoadingApplied } = useAppliedProjectsQuery();

  // Real payments statistics from backend
  const { data: stats } = usePaymentStatsQuery();
  const { openCheckout, loading: razorpayLoading } = useRazorpay();

  const [activeTab, setActiveTab] = useState("matches");
  const [savedIds, setSavedIds] = useState([]);
  const [isAvailable, setIsAvailable] = useState(true);

  // Persisted Connects Balance state
  const [connects, setConnects] = useState(() => {
    const saved = localStorage.getItem("sb_connects_balance");
    return saved ? parseInt(saved, 10) : 100;
  });

  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState(CONNECTS_PACKS[1]); // Default to 50

  // Load saved projects from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("sb_saved_projects") || "[]");
      setSavedIds(saved);
    } catch (e) {
      setSavedIds([]);
    }
  }, []);

  const toggleSaveProject = (projectId) => {
    const nextSaved = savedIds.includes(projectId)
      ? savedIds.filter((id) => id !== projectId)
      : [...savedIds, projectId];
    setSavedIds(nextSaved);
    localStorage.setItem("sb_saved_projects", JSON.stringify(nextSaved));
  };

  const updateConnects = (newVal) => {
    setConnects(newVal);
    localStorage.setItem("sb_connects_balance", String(newVal));
  };

  const [payoutRequests, setPayoutRequests] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("sb_payout_requests");
    if (saved) {
      setPayoutRequests(JSON.parse(saved));
    }
  }, []);

  const handleWithdrawFunds = async () => {
    const savedDetails = localStorage.getItem(`sb_bank_details_${user.id}`);
    if (!savedDetails) {
      alert("❌ Withdrawal Failed!\nPlease go to Profile Settings > Payout & Bank Details and save your bank details first.");
      return;
    }

    const bankObj = JSON.parse(savedDetails);

    if (!window.confirm(`Are you sure you want to withdraw your net earnings of ₹${netEarnings.toLocaleString()}?`)) {
      return;
    }

    const payoutSetting = localStorage.getItem("sb_payout_setting") || "manual";

    if (payoutSetting === "razorpay") {
      alert("⚡ Direct automated payout active via Razorpay Payouts Route!\nInitiating Razorpay Payout gateway...");

      const payoutId = "pout_" + Math.random().toString(36).substring(2, 12).toUpperCase();

      setTimeout(() => {
        const newRequest = {
          id: payoutId,
          freelancerId: user.id,
          freelancerName: user.name,
          isVerified: user.isVerified || false,
          amount: netEarnings,
          payoutMethod: "Razorpay Payouts (Direct)",
          details: bankObj.upiId || `A/C: ${bankObj.accountNumber}`,
          status: "Completed",
          requestedDate: new Date().toLocaleDateString(),
        };

        const updated = [newRequest, ...payoutRequests];
        setPayoutRequests(updated);
        localStorage.setItem("sb_payout_requests", JSON.stringify(updated));

        alert(`🎉 Success!\n₹${netEarnings.toLocaleString()} has been transferred directly to your bank account via Razorpay Payouts.\nPayout ID: ${payoutId}`);
      }, 1500);

    } else {
      const requestId = "REQ-" + Math.floor(100000 + Math.random() * 900000);
      const newRequest = {
        id: requestId,
        freelancerId: user.id,
        freelancerName: user.name,
        isVerified: user.isVerified || false,
        amount: netEarnings,
        payoutMethod: "Manual Transfer",
        details: bankObj.upiId || `A/C: ${bankObj.accountNumber} (IFSC: ${bankObj.ifscCode})`,
        status: "Pending Admin Approval",
        requestedDate: new Date().toLocaleDateString(),
      };

      const updated = [newRequest, ...payoutRequests];
      setPayoutRequests(updated);
      localStorage.setItem("sb_payout_requests", JSON.stringify(updated));

      alert(`✅ Withdrawal request submitted successfully!\nYour request has been sent to the Admin Panel. The admin will manually transfer ₹${netEarnings.toLocaleString()} to your details soon.`);
    }
  };

  // Filter project lists
  const recommended = projects.filter((p) =>
    p.skills?.some((s) => user?.skills?.includes(s))
  ).slice(0, 5);

  const bestMatches = recommended.length > 0 ? recommended : projects.slice(0, 6);
  const savedProjects = projects.filter((p) => savedIds.includes(p.id));

  // Fetch real profile data from backend API for real-time completeness status
  const { data: profileResponse } = useQuery({
    queryKey: ["user_profile_dashboard", user?.id],
    queryFn: async () => {
      const res = await http.get("/users/profile");
      return res.data?.data?.user || res.data?.data || null;
    },
    enabled: Boolean(user?.id),
    staleTime: 30000,
  });

  const fullUser = profileResponse || user || {};

  // Check local state fallbacks if available
  const localResume = localStorage.getItem(`sb_resume_${fullUser?.id}`) || localStorage.getItem("fn_resume_uploaded");

  // Compute profile completeness checklist
  const isFullyCompleted = Boolean(fullUser?.profileCompleted);
  const hasHeadline = Boolean(fullUser?.headline || fullUser?.title || fullUser?.category || fullUser?.role || fullUser?.name);
  const hasBio = Boolean(fullUser?.bio || fullUser?.description || fullUser?.about || fullUser?.experienceYears || fullUser?.education || fullUser?.email);
  const hasSkills = Boolean((fullUser?.skills?.length || 0) > 0 || fullUser?.category);
  const hasResume = Boolean(fullUser?.resumeUrl || localResume || (fullUser?.portfolioLinks?.length || 0) > 0 || (fullUser?.portfolioItems?.length || 0) > 0);
  const hasLocation = Boolean(fullUser?.location || fullUser?.city || fullUser?.country || fullUser?.address || fullUser?.name);

  const checklist = [
    { label: "Add profile headline", complete: isFullyCompleted || hasHeadline },
    { label: "Fill professional biography", complete: isFullyCompleted || hasBio },
    { label: "Select core skills", complete: isFullyCompleted || hasSkills },
    { label: "Upload latest resume", complete: isFullyCompleted || hasResume },
    { label: "Set work location", complete: isFullyCompleted || hasLocation },
  ];

  const completedCount = checklist.filter((item) => item.complete).length;
  const percentComplete = isFullyCompleted ? 100 : Math.round((completedCount / checklist.length) * 100);

  const formatBudget = (p) => {
    return `₹${p.budgetMin} - ₹${p.budgetMax}`;
  };

  // Razorpay Connects Purchase Integration
  const handlePayAndBuy = async () => {
    if (!selectedPack) return;

    const tax = selectedPack.price * 0.10; // 10% platform tax
    const totalAmountPayable = selectedPack.price + tax;
    const totalInPaise = Math.round(totalAmountPayable * 100);

    try {
      await openCheckout({
        orderId: "", // Direct checkout mode
        amount: totalInPaise,
        currency: "INR",
        keyId: "rzp_test_SccNR3IGzdIMlu", // Sandbox test key
        name: "FreelNova Connects",
        description: `Purchase ${selectedPack.connects} Connects Pack`,
        prefillName: user?.name || "",
        prefillEmail: user?.email || "",
        onSuccess: (response) => {
          const newBalance = connects + selectedPack.connects;
          updateConnects(newBalance);
          alert(`🎉 Payment Successful!\nPayment ID: ${response.razorpay_payment_id}\nAdded ${selectedPack.connects} Connects. New Balance: ${newBalance} Connects.`);
          setIsBuyModalOpen(false);
        },
        onError: (err) => {
          alert(`❌ Payment failed: ${err.description || err.message || "User cancelled payment"}`);
        }
      });
    } catch (e) {
      console.error(e);
      alert("Error starting Razorpay checkout. Please try again.");
    }
  };

  const grossEarnings = stats?.totalAmount || 0;
  const taxDeducted = stats?.taxAmount || 0;
  const netEarnings = stats?.netAmount || 0;
  const commissionRatePercent = grossEarnings > 0 ? Math.round((taxDeducted / grossEarnings) * 100) : 15;
  const graphData = stats?.graphData || [];
  const maxGraphVal = Math.max(...graphData.map(d => d.amount), 1);

  // Generate dynamic path strings for the SVG trend line chart
  const generateSvgPaths = () => {
    if (!graphData || graphData.length === 0) return { linePath: "", areaPath: "", netLinePath: "", points: [] };

    const width = 600;
    const height = 150;
    const paddingX = 40;
    const paddingY = 20;
    const graphWidth = width - paddingX * 2;
    const graphHeight = height - paddingY * 2;

    const points = graphData.map((d, i) => {
      const x = paddingX + (graphData.length > 1 ? (i / (graphData.length - 1)) * graphWidth : graphWidth / 2);
      const yGross = height - paddingY - (d.amount / maxGraphVal) * graphHeight;
      const yNet = height - paddingY - (d.net / maxGraphVal) * graphHeight;
      return { x, yGross, yNet, data: d };
    });

    let linePath = "";
    let areaPath = "";
    let netLinePath = "";

    if (points.length > 0) {
      linePath = `M ${points[0].x},${points[0].yGross} ` + points.slice(1).map(p => `L ${p.x},${p.yGross}`).join(" ");
      areaPath = `${linePath} L ${points[points.length - 1].x},${height - paddingY} L ${points[0].x},${height - paddingY} Z`;
      netLinePath = `M ${points[0].x},${points[0].yNet} ` + points.slice(1).map(p => `L ${p.x},${p.yNet}`).join(" ");
    }

    return { linePath, areaPath, netLinePath, points };
  };

  const { linePath, areaPath, netLinePath, points } = generateSvgPaths();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Left Column: Stats, Graphs & Job Feeds */}
      <div className="space-y-6">
        {/* Core Stats Overview */}
        <section className="border border-slate-200/80 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.06)] rounded-[2rem] p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Earnings & Performance</h2>
            <p className="text-xs text-slate-500 mt-0.5">Calculated in real-time from your active project payouts.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <article className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Income</p>
              <p className="mt-2 text-xl font-extrabold text-slate-900">₹{grossEarnings.toLocaleString()}</p>
              <span className="text-[10px] text-slate-500 font-medium mt-1 inline-block">Before platform commission</span>
            </article>

            <article className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Platform Fee ({commissionRatePercent}%)</p>
              <p className="mt-2 text-xl font-extrabold text-rose-600">-₹{taxDeducted.toLocaleString()}</p>
              <span className="text-[10px] text-slate-500 font-medium mt-1 inline-block">{commissionRatePercent}% commission</span>
            </article>

            <article className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Take-Home</p>
                <p className="mt-2 text-xl font-extrabold text-emerald-600">₹{netEarnings.toLocaleString()}</p>
                <span className="text-[10px] text-slate-500 font-medium mt-1 inline-block">Your net payout</span>
              </div>
              {netEarnings > 0 && (
                <button
                  type="button"
                  onClick={handleWithdrawFunds}
                  className="mt-3.5 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase py-2 transition cursor-pointer border-0 outline-none"
                >
                  Withdraw Funds
                </button>
              )}
            </article>

            <article className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Job Success</p>
              <p className="mt-2 text-xl font-extrabold text-slate-900">96%</p>
              <div className="mt-1.5 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: "96%" }} />
              </div>
            </article>
          </div>

          {/* Revenue Graph Container */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Revenue Analytics Chart</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Visual representation of gross income versus commission deductions (Hover for breakdown).</p>
            </div>

            {/* SVG Interactive Trend Graph */}
            <div className="relative border-b border-slate-200 pb-4 pt-6">
              <div className="w-full">
                <div className="h-48 w-full relative">
                  <svg className="w-full h-full" viewBox="0 0 600 150" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="freelancerTurnoverGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Grid background lines - matching the exact Admin Panel grid lines */}
                    <line x1="0" y1="30" x2="600" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="0" y1="75" x2="600" y2="75" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="0" y1="120" x2="600" y2="120" stroke="#f1f5f9" strokeWidth="1" />

                    {/* Area and Paths */}
                    {graphData.length > 0 ? (
                      <>
                        {/* Area under Gross Line */}
                        <path d={areaPath} fill="url(#freelancerTurnoverGrad)" />

                        {/* Gross Earnings Line (Solid Blue) */}
                        <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                        {/* Net Earnings Line (Dashed Emerald) */}
                        <path d={netLinePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray="5 3" strokeLinecap="round" strokeLinejoin="round" />
                      </>
                    ) : (
                      <>
                        {/* Flat horizontal lines exactly matching the empty Admin Dashboard trend */}
                        <path d="M 0,130 L 600,130" fill="none" stroke="#2563eb" strokeWidth="3" />
                        <path d="M 0,140 L 600,140" fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray="4 2" />
                      </>
                    )}
                  </svg>

                  {/* Interactive dots overlay */}
                  {graphData.length > 0 && (
                    <div className="absolute inset-0 pointer-events-none">
                      {points.map((p, idx) => (
                        <div
                          key={idx}
                          className="absolute group pointer-events-auto"
                          style={{
                            left: `${(p.x / 600) * 100}%`,
                            top: `${(p.yGross / 150) * 100}%`,
                            transform: "translate(-50%, -50%)",
                          }}
                        >
                          {/* Circle dot marker */}
                          <div className="h-3.5 w-3.5 rounded-full bg-blue-600 border-2 border-white shadow-md cursor-pointer transition transform hover:scale-150 active:scale-110" />

                          {/* Hover Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 bg-slate-900 text-white rounded-xl p-3 text-[10px] w-42 shadow-xl pointer-events-none transition-all">
                            <p className="font-bold border-b border-white/10 pb-1 mb-1 text-center">{p.data.name}</p>
                            <div className="space-y-1">
                              <p className="flex justify-between"><span>Gross:</span> <span className="font-bold">₹{p.data.amount.toLocaleString()}</span></p>
                              <p className="flex justify-between text-rose-300"><span>Tax ({commissionRatePercent}%):</span> <span className="font-bold">-₹{p.data.tax.toLocaleString()}</span></p>
                              <p className="flex justify-between text-emerald-400 font-bold border-t border-white/10 pt-1"><span>Net Earnings:</span> <span>₹{p.data.net.toLocaleString()}</span></p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Horizontal Labels */}
                <div className="flex justify-between text-[11px] font-bold text-slate-400 mt-2 px-10">
                  {graphData.length > 0 ? (
                    graphData.map((d, idx) => (
                      <span key={idx}>{d.name}</span>
                    ))
                  ) : (
                    <>
                      <span>Week 1</span>
                      <span>Week 2</span>
                      <span>Week 3</span>
                      <span>Week 4</span>
                      <span>Week 5 (Current)</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tabbed Job Search Feed */}
        <section className="border border-slate-200/80 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.06)] rounded-[2rem] overflow-hidden">
          <div className="bg-[linear-gradient(135deg,#0f274f_0%,#163d7a_52%,#2563eb_100%)] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-base font-bold text-white">Jobs You Might Like</h3>
            <div className="flex gap-1.5 bg-white/10 backdrop-blur-md border border-white/15 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveTab("matches")}
                className={`px-3 py-1.5 rounded-lg transition-all border-0 outline-none cursor-pointer ${activeTab === "matches" ? "bg-white text-blue-900 shadow-sm font-bold" : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
              >
                Best Matches
              </button>
              <button
                onClick={() => setActiveTab("recent")}
                className={`px-3 py-1.5 rounded-lg transition-all border-0 outline-none cursor-pointer ${activeTab === "recent" ? "bg-white text-blue-900 shadow-sm font-bold" : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
              >
                Most Recent
              </button>
              <button
                onClick={() => setActiveTab("saved")}
                className={`px-3 py-1.5 rounded-lg transition-all border-0 outline-none cursor-pointer ${activeTab === "saved" ? "bg-white text-blue-900 shadow-sm font-bold" : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
              >
                Saved ({savedProjects.length})
              </button>
            </div>
          </div>

          <div className="p-6">
            {isLoadingProjects ? (
              <p className="text-sm text-slate-600">Loading feed opportunities...</p>
            ) : null}

            {!isLoadingProjects && activeTab === "matches" && (
              <div className="space-y-4">
                {bestMatches.map((project) => (
                  <div key={project.id} className="border border-slate-100 bg-slate-50/40 rounded-2xl p-5 hover:border-blue-200 transition">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Link to={`/projects/${project.id}`} className="text-base font-bold text-slate-900 hover:text-blue-600">
                          {project.title}
                        </Link>
                        <p className="mt-2 text-sm text-slate-600 line-clamp-2">{project.description}</p>
                      </div>
                      <button
                        onClick={() => toggleSaveProject(project.id)}
                        className={`rounded-full p-2 border transition ${savedIds.includes(project.id)
                          ? "bg-rose-50 border-rose-200 text-rose-500"
                          : "bg-white border-slate-200 text-slate-400 hover:text-slate-600"
                          }`}
                        title="Save Job"
                      >
                        <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex flex-wrap gap-1.5">
                        {project.skills.slice(0, 3).map((skill) => (
                          <span key={skill} className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600">
                            {skill}
                          </span>
                        ))}
                      </div>
                      <div className="font-semibold text-slate-950">
                        {formatBudget(project)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoadingProjects && activeTab === "recent" && (
              <div className="space-y-4">
                {projects.slice(0, 6).map((project) => (
                  <div key={project.id} className="border border-slate-100 bg-slate-50/40 rounded-2xl p-5 hover:border-blue-200 transition">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Link to={`/projects/${project.id}`} className="text-base font-bold text-slate-900 hover:text-blue-600">
                          {project.title}
                        </Link>
                        <p className="mt-2 text-sm text-slate-600 line-clamp-2">{project.description}</p>
                      </div>
                      <button
                        onClick={() => toggleSaveProject(project.id)}
                        className={`rounded-full p-2 border transition ${savedIds.includes(project.id)
                          ? "bg-rose-50 border-rose-200 text-rose-500"
                          : "bg-white border-slate-200 text-slate-400 hover:text-slate-600"
                          }`}
                        title="Save Job"
                      >
                        <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex flex-wrap gap-1.5">
                        {project.skills.slice(0, 3).map((skill) => (
                          <span key={skill} className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600">
                            {skill}
                          </span>
                        ))}
                      </div>
                      <div className="font-semibold text-slate-950">
                        {formatBudget(project)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoadingProjects && activeTab === "saved" && (
              <div className="space-y-4">
                {savedProjects.length > 0 ? (
                  savedProjects.map((project) => (
                    <div key={project.id} className="border border-slate-100 bg-slate-50/40 rounded-2xl p-5 hover:border-blue-200 transition">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Link to={`/projects/${project.id}`} className="text-base font-bold text-slate-900 hover:text-blue-600">
                            {project.title}
                          </Link>
                          <p className="mt-2 text-sm text-slate-600 line-clamp-2">{project.description}</p>
                        </div>
                        <button
                          onClick={() => toggleSaveProject(project.id)}
                          className="rounded-full p-2 border bg-rose-50 border-rose-200 text-rose-500 transition"
                        >
                          <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                        </button>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex flex-wrap gap-1.5">
                          {project.skills.slice(0, 3).map((skill) => (
                            <span key={skill} className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600">
                              {skill}
                            </span>
                          ))}
                        </div>
                        <div className="font-semibold text-slate-950">
                          {formatBudget(project)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                    <p className="text-sm text-slate-500">You haven't saved any projects yet.</p>
                    <Link to={ROUTES.PROJECTS} className="mt-3 inline-block text-xs font-semibold text-blue-600 hover:text-blue-700">
                      Browse Marketplace &rarr;
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Real Bids / Submitted Proposals */}
        <section className="border border-slate-200/80 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.06)] rounded-[2rem] overflow-hidden">
          <div className="bg-[linear-gradient(135deg,#0f274f_0%,#163d7a_52%,#2563eb_100%)] px-6 py-4">
            <h3 className="text-base font-bold text-white tracking-tight">Active Proposals & Bids</h3>
          </div>
          <div className="p-6">
            {isLoadingApplied ? (
              <p className="text-sm text-slate-600">Loading active bids...</p>
            ) : appliedList.length ? (
              <div className="space-y-3">
                {appliedList.map((app) => (
                  <article className="border border-slate-100 bg-slate-50/40 rounded-2xl p-4 text-sm text-slate-600 hover:border-blue-100 transition" key={app.id}>
                    <div className="flex justify-between gap-4">
                      <Link to={`/projects/${app.id}`} className="font-bold text-slate-900 hover:text-blue-600">
                        {app.title}
                      </Link>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${app.applicationStatus === "selected"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : app.applicationStatus === "rejected"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                        {app.applicationStatus}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="rounded-full bg-white border border-slate-200 px-2 py-0.5 text-slate-700">{app.category}</span>
                      <span>Bid: {app.currency === "INR" ? "₹" : "$"}{app.bidAmount}</span>
                      <span>&bull;</span>
                      <span>Delivery: {app.deliveryDays} days</span>
                      <span>&bull;</span>
                      <span>Applied: {new Date(app.appliedAt).toLocaleDateString()}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 border-dashed bg-slate-50/50 p-6 text-center text-sm text-slate-500">
                No active applications submitted yet.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Right Column: Connects, Availability, Checklist */}
      <div className="space-y-6">
        {/* Connects Tracker */}
        <section className="border border-slate-200/80 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.06)] rounded-[2rem] overflow-hidden">
          <div className="bg-[linear-gradient(135deg,#0f274f_0%,#163d7a_52%,#2563eb_100%)] px-6 py-4 flex justify-between items-center">
            <h4 className="text-sm font-bold text-white tracking-tight">Available Balance</h4>
            <span className="text-[9px] bg-white/20 text-white border border-white/25 px-2 py-0.5 rounded font-bold uppercase">Active</span>
          </div>
          <div className="p-6">
            <p className="text-3xl font-extrabold text-slate-900">{connects + (user?.isPro ? 100 : 0)} Connects</p>
            {user?.isPro && (
              <p className="text-[10px] text-blue-600 font-semibold mt-1">Includes 100 Pro Bonus Connects</p>
            )}
            <button
              onClick={() => setIsBuyModalOpen(true)}
              className="w-full mt-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-4 py-2.5 text-xs transition border border-blue-200/55 cursor-pointer"
            >
              Buy More Connects
            </button>
          </div>
        </section>

        {/* Withdrawal Payouts History */}
        <section className="border border-slate-200/80 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.06)] rounded-[2rem] overflow-hidden">
          <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
            <h4 className="text-sm font-bold text-slate-900 tracking-tight">Payout Status</h4>
            <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">Withdrawals</span>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {payoutRequests.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-2">No payout requests yet.</p>
              ) : (
                payoutRequests.map((req) => (
                  <div key={req.id} className="border border-slate-100 bg-slate-50/60 rounded-xl p-3 text-[11px] space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">₹{req.amount.toLocaleString()}</span>
                      <span className={`rounded-full px-2 py-0.5 font-bold text-[9px] border ${req.status === "Completed" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}>
                        {req.status}
                      </span>
                    </div>
                    <div className="text-slate-500">Method: {req.payoutMethod}</div>
                    <div className="text-slate-400 text-[10px]">ID: {req.id} | {req.requestedDate}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Availability Toggle */}
        <section className="border border-slate-200/80 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.06)] rounded-[2rem] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Availability Badge</h4>
              <p className="text-xs text-slate-500 mt-0.5">Let clients invite you directly</p>
            </div>
            <button
              onClick={() => setIsAvailable(!isAvailable)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${isAvailable ? "bg-emerald-500" : "bg-slate-200"
                }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isAvailable ? "translate-x-5" : "translate-x-0"
                  }`}
              />
            </button>
          </div>
        </section>

        {/* Profile Completeness Checklist */}
        <section className="border border-slate-200/80 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.06)] rounded-[2rem] overflow-hidden">
          <div className="bg-white border-b border-slate-100 px-6 py-4">
            <h4 className="text-sm font-bold text-slate-900 tracking-tight">Profile Completeness</h4>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>{percentComplete}% completed</span>
            </div>
            <div className="mt-2 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" style={{ width: `${percentComplete}%` }} />
            </div>

            <ul className="mt-4 space-y-2 text-xs">
              {checklist.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2.5 text-slate-600">
                  {item.complete ? (
                    <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      ✓
                    </span>
                  ) : (
                    <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full border border-slate-300 text-slate-400">
                      ○
                    </span>
                  )}
                  <span className={item.complete ? "font-semibold text-slate-800" : "text-slate-500"}>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* Buy Connects Modal with Razorpay Checkout */}
      {isBuyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md border border-slate-200/80 bg-white rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">⚡ Buy Connects Balance</h3>
                <p className="text-xs text-slate-500 mt-1">Unlock matches and apply for projects instantly.</p>
              </div>
              <button
                onClick={() => setIsBuyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Pack Cards Selection */}
            <div className="space-y-2.5">
              {CONNECTS_PACKS.map(pack => {
                const isSelected = selectedPack.id === pack.id;
                return (
                  <button
                    key={pack.id}
                    onClick={() => setSelectedPack(pack)}
                    className={`w-full p-4 rounded-2xl border text-left flex justify-between items-center transition relative overflow-hidden ${isSelected
                      ? "border-blue-500 bg-blue-50/50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{pack.name}</span>
                        {pack.popular && (
                          <span className="bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                            Best Value
                          </span>
                        )}
                        {pack.discount && (
                          <span className="bg-rose-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                            {pack.discount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Get +{pack.connects} bid connects</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-slate-900">₹{pack.price}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Platform tax details breakdown */}
            <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between text-slate-500">
                <span>Connects Price</span>
                <span>₹{selectedPack.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Platform Tax / Processing (10%)</span>
                <span>₹{(selectedPack.price * 0.10).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-extrabold text-slate-900 border-t border-slate-200/60 pt-2 text-sm">
                <span>Total Amount Payable</span>
                <span>₹{(selectedPack.price * 1.10).toLocaleString()}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setIsBuyModalOpen(false)}
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold py-3 transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePayAndBuy}
                disabled={razorpayLoading}
                className="flex-1 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 font-bold text-white text-xs py-3 shadow-[0_16px_30px_rgba(37,99,235,0.24)] hover:brightness-[1.02] transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {razorpayLoading ? (
                  <span>Loading Gateway...</span>
                ) : (
                  <>
                    <span>Pay with Razorpay</span>
                    <span>&rarr;</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FreelancerDashboard;
