import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/routes.js";
import { useRazorpay } from "../../hooks/useRazorpay.js";
import { subscriptionsApi } from "../../api/subscriptions.api.js";
import { useAuth } from "../../hooks/useAuth.js";

const methods = ["Razorpay", "Card", "UPI"];

function FreelNovaProPanel() {
  const { user } = useAuth();
  const { openCheckout, loading: razorpayLoading } = useRazorpay();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("pro_monthly");
  const [status, setStatus] = useState({ type: "", text: "" });
  const [isBusy, setIsBusy] = useState(false);

  const role = user?.role === "recruiter" ? "recruiter" : "freelancer";

  const plans = useMemo(() => {
    return [
      {
        id: "pro_monthly",
        name: "FreelNova Pro Monthly",
        price: "₹1099 / month",
        amount: 1099,
        benefits: role === "recruiter"
          ? [
              "Vetted freelance talent catalog & candidate scorecards",
              "100% Escrow Money-Back Guarantee",
              "Earn Reward Points & 25% Sourcing Discount",
              "Gold Crown Trust Badge on your profile",
              "AI Smart-Match candidate recommendations & 1-click invites",
              "24/7 support from a dedicated team",
            ]
          : [
              "Gold Crown Trust Shield Badge on your profile",
              "Priority Search Ranking & Spotlight Placement",
              "Showcase Unlimited Work & Video Demos",
              "Smart AI Matchmaking to auto-pair with top projects",
              "Competitor Bid Range Insights & AI Cover Letter Generator",
              "100 Bonus Application Connects Free every month",
              "24/7 support from a dedicated team",
            ],
      },
      {
        id: "pro_yearly",
        name: "FreelNova Pro Yearly (Elite)",
        price: "₹7999 / year",
        amount: 7999,
        benefits: role === "recruiter"
          ? [
              "Standard 10% platform escrow commission fee only",
              "Flexible deferred milestone invoicing & net-30 options",
              "Custom invoice reports & monthly business analytics",
              "1 Free Candidate Background Check & Audit / month",
              "Dedicated Business Success Manager & priority support",
              "24/7 support from a dedicated team",
            ]
          : [
              "Standard 10% platform escrow commission fee only",
              "Prominent Placement across Key Marketplace Pages",
              "Preferred Vendor Status for Enterprise Recruiters",
              "Deep Conversion Analytics & Profile View Performance Suite",
              "800 Bonus Application Connects Free annually",
              "24/7 support from a dedicated team",
            ],
      },
    ];
  }, [role]);

  const activePlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlan) || plans[0],
    [selectedPlan, plans],
  );

  const handleCheckout = async () => {
    setStatus({ type: "", text: "" });
    setIsBusy(true);
    try {
      const res = await subscriptionsApi.createOrder({ plan: activePlan.id });
      const { orderId, amount, currency, subscriptionId, keyId, planLabel } = res.data.data;

      openCheckout({
        orderId,
        amount,
        currency,
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

            setStatus({ type: "success", text: `${planLabel} activated! Enjoy your Pro benefits.` });
            setIsOpen(false);
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
      <section className="border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-[16px] rounded-[2rem] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">FreelNova Pro</span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
              Unlock premium hiring and freelancer growth tools
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Upgrade your experience with priority discovery, featured visibility, faster support,
              reward points, and background check audits.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 hover:brightness-[1.02] cursor-pointer" onClick={() => setIsOpen(true)} type="button">
              Upgrade to Pro
            </button>
            <Link className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-blue-300/50 hover:bg-slate-50" to={ROUTES.PRO}>
              View Plans
            </Link>
          </div>
        </div>
      </section>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs" onClick={() => setIsOpen(false)}></div>
          <div className="relative bg-white rounded-3xl border border-slate-200 max-w-lg w-full shadow-2xl p-6 overflow-y-auto max-h-[90vh] space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-150 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  FreelNova Pro Checkout
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">Upgrade Your Account</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold bg-transparent border-0 cursor-pointer outline-none">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id)}
                    type="button"
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition ${
                      selectedPlan === p.id
                        ? "border-blue-500 bg-blue-50/70 ring-2 ring-blue-200"
                        : "border-slate-200 bg-slate-50 hover:bg-white"
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-900">{p.name}</p>
                    <p className="text-sm font-extrabold text-blue-600 mt-1">{p.price}</p>
                  </button>
                ))}
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <p className="text-xs font-bold text-slate-900 mb-2">Selected Tier Benefits:</p>
                <ul className="space-y-1.5 text-xs text-slate-600">
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
                {isLoading ? "Processing Gateway..." : `Proceed to Razorpay (${activePlan.price})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default FreelNovaProPanel;
