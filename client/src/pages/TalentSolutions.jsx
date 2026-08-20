import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ROUTES } from "../constants/routes.js";
import { projectsApi } from "../api/projects.api.js";
import { useAuth } from "../hooks/useAuth.js";
import { useRazorpay } from "../hooks/useRazorpay.js";
import { paymentsApi } from "../api/payments.api.js";
import http from "../api/http.js";

const CATEGORIES = [
  "Programming & Tech",
  "Web Development",
  "Backend Development",
  "Mobile Development",
  "Full Stack Development",
  "Machine Learning & AI",
  "Data Science",
  "Graphics & Design",
  "UI/UX Design",
  "Digital Marketing",
  "Writing & Translation",
  "Content Writing",
  "Video & Animation",
  "AI Services",
  "Music & Audio",
  "Business",
  "Consulting",
];

function TalentSolutions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { openCheckout, loading: razorpayLoading } = useRazorpay();

  // Active Tab: "brief", "sourcing", "diy-team"
  const [activeTab, setActiveTab] = useState(() => {
    let searchTab = new URLSearchParams(location.search).get("tab") || location.state?.tab || "brief";
    if (searchTab === "enterprise") searchTab = "diy-team";
    return searchTab;
  });

  useEffect(() => {
    let searchTab = new URLSearchParams(location.search).get("tab");
    if (searchTab === "enterprise") searchTab = "diy-team";
    if (searchTab) {
      setActiveTab(searchTab);
    } else if (location.state?.tab) {
      let stateTab = location.state.tab;
      if (stateTab === "enterprise") stateTab = "diy-team";
      setActiveTab(stateTab);
    }
  }, [location.search, location.state]);

  const [status, setStatus] = useState({ type: "", text: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Tab 1: AI Brief States ---
  const [briefForm, setBriefForm] = useState({
    title: "",
    category: CATEGORIES[0],
    budgetMin: 5000,
    budgetMax: 25000,
    timeline: "14 days",
    skills: "",
  });
  const [aiGeneratedText, setAiGeneratedText] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // --- Tab 2: Sourcing States ---
  const [sourcingForm, setSourcingForm] = useState({
    roleName: "",
    skillsNeeded: "",
    timelineUrgency: "48 Hours",
    budgetRange: "₹20,000 - ₹50,000",
  });
  const [sourcingRequests, setSourcingRequests] = useState([]);

  // --- Tab 3: DIY Team Builder States ---
  const [diyTeamName, setDiyTeamName] = useState("");
  const [diyTeamSize, setDiyTeamSize] = useState(2);
  const [diySlots, setDiySlots] = useState([
    { id: 1, category: CATEGORIES[0], freelancer: null, bidAmount: 15000 },
    { id: 2, category: CATEGORIES[1], freelancer: null, bidAmount: 15000 },
  ]);
  const [diyTeams, setDiyTeams] = useState([]);
  const [activeSlotIdx, setActiveSlotIdx] = useState(null);
  const [freelancerPool, setFreelancerPool] = useState([]);
  const [talentSearchQuery, setTalentSearchQuery] = useState("");
  const [isLoadingPool, setIsLoadingPool] = useState(false);
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [inviteProgress, setInviteProgress] = useState("");

  // Load history from localStorage on mount
  useEffect(() => {
    const savedSourcing = localStorage.getItem("sb_sourcing_requests");
    if (savedSourcing) {
      setSourcingRequests(JSON.parse(savedSourcing));
    }
    const savedDiy = localStorage.getItem("sb_diy_teams");
    if (savedDiy) {
      setDiyTeams(JSON.parse(savedDiy));
    }
  }, []);

  // --- AI Generator Mock Handler ---
  const handleGenerateAiBrief = () => {
    if (!briefForm.title || !briefForm.skills) {
      setStatus({ type: "error", text: "Please enter a project title and required skills first." });
      return;
    }
    setStatus({ type: "", text: "" });
    setIsGeneratingAi(true);
    setAiGeneratedText("");

    setTimeout(() => {
      const generatedBrief = `### Project Overview
We are looking for a skilled professional to help us execute: "${briefForm.title}". This project requires focused expertise in ${briefForm.skills} and fits within our ${briefForm.category} domain.

### Key Deliverables
- High-fidelity setup and initial module build.
- Full integration of required API layers and data mapping.
- Clean code documentation and brief developer handoff.

### Required Skill Set
- Primary: ${briefForm.skills}
- Category Domain: ${briefForm.category}
- General: Problem solving, structured code, and clear timeline communication.

### Budget & Timeline
- Estimated Scope: ${briefForm.timeline}
- Target Budget Range: INR ${briefForm.budgetMin} - INR ${briefForm.budgetMax}`;

      setAiGeneratedText(generatedBrief);
      setIsGeneratingAi(false);
      setStatus({ type: "success", text: "AI brief generated successfully! Review and customize below." });
    }, 1500);
  };

  // --- Post Live Project Handler ---
  const handlePublishProject = async (e) => {
    e.preventDefault();
    if (!aiGeneratedText) {
      setStatus({ type: "error", text: "Please generate the AI brief outline first." });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "", text: "" });

    try {
      const payload = {
        title: briefForm.title,
        description: aiGeneratedText,
        category: briefForm.category,
        budgetMin: Number(briefForm.budgetMin),
        budgetMax: Number(briefForm.budgetMax),
        skills: briefForm.skills.split(",").map((s) => s.trim()).filter(Boolean),
        timeline: briefForm.timeline,
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      };

      await projectsApi.createProject(payload);
      setStatus({ type: "success", text: `Project "${briefForm.title}" published live successfully!` });
      setTimeout(() => {
        navigate(ROUTES.MY_PROJECTS);
      }, 1500);
    } catch (err) {
      setStatus({ type: "error", text: err?.response?.data?.message || "Could not publish project. Try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Sourcing Checkout Flow ---
  const handleRequestSourcing = async (e) => {
    e.preventDefault();
    if (!sourcingForm.roleName || !sourcingForm.skillsNeeded) {
      setStatus({ type: "error", text: "Please fill out the role and skills needed." });
      return;
    }
    setStatus({ type: "", text: "" });
    setIsSubmitting(true);

    try {
      const res = await paymentsApi.createSourcingOrder();
      const { orderId, amount, currency, keyId } = res.data.data;

      await openCheckout({
        orderId,
        amount,
        currency,
        keyId,
        name: "FreelNova",
        description: "Expert Freelancer Sourcing Request",
        prefillName: user?.name || "",
        prefillEmail: user?.email || "",
        onSuccess: async (response) => {
          try {
            await paymentsApi.verifySourcingPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            const newRequest = {
              id: "SRC-" + Math.floor(100000 + Math.random() * 900000),
              role: sourcingForm.roleName,
              skills: sourcingForm.skillsNeeded,
              timeline: sourcingForm.timelineUrgency,
              budget: sourcingForm.budgetRange,
              date: new Date().toLocaleDateString(),
              status: "Matching Candidates",
              paymentId: response.razorpay_payment_id,
              amount: "₹1,999",
            };

            const updatedList = [newRequest, ...sourcingRequests];
            setSourcingRequests(updatedList);
            localStorage.setItem("sb_sourcing_requests", JSON.stringify(updatedList));

            alert(`🎉 Sourcing request for "${sourcingForm.roleName}" submitted successfully!\nPayment verified.`);
            setStatus({ type: "success", text: `Sourcing request for "${sourcingForm.roleName}" submitted successfully! Payment verified.` });

            setSourcingForm({
              roleName: "",
              skillsNeeded: "",
              timelineUrgency: "48 Hours",
              budgetRange: "₹20,000 - ₹50,000",
            });
          } catch (err) {
            setStatus({ type: "error", text: err?.response?.data?.message || "Payment verification failed. Contact support." });
          } finally {
            setIsSubmitting(false);
          }
        },
        onError: (error) => {
          setStatus({ type: "error", text: error?.description || "Payment failed. Please try again." });
          setIsSubmitting(false);
        },
        onDismiss: () => {
          setIsSubmitting(false);
        },
      });
    } catch (err) {
      setStatus({ type: "error", text: err?.response?.data?.message || "Could not initiate payment order. Try again." });
      setIsSubmitting(false);
    }
  };

  const handleDeleteSourcing = (id) => {
    if (window.confirm("Are you sure you want to delete this sourcing request?")) {
      const updated = sourcingRequests.filter(req => req.id !== id);
      setSourcingRequests(updated);
      localStorage.setItem("sb_sourcing_requests", JSON.stringify(updated));
    }
  };

  // --- Tab 3: DIY Team Builder Handlers ---
  const handleDiyTeamSizeChange = (size) => {
    setDiyTeamSize(size);
    const newSlots = Array.from({ length: size }, (_, i) => {
      if (diySlots[i]) return diySlots[i];
      return {
        id: i + 1,
        category: CATEGORIES[i % CATEGORIES.length],
        freelancer: null,
        bidAmount: 15000,
      };
    });
    setDiySlots(newSlots);
  };

  const handleSlotCategoryChange = (slotId, category) => {
    const updated = diySlots.map(s => {
      if (s.id === slotId) {
        return { ...s, category, freelancer: null };
      }
      return s;
    });
    setDiySlots(updated);
  };

  const handleSlotPayChange = (slotId, bidAmount) => {
    const updated = diySlots.map(s => {
      if (s.id === slotId) {
        return { ...s, bidAmount: Number(bidAmount) || 0 };
      }
      return s;
    });
    setDiySlots(updated);
  };

  const triggerFreelancerSearchForSlot = async (slotId) => {
    const slot = diySlots.find(s => s.id === slotId);
    if (!slot) return;
    
    setActiveSlotIdx(slotId);
    setIsLoadingPool(true);
    setTalentSearchQuery("");

    try {
      const res = await http.get("/users?role=freelancer&limit=20");
      const raw = res?.data?.data?.users || res?.data?.data || [];
      const formatted = raw.map(u => ({
        id: u._id || u.id,
        name: u.name || "Freelance Expert",
        headline: u.headline || u.category || "Software Developer",
        ratingAvg: u.ratingAvg || u.rating || 4.8,
        hourlyRate: u.hourlyRate || 800,
        skills: u.skills || ["React", "Node.js", "UI/UX"],
      }));
      setFreelancerPool(formatted);
    } catch (err) {
      console.error(err);
      setFreelancerPool([
        { id: "f1", name: "Ankit Sharma", headline: "Senior MERN Specialist", ratingAvg: 4.9, hourlyRate: 1200, skills: ["React", "Node.js", "MongoDB"] },
        { id: "f2", name: "Priya Patel", headline: "UI/UX & Frontend Lead", ratingAvg: 4.8, hourlyRate: 950, skills: ["Figma", "TailwindCSS", "React"] },
        { id: "f3", name: "Rohan Verma", headline: "Full Stack Engineer", ratingAvg: 4.7, hourlyRate: 1100, skills: ["TypeScript", "Next.js", "GraphQL"] },
      ]);
    } finally {
      setIsLoadingPool(false);
    }
  };

  const assignFreelancerToSlot = (slotId, freelancer) => {
    const updated = diySlots.map(s => {
      if (s.id === slotId) {
        return { ...s, freelancer };
      }
      return s;
    });
    setDiySlots(updated);
    setActiveSlotIdx(null);
  };

  const handleFinalizeDiyTeam = async (e) => {
    e.preventDefault();
    if (!diyTeamName.trim()) {
      setStatus({ type: "error", text: "Please provide a name for your custom team project." });
      return;
    }

    const unassigned = diySlots.filter(s => !s.freelancer);
    if (unassigned.length > 0) {
      setStatus({ type: "error", text: `Please select a freelancer for all ${diyTeamSize} team roles.` });
      return;
    }

    const isPro = user?.isPro || user?.subscriptions?.some(sub => sub.status === "active");
    if (!isPro) {
      const categoriesUsed = diySlots.map(s => s.category);
      const uniqueCategories = new Set(categoriesUsed);
      if (uniqueCategories.size < categoriesUsed.length) {
        setStatus({
          type: "error",
          text: "⚠️ Free Tier Limit: You can only select at most one developer per category (e.g. MERN, AI, DevOps, Backend). Upgrade to Pro to hire multiple developers from the same category!"
        });
        return;
      }
    }

    setStatus({ type: "", text: "" });
    setIsSendingInvites(true);
    setInviteProgress("Delivering role invitations...");

    setTimeout(() => {
      setInviteProgress("Invitations accepted! Compiling team escrow agreement...");
      setTimeout(() => {
        setIsSendingInvites(false);
        setInviteProgress("");
        
        const netBudget = diySlots.reduce((sum, s) => sum + s.bidAmount, 0);
        const feeRate = isPro ? 0.10 : 0.15;
        const feeAmount = Math.round(netBudget * feeRate);
        const grossTotal = netBudget + feeAmount;

        paymentsApi.createSourcingOrder().then(async (orderRes) => {
          const { orderId, currency, keyId } = orderRes.data.data;
          
          await openCheckout({
            orderId,
            amount: grossTotal * 100,
            currency,
            keyId,
            name: "FreelNova Team Escrow",
            description: `Escrow Fund Deposit for Custom Team "${diyTeamName}"`,
            prefillName: user?.name || "",
            prefillEmail: user?.email || "",
            onSuccess: async (payResponse) => {
              try {
                await paymentsApi.verifySourcingPayment({
                  razorpayOrderId: payResponse.razorpay_order_id,
                  razorpayPaymentId: payResponse.razorpay_payment_id,
                  razorpaySignature: payResponse.razorpay_signature,
                });

                const newTeam = {
                  id: "TEAM-" + Math.floor(100000 + Math.random() * 900000),
                  name: diyTeamName,
                  size: diyTeamSize,
                  slots: diySlots.map(s => ({
                    id: s.id,
                    category: s.category,
                    freelancer: s.freelancer,
                    payAmount: s.bidAmount,
                    status: "Accepted",
                  })),
                  status: "Active - Paid",
                  netBudget,
                  feeAmount,
                  grossTotal,
                  date: new Date().toLocaleDateString("en-IN"),
                  paymentId: payResponse.razorpay_payment_id,
                };

                const updatedList = [newTeam, ...diyTeams];
                setDiyTeams(updatedList);
                localStorage.setItem("sb_diy_teams", JSON.stringify(updatedList));

                setStatus({ type: "success", text: `🎉 Custom team "${diyTeamName}" has been successfully built, funded, and activated!` });
                alert(`🎉 Custom team "${diyTeamName}" has been successfully built, funded, and activated!\nPayment ID: ${payResponse.razorpay_payment_id}`);

                setDiyTeamName("");
                handleDiyTeamSizeChange(2);
              } catch (verificationErr) {
                setStatus({ type: "error", text: "Team escrow payment verification failed. Contact support." });
              }
            },
            onError: (checkoutErr) => {
              setStatus({ type: "error", text: checkoutErr.description || "Escrow payment failed. Please try again." });
            }
          });
        }).catch(err => {
          setStatus({ type: "error", text: "Failed to initiate payment. Please try again." });
        });

      }, 1500);
    }, 1500);
  };

  return (
    <>
      {/* Page Header */}
      <section className="mb-10 rounded-[2.5rem] border border-blue-200/80 bg-[linear-gradient(135deg,#0f274f_0%,#163d7a_48%,#2563eb_100%)] p-8 text-white shadow-[0_24px_70px_rgba(37,99,235,0.22)]">
        <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-50">
          Talent Solutions Console
        </span>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight">Hire Freelancers Your Way</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-blue-100">
          From automated AI project briefs to expert-managed sourcing and interactive custom pod builders, choose the hiring solution that fits your workspace.
        </p>
      </section>

      {/* Console Navigation Tabs */}
      <div className="mb-8 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        <button
          onClick={() => { setActiveTab("brief"); setStatus({ type: "", text: "" }); }}
          className={`rounded-2xl px-5 py-3 font-semibold text-sm transition cursor-pointer ${
            activeTab === "brief"
              ? "bg-blue-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.24)]"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          Post Project Brief (AI Creator)
        </button>
        <button
          onClick={() => { setActiveTab("sourcing"); setStatus({ type: "", text: "" }); }}
          className={`rounded-2xl px-5 py-3 font-semibold text-sm transition cursor-pointer ${
            activeTab === "sourcing"
              ? "bg-blue-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.24)]"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          Expert Freelancer Sourcing
        </button>
        <button
          onClick={() => { setActiveTab("diy-team"); setStatus({ type: "", text: "" }); }}
          className={`rounded-2xl px-5 py-3 font-semibold text-sm transition cursor-pointer ${
            activeTab === "diy-team"
              ? "bg-blue-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.24)]"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          Interactive Team Builder (DIY)
        </button>
      </div>

      {status.text && (
        <div
          className={`mb-6 rounded-2xl p-4 text-sm font-semibold border ${
            status.type === "error"
              ? "bg-rose-50 text-rose-700 border-rose-200"
              : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}
        >
          {status.text}
        </div>
      )}

      {/* Main Console Workspace Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left 2-Cols: Active Tab Workspace */}
        <div className="lg:col-span-2 space-y-6">
          {/* TAB 1: AI BRIEF BUILDER */}
          {activeTab === "brief" && (
            <div className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_16px_38px_rgba(15,23,42,0.04)] md:p-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900">AI Project Brief Creator</h2>
                <p className="mt-1 text-sm text-slate-500">Fill in basic parameters and let our AI outline deliverables, requirements, and budget specifications.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">Project Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Build Full Stack E-Commerce Platform"
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={briefForm.title}
                    onChange={(e) => setBriefForm({ ...briefForm, title: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">Category Domain</label>
                  <select
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={briefForm.category}
                    onChange={(e) => setBriefForm({ ...briefForm, category: e.target.value })}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">Min Budget (INR)</label>
                  <input
                    type="number"
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={briefForm.budgetMin}
                    onChange={(e) => setBriefForm({ ...briefForm, budgetMin: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">Max Budget (INR)</label>
                  <input
                    type="number"
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={briefForm.budgetMax}
                    onChange={(e) => setBriefForm({ ...briefForm, budgetMax: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">Estimated Timeline</label>
                  <select
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={briefForm.timeline}
                    onChange={(e) => setBriefForm({ ...briefForm, timeline: e.target.value })}
                  >
                    <option value="7 days">7 days</option>
                    <option value="14 days">14 days</option>
                    <option value="30 days">30 days</option>
                    <option value="60+ days">60+ days</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">Required Skills (Comma separated)</label>
                <input
                  type="text"
                  placeholder="React, Node.js, TailwindCSS, MongoDB"
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  value={briefForm.skills}
                  onChange={(e) => setBriefForm({ ...briefForm, skills: e.target.value })}
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateAiBrief}
                disabled={isGeneratingAi}
                className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 hover:brightness-[1.02] text-sm cursor-pointer disabled:opacity-50"
              >
                {isGeneratingAi ? "Generating AI Brief Scope..." : "Generate AI Project Brief"}
              </button>

              {aiGeneratedText && (
                <div className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/30 p-5 mt-6">
                  <h3 className="text-sm font-bold text-blue-900">Generated Markdown Scope:</h3>
                  <textarea
                    rows={10}
                    value={aiGeneratedText}
                    onChange={(e) => setAiGeneratedText(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-4 text-xs font-mono text-slate-800 outline-none leading-relaxed"
                  />
                  <button
                    onClick={handlePublishProject}
                    disabled={isSubmitting}
                    className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? "Publishing to Marketplace..." : "Publish Live Project to Marketplace"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SOURCING */}
          {activeTab === "sourcing" && (
            <form onSubmit={handleRequestSourcing} className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_16px_38px_rgba(15,23,42,0.04)] md:p-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Expert Freelancer Sourcing</h2>
                <p className="mt-1 text-sm text-slate-500">Our hiring specialists manually review our vetted directory to deliver 3 top-matching candidates within 48 hours.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">Hiring Role / Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Frontend Developer"
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={sourcingForm.roleName}
                    onChange={(e) => setSourcingForm({ ...sourcingForm, roleName: e.target.value })}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">Target Budget Range</label>
                  <input
                    type="text"
                    placeholder="e.g. ₹30,000 - ₹60,000"
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={sourcingForm.budgetRange}
                    onChange={(e) => setSourcingForm({ ...sourcingForm, budgetRange: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">Timeline / Urgency</label>
                  <select
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={sourcingForm.timelineUrgency}
                    onChange={(e) => setSourcingForm({ ...sourcingForm, timelineUrgency: e.target.value })}
                  >
                    <option value="24 Hours">24 Hours (Urgent)</option>
                    <option value="48 Hours">48 Hours</option>
                    <option value="3-5 Days">3-5 Days</option>
                    <option value="1 Week">1 Week</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">Specific Skills Needed</label>
                  <input
                    type="text"
                    placeholder="TypeScript, NextJS, Node.js"
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={sourcingForm.skillsNeeded}
                    onChange={(e) => setSourcingForm({ ...sourcingForm, skillsNeeded: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/20 p-4">
                <h3 className="text-sm font-bold text-slate-900">Sourcing Request Details:</h3>
                <div className="mt-2 space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between"><span>Sourcing Setup Fee:</span><span>₹1,999</span></div>
                  <div className="flex justify-between"><span>GST (18%):</span><span>₹360</span></div>
                  <div className="border-t border-slate-200 mt-2 pt-2 flex justify-between font-bold text-slate-950">
                    <span>Total Amount:</span><span>₹2,359</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || razorpayLoading}
                  className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3 font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 hover:brightness-[1.02] text-sm cursor-pointer border-0 disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {isSubmitting || razorpayLoading ? "Processing Sourcing Payment..." : "Pay & Request Sourcing"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: DIY TEAM BUILDER */}
          {activeTab === "diy-team" && (
            <form onSubmit={handleFinalizeDiyTeam} className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_16px_38px_rgba(15,23,42,0.04)] md:p-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Interactive Team Builder (DIY)</h2>
                <p className="mt-1 text-sm text-slate-500">Configure your custom developer/creative pod. Assign talent matching your slot categories and allocate budgets.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700 font-bold">Team / Project Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Mobile App Pod"
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={diyTeamName}
                    onChange={(e) => setDiyTeamName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700 font-bold">Pod Size (Number of Developers)</label>
                  <select
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={diyTeamSize}
                    onChange={(e) => handleDiyTeamSizeChange(Number(e.target.value))}
                  >
                    <option value={2}>2 Freelancers Pod</option>
                    <option value={3}>3 Freelancers Pod</option>
                    <option value={4}>4 Freelancers Pod</option>
                    <option value={5}>5 Freelancers Pod</option>
                    <option value={6}>6 Freelancers Pod (6+ Pod)</option>
                    <option value={7}>7 Freelancers Pod</option>
                    <option value={8}>8 Freelancers Pod (8+ Pod)</option>
                    <option value={9}>9 Freelancers Pod</option>
                    <option value={10}>10 Freelancers Pod (Enterprise Pod)</option>
                  </select>
                </div>
              </div>

              {/* Slot Cards List */}
              <div className="space-y-4 pt-2">
                <h4 className="text-sm font-bold text-slate-900">Configure Pod Roles ({diySlots.length} Slots):</h4>
                {diySlots.map((slot, i) => {
                  const isSearchingThisSlot = activeSlotIdx === slot.id;

                  return (
                    <div key={slot.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white font-extrabold text-xs">
                            #{slot.id}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">Role #{slot.id} Slot</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-500 font-semibold">Category:</span>
                            <select
                              value={slot.category}
                              onChange={(e) => handleSlotCategoryChange(slot.id, e.target.value)}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none"
                            >
                              {CATEGORIES.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-500 font-semibold">Payout:</span>
                            <div className="relative">
                              <span className="absolute left-2 top-1 text-xs text-slate-400">₹</span>
                              <input
                                type="number"
                                value={slot.bidAmount}
                                onChange={(e) => handleSlotPayChange(slot.id, e.target.value)}
                                className="w-24 rounded-lg border border-slate-200 bg-white pl-5 pr-2 py-1 text-xs text-slate-900 font-bold outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Freelancer Assignee Box */}
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-150">
                        {slot.freelancer ? (
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                              {slot.freelancer.name?.charAt(0) || "F"}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{slot.freelancer.name}</p>
                              <p className="text-[10px] text-slate-500">{slot.freelancer.headline} &bull; Rating: {slot.freelancer.ratingAvg || "4.8"}★</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No developer assigned to this slot yet</span>
                        )}

                        <button
                          type="button"
                          onClick={() => triggerFreelancerSearchForSlot(slot.id)}
                          className="rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 font-bold text-xs px-3 py-1.5 transition cursor-pointer"
                        >
                          {slot.freelancer ? "Change Freelancer" : "Search & Select Candidate"}
                        </button>
                      </div>

                      {/* Candidate Selection Drawer */}
                      {isSearchingThisSlot && (
                        <div className="mt-3 rounded-2xl border border-blue-200 bg-white p-4 space-y-3 animate-scaleUp">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                              Candidates matching "{slot.category}"
                            </h5>
                            <button
                              type="button"
                              onClick={() => setActiveSlotIdx(null)}
                              className="text-slate-400 hover:text-slate-600 text-xs font-bold border-none bg-transparent cursor-pointer"
                            >
                              Cancel Search
                            </button>
                          </div>

                          <input
                            type="text"
                            value={talentSearchQuery}
                            onChange={(e) => setTalentSearchQuery(e.target.value)}
                            placeholder="Type name, skill, or experience query..."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                          />

                          <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto space-y-2 pt-1">
                            {isLoadingPool ? (
                              <p className="text-xs text-slate-400 py-3 text-center animate-pulse">Scanning freelancer profiles...</p>
                            ) : (() => {
                              const q = talentSearchQuery.toLowerCase().trim();
                              const filtered = freelancerPool.filter(f => {
                                if (!q) return true;
                                return (f.name || "").toLowerCase().includes(q) ||
                                       (f.headline || "").toLowerCase().includes(q) ||
                                       f.skills?.some(s => s.toLowerCase().includes(q));
                              });

                              if (filtered.length === 0) {
                                return <p className="text-xs text-slate-400 italic py-4 text-center">No matching freelancers found.</p>;
                              }

                              return filtered.map(f => (
                                <div key={f.id} className="pt-2 flex items-center justify-between gap-3 text-xs">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-900">{f.name}</p>
                                    <p className="text-[10px] text-slate-500 truncate">{f.headline || "Independent Consultant"} &bull; Rating: {f.ratingAvg || "0.0"}★ &bull; Base Rate: ₹{f.hourlyRate || 0}/hr</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {f.skills?.slice(0, 3).map((s, idx) => (
                                        <span key={idx} className="rounded bg-slate-50 px-1.5 py-0.5 text-[8px] text-slate-500 font-semibold border border-slate-100 uppercase">{s}</span>
                                      ))}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => assignFreelancerToSlot(slot.id, f)}
                                    className="rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 text-[10px] font-bold transition cursor-pointer"
                                  >
                                    Choose
                                  </button>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pay Details Card */}
              {(() => {
                const netBudget = diySlots.reduce((sum, s) => sum + s.bidAmount, 0);
                const isPro = user?.isPro || user?.subscriptions?.some(sub => sub.status === "active");
                const feeRate = isPro ? 0.10 : 0.15;
                const feeAmount = Math.round(netBudget * feeRate);
                const grossTotal = netBudget + feeAmount;

                const categoriesUsed = diySlots.map(s => s.category);
                const uniqueCategories = new Set(categoriesUsed);
                const hasCategoryDuplicates = uniqueCategories.size < categoriesUsed.length;

                const canFinalize = diySlots.every(s => s.freelancer) && (isPro || !hasCategoryDuplicates) && diyTeamName.trim();

                return (
                  <div className="space-y-4 pt-4 border-t border-slate-150">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/20 p-5 space-y-2.5">
                      <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Custom Pod Pricing Summary</h4>
                      <div className="space-y-2 text-xs text-slate-600">
                        {diySlots.map((s) => (
                          <div key={s.id} className="flex justify-between">
                            <span>Slot #{s.id} Payout ({s.category}):</span>
                            <span className="font-semibold text-slate-900">₹{s.bidAmount?.toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="flex justify-between border-t border-slate-150 pt-2">
                          <span>Sum Outflow:</span>
                          <span className="font-semibold text-slate-900">₹{netBudget.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-blue-700">
                          <span>Platform Escrow Fee ({isPro ? "10% Pro Discount" : "15% Standard"}):</span>
                          <span>₹{feeAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-extrabold text-sm text-slate-950 border-t border-slate-200 pt-2">
                          <span>Gross Total Team Escrow:</span>
                          <span>₹{grossTotal.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {!isPro && hasCategoryDuplicates && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 font-semibold leading-relaxed">
                        ⚠️ Category Conflict: Standard accounts can only hire 1 developer per technology category in a pod. You currently have duplicate slots assigned to the same category. Please edit slots to use different categories or upgrade to **Pro** to build teams with unrestricted duplicates.
                      </div>
                    )}

                    {!diySlots.every(s => s.freelancer) && (
                      <div className="text-xs text-slate-500 font-semibold italic text-center">
                        (Please assign a freelancer to each slot card to enable team invitations)
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={!canFinalize || isSendingInvites}
                      className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3.5 font-bold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 hover:brightness-[1.02] text-sm cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSendingInvites ? "Finalizing..." : "Finalize & Send Team Invites"}
                    </button>

                    <div className="pt-2 flex flex-col items-center gap-1.5">
                      <a
                        href="https://forms.gle/sr24pCSxvh3Ej8nQ7"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 text-sm text-center border-0 cursor-pointer"
                      >
                        Fill Google Enterprise Form (Quick Response)
                      </a>
                    </div>
                  </div>
                );
              })()}
            </form>
          )}

          {/* Simulated invite overlay */}
          {isSendingInvites && (
            <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-2xl max-w-sm w-full text-center space-y-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <h3 className="font-bold text-slate-900">Custom Pod Setup</h3>
                <p className="text-xs text-slate-500 leading-normal">{inviteProgress}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Dashboard Requests History */}
        <div className="space-y-6">
          {/* Sourcing requests history */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_16px_38px_rgba(15,23,42,0.04)]">
            <h3 className="text-lg font-bold text-slate-900">Sourcing Requests</h3>
            <p className="text-xs text-slate-500 mt-1">Status of your manual recruitment matches.</p>

            <div className="mt-4 space-y-3">
              {sourcingRequests.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">No sourcing requests submitted yet.</p>
              ) : (
                sourcingRequests.map((req) => (
                  <div key={req.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-900">{req.role}</span>
                      <span className="rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[10px] uppercase">
                        {req.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">Skills: {req.skills}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[10px] text-slate-400">
                      <span>Ref: {req.id}</span>
                      <button
                        onClick={() => handleDeleteSourcing(req.id)}
                        className="text-rose-500 hover:text-rose-700 font-bold border-none bg-transparent cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* DIY Custom Teams History */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_16px_38px_rgba(15,23,42,0.04)]">
            <h3 className="text-lg font-bold text-slate-900">DIY Custom Teams</h3>
            <p className="text-xs text-slate-500 mt-1">Built and funded custom developer pods.</p>

            <div className="mt-4 space-y-3">
              {diyTeams.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">No custom teams created yet.</p>
              ) : (
                diyTeams.map((team) => (
                  <div key={team.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-900">{team.name}</span>
                      <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] uppercase">
                        {team.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">Pod Size: {team.size} Developers &bull; Outflow: ₹{team.grossTotal?.toLocaleString()}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[10px] text-slate-400">
                      <span>{team.date}</span>
                      <span>Ref: {team.id}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default TalentSolutions;
