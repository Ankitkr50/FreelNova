import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "../constants/routes.js";
import { useRazorpay } from "../hooks/useRazorpay.js";
import { subscriptionsApi } from "../api/subscriptions.api.js";
import { useAuth } from "../hooks/useAuth.js";

// Comparison Table matrix incorporating all existing features plus new features from Fiverr Pro & UpBusiness
const compareRows = [
  { label: "Skilled freelance talent & global marketplace", basic: true, essential: true, advanced: true, enterprise: true },
  { label: "Verified work history & client reviews", basic: true, essential: true, advanced: true, enterprise: true },
  { label: "Vetted talent catalog & candidate scorecards", basic: false, essential: true, advanced: true, enterprise: true },
  { label: "100% Escrow Money-Back Guarantee", basic: false, essential: true, advanced: true, enterprise: true },
  { label: "Team workspace with multi-member access", basic: false, essential: true, advanced: true, enterprise: true },
  { label: "Earn Reward Points & redeem for contract credits", basic: false, essential: true, advanced: true, enterprise: true },
  { label: "25% discount on Expert Sourcing & Shortlisting", basic: false, essential: true, advanced: true, enterprise: true },
  { label: "Gold Crown Trust Shield Badge", basic: false, essential: true, advanced: true, enterprise: true },
  { label: "Priority Search Ranking & Spotlight Placement", basic: false, essential: true, advanced: true, enterprise: true },
  { label: "Showcase Unlimited Work & Video Demos", basic: false, essential: true, advanced: true, enterprise: true },
  { label: "Smart AI Matchmaking Engine", basic: false, essential: true, advanced: true, enterprise: true },
  { label: "Flexible Deferred / Net-30 Milestone Payments", basic: false, essential: false, advanced: true, enterprise: true },
  { label: "Custom Tax Invoice & Expense Reports", basic: false, essential: false, advanced: true, enterprise: true },
  { label: "Monthly Business & Earnings Analytics Suite", basic: false, essential: false, advanced: true, enterprise: true },
  { label: "Dedicated Business Success Manager & Concierge", basic: false, essential: false, advanced: true, enterprise: true },
  { label: "Legal NDA & Document Management", basic: false, essential: false, advanced: true, enterprise: true },
  { label: "1 Free Background Audit & Compliance Check / mo", basic: false, essential: false, advanced: true, enterprise: true },
  { label: "10% Discount on AI & Expert Project Planning", basic: false, essential: false, advanced: true, enterprise: true },
  { label: "Preferred Vendor Status for Enterprise Clients", basic: false, essential: false, advanced: true, enterprise: true },
  { label: "Custom Enterprise SLA & ATS API Integrations", basic: false, essential: false, advanced: false, enterprise: true },
];

const faqs = [
  {
    question: "Who can activate the Basic plan?",
    answer: "Basic is available for everyone upon registration. It allows clients to post projects and freelancers to submit proposals with 100 free connects.",
  },
  {
    question: "What is the FreelNova Pro Essential tier?",
    answer: "Essential is designed for active users who qualify for priority talent matching, reward points earning, and team account collaboration.",
  },
  {
    question: "What benefits does FreelNova Pro Monthly provide?",
    answer: "Pro Monthly unlocks priority search spotlight, verified trust badges, AI cover letter tools, candidate scorecards, and 100 bonus connects every month.",
  },
  {
    question: "How does FreelNova Elite (Yearly) save costs?",
    answer: "Elite offers a 40% discount on subscription fees, reduces platform commissions to 10%, includes deferred payment options, custom tax invoices, and 800 bonus connects.",
  },
  {
    question: "How does the 100% money-back guarantee work?",
    answer: "If deliverables do not meet agreed contract terms, open a dispute within 14 days. Our mediation team will audit the milestone and refund escrow funds if non-compliant.",
  },
  {
    question: "What is the Reward Points program?",
    answer: "Subscribers earn points on every completed milestone order. Accumulated points can be redeemed directly for platform fee discounts and bonus proposal connects.",
  },
  {
    question: "What does the Free Background Audit & Worker Audit include?",
    answer: "Pro Elite and Enterprise members receive 1 complimentary background check and compliance audit per month to verify identity, credentials, and tax status.",
  },
  {
    question: "Can multiple team members share a Pro account?",
    answer: "Yes! Pro Essential, Elite, and Enterprise plans support multi-user team workspaces with role-based permissions and shared payment methods.",
  },
];

const talentWays = [
  {
    title: "Post a project brief",
    copy: "Generate a detailed project brief with our AI assistant and post it to receive a curated shortlist of top freelancer offers.",
    price: "Free for all clients",
    cta: "Create Brief",
    tabKey: "brief",
  },
  {
    title: "Expert Freelancer Sourcing",
    copy: "Don't have time to search? Our recruitment experts will manually source, screen, and select the top 3 verified freelancers for you.",
    price: "₹1,999 one-time setup fee (25% off for Pro)",
    cta: "Request Sourcing",
    tabKey: "sourcing",
  },
  {
    title: "Get a team built for you",
    copy: "Have a complex or large project? No problem. We will build a dedicated freelance team and fully execute your project from start to finish.",
    price: "Custom enterprise pricing",
    cta: "Talk to Sales",
    tabKey: "enterprise",
  },
];

const proofStats = [
  {
    stat: "Top 3%",
    title: "Rigorous Vetting",
    desc: "Only hand-screened professionals earn Pro verified status after portfolio and identity audit.",
  },
  {
    stat: "100%",
    title: "Escrow Protection",
    desc: "Milestone escrow holds funds securely until work is completed and approved.",
  },
  {
    stat: "24/7",
    title: "Dedicated Support",
    desc: "Priority customer support queue with dedicated business success account managers.",
  },
  {
    stat: "2x",
    title: "Faster Hiring",
    desc: "AI matchmaker and candidate scorecards reduce average time-to-hire by over 50%.",
  },
];

const footerColumns = {
  Categories: ["Creative & Design", "Marketing", "Development", "Architecture", "Writing", "Business & Finance", "Data & AI"],
  About: ["Careers", "Press & News", "Partnerships", "Privacy Policy", "Terms of Service", "Investor Relations"],
  "Support & Education": ["Help Center", "Trust & Safety", "Quality Guide", "Selling on FreelNova", "Buying on FreelNova", "FreelNova Guides"],
  Community: ["Customer Success Stories", "Community Hub", "Forum", "Events", "Blog", "Become a Seller"],
  "Business Solutions": ["Project Management Service", "Expert Sourcing Service", "Become an Agency", "Content Marketing", "Software Development", "Contact Sales"],
};

const methods = ["Razorpay", "Card", "UPI", "Net Banking"];

function FeatureCheck({ active }) {
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
        active ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-slate-100 text-slate-400"
      }`}
    >
      {active ? "✓" : "—"}
    </span>
  );
}

function FreelNovaPro() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user?.role === "admin") {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4 text-center">
        <h2 className="text-2xl font-bold text-slate-800">Access Restricted</h2>
        <p className="text-sm text-slate-500 max-w-md">
          Administrators have full platform control and do not require Pro premium features or subscriptions.
        </p>
        <Link
          to={ROUTES.DASHBOARD}
          className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  const role = user?.role === "recruiter" ? "recruiter" : "freelancer";

  const plans = useMemo(() => {
    return [
      {
        id: "basic",
        tier: "FreelNova Basic",
        badge: "Available for everyone",
        price: "Free",
        summary: role === "recruiter" 
          ? "Perfect for finding skilled freelancers worldwide for any project and budget."
          : "Perfect for starting your freelancing journey and finding high-quality projects.",
        benefits: role === "recruiter"
          ? [
              "On-demand, global freelance talent",
              "Verified work history and reviews",
              "Post unlimited project requirements",
              "Receive custom bids from applicants",
              "Standard 15% platform escrow commission fee",
            ]
          : [
              "Apply to global projects and receive bids",
              "Verified work profiles and client reviews",
              "Submit custom proposal bids",
              "100 Free Connects included on sign-up",
              "Standard 15% platform commission fee",
            ],
        cta: "Start Free",
        ctaType: "link",
      },
      {
        id: "pro_monthly",
        tier: "FreelNova Pro",
        badge: "Recommended Choice",
        price: "Rs 1099/month",
        planKey: "pro_monthly",
        summary: role === "recruiter"
          ? "Ideal for clients seeking vetted talent, priority ranking, and money-back guarantee."
          : "Ideal for freelancers seeking priority search ranking, crown badge, and AI tools.",
        benefits: role === "recruiter"
          ? [
              "Vetted freelance talent catalog & candidate scorecards",
              "100% Escrow Money-Back Guarantee",
              "Team account with multi-member collaboration",
              "Earn Reward Points on orders and redeem for credits",
              "25% discount on Expert Shortlisting & Sourcing services",
              "Gold Crown Status Badge on your client profile",
              "AI Smart-Match candidate recommendations & 1-click invites",
              "24/7 support from a dedicated team",
              "Priority support queue and faster response times",
              "All standard Basic client features included",
            ]
          : [
              "Gold Crown Trust Shield Badge on your profile",
              "Priority Search Ranking & Spotlight Placement",
              "Showcase Unlimited Work, Media, & Video Demos",
              "Smart AI Matchmaking to auto-pair with top projects",
              "Competitor Bid Range Insights & AI Cover Letter Generator",
              "Profile View & Application Activity Receipts",
              "100 Bonus Application Connects Free every month",
              "Featured Bid Highlight in Client lists",
              "24/7 support from a dedicated team",
              "All standard Basic freelancer features included",
            ],
        cta: "Upgrade to Monthly",
        ctaType: "checkout",
      },
      {
        id: "pro_yearly",
        tier: "FreelNova Elite",
        badge: "Save 40%",
        price: "Rs 7999/year",
        planKey: "pro_yearly",
        summary: role === "recruiter"
          ? "Tailored for compliant hiring, deferred payments, custom tax invoices, and lowest fees."
          : "Tailored for elite freelancers to maximize earnings, win enterprise contracts, and get featured.",
        benefits: role === "recruiter"
          ? [
              "Standard 10% platform escrow commission fee only",
              "Flexible deferred milestone invoicing & net-30 options",
              "Additional 20% off managed sourcing & project setup",
              "Custom invoice reports & monthly business analytics",
              "Dedicated Business Success Manager & concierge",
              "Unlimited NDA & legal document management",
              "1 Free Candidate Background Check & Audit / month",
              "10% off AI & Expert Project Planning services",
              "24/7 support from a dedicated team",
              "All Pro Monthly client benefits included",
            ]
          : [
              "Standard 10% platform escrow commission fee only",
              "Prominent Placement across Key Marketplace Pages",
              "Preferred Vendor Status for Enterprise Clients",
              "Deep Conversion Analytics & Profile View Suite",
              "800 Bonus Application Connects Free annually",
              "1 Free Identity & Background Check Verification",
              "10% off Project Planning & Milestone Consultation",
              "24/7 support from a dedicated team",
              "All Pro Monthly freelancer benefits included",
            ],
        cta: "Upgrade to Yearly",
        ctaType: "checkout",
      },
      {
        id: "enterprise",
        tier: "Enterprise",
        badge: "Custom pricing",
        price: "Contact us",
        summary: "A custom solution for organizations looking to scale their team operations.",
        benefits: [
          "Custom onboarding and procurement support",
          "Centralized team governance & controls",
          "Organization-wide talent visibility",
          "Direct Google Form query submission line",
          "Dedicated enterprise success coverage",
        ],
        cta: "Contact Sales",
        ctaType: "contact",
      },
    ];
  }, [role]);

  const { openCheckout, loading: razorpayLoading } = useRazorpay();
  const [selectedPlan, setSelectedPlan] = useState("pro_monthly");
  const [selectedMethod, setSelectedMethod] = useState(methods[0]);
  const [openFaq, setOpenFaq] = useState(faqs[0].question);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [isBusy, setIsBusy] = useState(false);
  const [currency, setCurrency] = useState("INR");

  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);
  const [enquiryForm, setEnquiryForm] = useState({
    name: "",
    email: "",
    company: "",
    teamSize: "1-10",
    budget: "Under Rs 1 Lakh",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(false);

  const handleEnquirySubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      try {
        const list = JSON.parse(localStorage.getItem("sb_enterprise_enquiries") || "[]");
        list.push({
          id: `enq_${Date.now()}`,
          ...enquiryForm,
          createdAt: new Date().toISOString()
        });
        localStorage.setItem("sb_enterprise_enquiries", JSON.stringify(list));
      } catch (err) {
        console.error(err);
      }
      setIsSubmitting(false);
      setEnquirySuccess(true);
      setTimeout(() => {
        setEnquirySuccess(false);
        setIsEnquiryOpen(false);
        setEnquiryForm({
          name: "",
          email: "",
          company: "",
          teamSize: "1-10",
          budget: "Under Rs 1 Lakh",
          message: "",
        });
      }, 2000);
    }, 1200);
  };

  const activePlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlan) || plans[1],
    [selectedPlan, plans],
  );

  const openCheckoutModal = (planId) => {
    setSelectedPlan(planId);
    setStatus({ type: "", text: "" });
    setIsCheckoutOpen(true);
  };

  const handleCheckout = async () => {
    const planKey = activePlan.planKey;
    if (!planKey) {
      setStatus({ type: "info", text: "This plan is eligibility-based. Contact us to check your eligibility." });
      return;
    }
    setStatus({ type: "", text: "" });
    setIsBusy(true);
    try {
      const res = await subscriptionsApi.createOrder({ plan: planKey, currency });
      const { orderId, amount, currency: orderCurrency, subscriptionId, keyId, planLabel } = res.data.data;

      openCheckout({
        orderId,
        amount,
        currency: orderCurrency,
        keyId,
        name: "FreelNova",
        description: planLabel,
        prefillName: user?.name || "",
        prefillEmail: user?.email || "",
        onSuccess: async (response) => {
          try {
            await subscriptionsApi.verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              subscriptionId,
            });
            localStorage.setItem("sb_active_subscription", activePlan.id);
            localStorage.setItem("fn_pro_active", "true");
            const expDays = activePlan.id === "pro_yearly" ? 365 : 30;
            localStorage.setItem("fn_pro_expiry", new Date(Date.now() + expDays * 24 * 60 * 60 * 1000).toISOString());
            
            try {
              const proUsers = JSON.parse(localStorage.getItem("sb_pro_user_ids") || "[]");
              if (user?.id && !proUsers.includes(user.id)) {
                proUsers.push(user.id);
                localStorage.setItem("sb_pro_user_ids", JSON.stringify(proUsers));
              }
            } catch (e) {
              console.error(e);
            }

            setStatus({ type: "success", text: `🎉 ${planLabel} activated successfully! Welcome to Pro.` });
            setIsCheckoutOpen(false);
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } catch (err) {
            setStatus({ type: "error", text: err?.response?.data?.message || "Payment verification failed. Contact support." });
          } finally {
            setIsBusy(false);
          }
        },
        onError: (error) => {
          setStatus({ type: "error", text: error?.description || "Payment failed. Please try again." });
          setIsBusy(false);
        },
        onDismiss: () => {
          setStatus({ type: "", text: "" });
          setIsBusy(false);
        },
      });
    } catch (err) {
      setStatus({ type: "error", text: err?.response?.data?.message || "Could not initiate payment. Please try again." });
      setIsBusy(false);
    }
  };

  const isLoading = isBusy || razorpayLoading;

  return (
    <>
      <section className="space-y-8 bg-transparent pb-10">
        {/* Hero Banner Section */}
        <section className="rounded-[2.5rem] border border-blue-200/80 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.28),transparent_30%),linear-gradient(135deg,#0f274f_0%,#163d7a_48%,#2563eb_100%)] p-6 text-white shadow-[0_24px_70px_rgba(37,99,235,0.22)] md:p-10">
          <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-50">
            FreelNova Pro
          </span>
          <h1 className="mt-5 max-w-none text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white md:whitespace-nowrap">
            Redefining the Future of Freelance Work.
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-blue-50/88">
            Select the perfect plan to connect, hire, collaborate, and grow with confidence.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              className="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-900 shadow-[0_16px_30px_rgba(2,6,23,0.2)] transition hover:-translate-y-0.5 hover:bg-blue-50 cursor-pointer"
              onClick={() => openCheckoutModal("pro_monthly")}
              type="button"
            >
              Upgrade with Pro
            </button>
            <Link
              className="rounded-2xl border border-white/20 bg-white/10 px-6 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/16"
              to={ROUTES.PROJECTS}
            >
              Explore Freelancers
            </Link>
          </div>
        </section>

        {/* Currency Switcher */}
        <div className="flex justify-center mb-2 mt-4">
          <div className="inline-flex rounded-full bg-blue-100/50 p-1 border border-blue-200">
            <button
              onClick={() => setCurrency("INR")}
              type="button"
              className={`rounded-full px-6 py-2.5 text-xs font-bold transition-all cursor-pointer border-0 outline-none ${
                currency === "INR" ? "bg-blue-600 text-white shadow-md" : "text-blue-800 hover:bg-blue-100/80 bg-transparent"
              }`}
            >
              INR (₹)
            </button>
            <button
              onClick={() => setCurrency("USD")}
              type="button"
              className={`rounded-full px-6 py-2.5 text-xs font-bold transition-all cursor-pointer border-0 outline-none ${
                currency === "USD" ? "bg-blue-600 text-white shadow-md" : "text-blue-800 hover:bg-blue-100/80 bg-transparent"
              }`}
            >
              USD ($)
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <section className="grid gap-6 xl:grid-cols-4">
          {plans.map((plan) => (
            <article
              className={`rounded-[2rem] border p-6 shadow-[0_16px_38px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 flex flex-col ${
                plan.id === "pro_monthly"
                  ? "border-blue-400 bg-[linear-gradient(180deg,rgba(239,246,255,0.9),rgba(219,234,254,0.95))] shadow-[0_20px_45px_rgba(37,99,235,0.12)] border-[2px]"
                  : "border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(239,246,255,0.94))]"
              }`}
              key={plan.id}
            >
              <div className="flex flex-col flex-1">
                {/* Fixed height section containers */}
                <div className="flex flex-col space-y-4">
                  {/* Section 1: Badge + Title */}
                  <div className="h-24 flex flex-col justify-end">
                    <div>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] mb-2 ${
                        plan.id === "pro_monthly"
                          ? "bg-orange-50 text-orange-700 border-orange-200 animate-pulse"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}>
                        {plan.badge}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 leading-tight">
                      {plan.tier}
                    </h2>
                  </div>

                  {/* Section 2: Price Tag */}
                  <div className="h-16 flex flex-col justify-center">
                    <p className="text-2xl font-black text-slate-900 tracking-tight whitespace-nowrap">
                      {plan.id === "pro_monthly"
                        ? (currency === "INR" ? "Rs 1099/month" : "$15/month")
                        : plan.id === "pro_yearly"
                          ? (currency === "INR" ? "Rs 7999/year" : "$99/year")
                          : plan.price
                      }
                    </p>
                    {plan.note ? (
                      <p className="mt-0.5 text-xs text-slate-500">{plan.note}</p>
                    ) : (
                      <p className="mt-0.5 text-xs text-transparent select-none">Placeholder</p>
                    )}
                  </div>

                  {/* Section 3: Description */}
                  <div className="h-20 flex items-start">
                    <p className="text-sm leading-5 text-slate-600">{plan.summary}</p>
                  </div>
                </div>

                {/* Benefits List */}
                <div className="mt-6 border-t border-blue-100 pt-6 flex-1">
                  <p className="text-sm font-semibold text-slate-900">Key benefits:</p>
                  <ul className="mt-4 space-y-3">
                    {plan.benefits.map((benefit) => (
                      <li className="flex items-start gap-3 text-sm text-slate-600" key={benefit}>
                        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-blue-700 text-xs font-bold shrink-0">
                          ✓
                        </span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action CTA Button at the bottom */}
              <div className="pt-8">
                {plan.ctaType === "checkout" ? (
                  <button
                    className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 hover:brightness-[1.02] cursor-pointer"
                    onClick={() => openCheckoutModal(plan.id)}
                    type="button"
                  >
                    {plan.cta}
                  </button>
                ) : plan.ctaType === "contact" ? (
                  <button
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-blue-200 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-blue-300/60 hover:bg-blue-50/40 text-center cursor-pointer"
                    onClick={() => setIsEnquiryOpen(true)}
                    type="button"
                  >
                    {plan.cta}
                  </button>
                ) : (
                  <Link
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-blue-200 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-blue-300/60 hover:bg-blue-50/40"
                    to={ROUTES.PROJECTS}
                  >
                    {plan.cta}
                  </Link>
                )}
              </div>
            </article>
          ))}
        </section>

        {/* Feature Comparison Table Section */}
        <section className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-6 shadow-[0_16px_38px_rgba(15,23,42,0.06)] md:p-8">
          <div>
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
              Compare all features
            </span>
            <h2 className="mt-4 text-3xl font-bold text-slate-900">Choose the plan that fits your growth</h2>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="px-4 py-3 font-bold">Feature Capability</th>
                  <th className="px-4 py-3 font-bold text-center">Basic</th>
                  <th className="px-4 py-3 font-bold text-center">Essential</th>
                  <th className="px-4 py-3 font-bold text-center">Pro Elite</th>
                  <th className="px-4 py-3 font-bold text-center">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {compareRows.map((row) => (
                  <tr className="bg-slate-50/70 hover:bg-blue-50/40 transition shadow-2xs" key={row.label}>
                    <td className="rounded-l-2xl px-4 py-3.5 text-xs font-semibold text-slate-800">{row.label}</td>
                    <td className="px-4 py-3.5 text-center"><FeatureCheck active={row.basic} /></td>
                    <td className="px-4 py-3.5 text-center"><FeatureCheck active={row.essential} /></td>
                    <td className="px-4 py-3.5 text-center"><FeatureCheck active={row.advanced} /></td>
                    <td className="rounded-r-2xl px-4 py-3.5 text-center"><FeatureCheck active={row.enterprise} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQs */}
        <section className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-6 shadow-[0_16px_38px_rgba(15,23,42,0.06)] md:p-8">
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            FAQs
          </span>
          <div className="mt-6 divide-y divide-slate-200">
            {faqs.map((item) => {
              const isOpen = openFaq === item.question;

              return (
                <div className="py-4" key={item.question}>
                  <button
                    className="flex w-full items-center justify-between gap-4 text-left cursor-pointer"
                    onClick={() => setOpenFaq(isOpen ? "" : item.question)}
                    type="button"
                  >
                    <span className="text-base font-semibold text-slate-900">{item.question}</span>
                    <span className="text-xl font-bold text-blue-600">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen ? <p className="mt-3 text-sm leading-6 text-slate-600">{item.answer}</p> : null}
                </div>
              );
            })}
          </div>
        </section>

        {/* Ways to Get Work Done Section */}
        <section className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-6 shadow-[0_16px_38px_rgba(15,23,42,0.06)] md:p-8">
          <div>
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
              Ways to get work done
            </span>
            <h2 className="mt-4 text-3xl font-bold text-slate-900">Tailored hiring options for every scope</h2>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {talentWays.map((way) => (
              <div key={way.title} className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-6 flex flex-col justify-between hover:border-blue-300 hover:bg-blue-50/30 transition">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{way.title}</h3>
                  <p className="mt-2 text-xs text-slate-600 leading-5">{way.copy}</p>
                </div>
                <div className="mt-6 border-t border-slate-200/60 pt-4 flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-700">{way.price}</span>
                  <Link
                    to={
                      way.tabKey === "brief"
                        ? "/talent-solutions?tab=brief"
                        : way.tabKey === "sourcing"
                        ? "/talent-solutions?tab=sourcing"
                        : "/talent-solutions?tab=diy-team"
                    }
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 cursor-pointer transition text-center shadow-xs"
                  >
                    {way.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Proof / Why Companies Choose Pro Section */}
        <section className="rounded-[2rem] border border-blue-100 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-white p-6 shadow-sm md:p-8">
          <div>
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-100/60 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-800">
              Why Choose FreelNova Pro
            </span>
            <h2 className="mt-4 text-3xl font-bold text-slate-900">Proven protection and talent excellence</h2>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {proofStats.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white bg-white/80 p-5 shadow-xs">
                <p className="text-3xl font-black text-blue-600">{item.stat}</p>
                <p className="mt-2 text-sm font-bold text-slate-900">{item.title}</p>
                <p className="mt-1 text-xs text-slate-600 leading-5">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom Footer Directory Columns */}
        <section className="rounded-[2rem] border border-slate-200/80 bg-slate-900 text-white p-6 md:p-10 shadow-lg mt-8">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {Object.entries(footerColumns).map(([title, links]) => (
              <div key={title} className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">{title}</h4>
                <ul className="space-y-2 text-xs text-slate-300">
                  {links.map((link) => (
                    <li key={link} className="hover:text-white transition cursor-pointer">
                      {link}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 border-t border-slate-800 pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} FreelNova Inc. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span>Supported Payment Methods:</span>
              {methods.map((m) => (
                <span key={m} className="rounded-md bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-200">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </section>
      </section>

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs" onClick={() => setIsCheckoutOpen(false)}></div>
          <div className="relative bg-white rounded-3xl border border-slate-200 max-w-lg w-full shadow-2xl p-6 overflow-y-auto max-h-[90vh] space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-150 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Subscribe to Pro
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-2">
                  {activePlan.tier}
                </h3>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold bg-transparent border-0 cursor-pointer outline-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-800">
              <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-blue-950">{activePlan.tier}</p>
                  <p className="text-[10px] text-blue-700 mt-0.5">{activePlan.summary}</p>
                </div>
                <span className="text-lg font-black text-blue-900">
                  {activePlan.id === "pro_monthly"
                    ? (currency === "INR" ? "₹1,099" : "$15")
                    : (currency === "INR" ? "₹7,999" : "$99")}
                </span>
              </div>

              <div>
                <p className="font-bold text-slate-900 mb-2">Included Benefits:</p>
                <ul className="space-y-1.5 text-slate-600">
                  {activePlan.benefits.map((b) => (
                    <li key={b} className="flex items-center gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {status.text && (
                <p className={`p-3 rounded-xl border font-bold text-xs ${
                  status.type === "error" ? "bg-rose-50 border-rose-200 text-rose-700" :
                  status.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                  "bg-blue-50 border-blue-200 text-blue-700"
                }`}>
                  {status.text}
                </p>
              )}

              <button
                onClick={handleCheckout}
                disabled={isLoading}
                className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 py-3.5 text-xs font-bold text-white shadow-lg transition hover:from-blue-700 hover:to-blue-800 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? "Processing Gateway..." : "Proceed to Razorpay Checkout"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enterprise Enquiry Modal */}
      {isEnquiryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs" onClick={() => setIsEnquiryOpen(false)}></div>
          <div className="relative bg-white rounded-3xl border border-slate-200 max-w-md w-full shadow-2xl p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-150 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Enterprise Solutions
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">Contact Enterprise Sales</h3>
              </div>
              <button
                onClick={() => setIsEnquiryOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold bg-transparent border-0 cursor-pointer outline-none"
              >
                ✕
              </button>
            </div>

            {enquirySuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-center text-xs font-bold">
                🎉 Enquiry submitted successfully! Our Enterprise Director will contact you within 24 hours.
              </div>
            ) : (
              <form onSubmit={handleEnquirySubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={enquiryForm.name}
                    onChange={(e) => setEnquiryForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Work Email</label>
                  <input
                    type="email"
                    required
                    value={enquiryForm.email}
                    onChange={(e) => setEnquiryForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="rahul@company.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Company / Organization</label>
                  <input
                    type="text"
                    required
                    value={enquiryForm.company}
                    onChange={(e) => setEnquiryForm(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="e.g. Acme Corp"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Team Size</label>
                    <select
                      value={enquiryForm.teamSize}
                      onChange={(e) => setEnquiryForm(prev => ({ ...prev, teamSize: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none"
                    >
                      <option value="1-10">1-10 members</option>
                      <option value="11-50">11-50 members</option>
                      <option value="50+">50+ members</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Annual Hiring Budget</label>
                    <select
                      value={enquiryForm.budget}
                      onChange={(e) => setEnquiryForm(prev => ({ ...prev, budget: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none"
                    >
                      <option value="Under Rs 1 Lakh">Under ₹1 Lakh</option>
                      <option value="Rs 1L - 5L">₹1L - ₹5L</option>
                      <option value="Rs 5L+">₹5L+</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Project Details / Requirements</label>
                  <textarea
                    rows={3}
                    value={enquiryForm.message}
                    onChange={(e) => setEnquiryForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Describe your hiring needs..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-blue-400 focus:bg-white resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit Enquiry"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default FreelNovaPro;
