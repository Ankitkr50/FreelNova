import { useState } from "react";
import { useAuth } from "../../hooks/useAuth.js";

function ApplyProjectModal({ onClose, onSubmit, isPending, budgetMin, budgetMax, projectTitle = "", projectCategory = "", bidStats }) {
  const { user } = useAuth();
  const isPro = user?.isPro || false;

  const [form, setForm] = useState({
    proposal: "",
    bidAmount: "",
    deliveryDays: "",
  });
  const [highlightBid, setHighlightBid] = useState(false);
  const [errors, setErrors] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);

  const validate = () => {
    const nextErrors = {};
    if (!form.proposal.trim()) nextErrors.proposal = "Proposal is required.";
    else if (form.proposal.trim().length < 40) nextErrors.proposal = "Proposal should be at least 40 characters.";

    const bid = Number(form.bidAmount);
    if (!form.bidAmount) nextErrors.bidAmount = "Bid amount is required.";
    else if (Number.isNaN(bid) || bid <= 0) nextErrors.bidAmount = "Enter a valid bid amount.";
    else if (budgetMin && bid < budgetMin) nextErrors.bidAmount = `Bid should be at least ₹${budgetMin}.`;
    else if (budgetMax && bid > budgetMax) nextErrors.bidAmount = `Bid should not exceed ₹${budgetMax}.`;

    const days = Number(form.deliveryDays);
    if (!form.deliveryDays) nextErrors.deliveryDays = "Delivery days are required.";
    else if (Number.isNaN(days) || days <= 0) nextErrors.deliveryDays = "Enter valid delivery days.";
    else if (days > 180) nextErrors.deliveryDays = "Delivery days should be under 180.";

    return nextErrors;
  };

  const handleAIGenerate = () => {
    if (!isPro) {
      alert("✨ AI Cover Letter Generator is a FreelNova Pro premium feature! Please upgrade to Pro on the Dashboard or Pro page to write proposals instantly.");
      return;
    }

    setIsGenerating(true);
    
    // Simulate AI generation delay
    setTimeout(() => {
      let letter = "";
      const cat = String(projectCategory).toLowerCase();
      
      if (cat.includes("web") || cat.includes("frontend")) {
        letter = `Hi there,\n\nI reviewed your project "${projectTitle || "Web Development project"}" and would love to assist you. I am an experienced frontend engineer specializing in React.js, modern CSS/Tailwind, and state-of-the-art UI architectures.\n\nMy approach:\n1. Wireframe & component breakdown to ensure consistent styling.\n2. Responsive Tailwind layouts with optimal viewport scaling.\n3. Clean, documented MERN components ready for production.\n\nI look forward to discussing the milestones. Best regards!`;
      } else if (cat.includes("backend") || cat.includes("data")) {
        letter = `Hello,\n\nI am applying for your project "${projectTitle || "Backend/Database project"}" because my background aligns perfectly. I design robust backend architectures using Node.js, Express, and PostgreSQL/Prisma with Redis caching.\n\nHere is how I plan to deliver:\n1. Schema optimization with proper relations and transaction controls.\n2. Secure REST API endpoints following RBAC standards.\n3. Complete unit testing to verify API routing performance under load.\n\nLooking forward to collaborating on this database workspace!`;
      } else if (cat.includes("design") || cat.includes("ui")) {
        letter = `Dear Client,\n\nYour project "${projectTitle || "UI/UX design"}" caught my attention! I am a professional designer focusing on clean typography, custom glassmorphism effects, and highly engaging user journeys.\n\nWhat I will deliver:\n1. Custom interactive Figma prototypes matching your design language.\n2. Micro-interactions and hover animations that maximize engagement.\n3. High-fidelity layouts customized for desktop and mobile viewport resolutions.\n\nI can start immediately. Thanks!`;
      } else {
        letter = `Hello,\n\nI would love to help you complete the "${projectTitle || "Project Brief"}" successfully. With over 3 years of hands-on experience, I deliver high-quality work, adhere strictly to deadlines, and communicate transparently throughout the project lifecycle.\n\nI'll ensure all requested requirements are completed and verified for correctness. Let's schedule a call to finalize details!`;
      }
      
      setForm((prev) => ({ ...prev, proposal: letter }));
      setIsGenerating(false);
    }, 1200);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    onSubmit({
      proposal: form.proposal.trim(),
      bidAmount: Number(form.bidAmount),
      deliveryDays: Number(form.deliveryDays),
      highlightBid: isPro && highlightBid, // Featured highlight flag
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm" onClick={onClose} role="presentation">
      <div className="border border-slate-200/80 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-[16px] w-full max-w-xl rounded-[2rem] p-6" onClick={(event) => event.stopPropagation()} role="presentation">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Apply To Project</h2>
            <p className="mt-1 text-sm text-slate-600">Submit proposal, bid amount, and estimated delivery time.</p>
          </div>
          <button className="rounded-2xl border border-slate-300 bg-white/85 font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 hover:border-blue-300/50 px-3 py-1 text-sm" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700" htmlFor="proposal">
                Proposal Cover Letter
              </label>
              
              {/* AI Assistant Button */}
              <button
                type="button"
                onClick={handleAIGenerate}
                disabled={isGenerating}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition disabled:opacity-75 cursor-pointer"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 animate-ping rounded-full bg-blue-600" />
                    AI Writing...
                  </span>
                ) : (
                  <span>{isPro ? "AI Auto-Write Proposal" : "AI Auto-Write (Pro)"}</span>
                )}
              </button>
            </div>
            
            <textarea
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 min-h-32"
              id="proposal"
              onChange={(event) => setForm((prev) => ({ ...prev, proposal: event.target.value }))}
              placeholder="Explain your approach, relevant experience, and delivery plan..."
              value={form.proposal}
              disabled={isGenerating}
            />
            {errors.proposal ? <p className="mt-1 text-xs text-rose-600">{errors.proposal}</p> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="bidAmount">
                Bid Amount (₹)
              </label>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                id="bidAmount"
                min="1"
                onChange={(event) => setForm((prev) => ({ ...prev, bidAmount: event.target.value }))}
                placeholder="250"
                type="number"
                value={form.bidAmount}
              />
              {errors.bidAmount ? <p className="mt-1 text-xs text-rose-600">{errors.bidAmount}</p> : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="deliveryDays">
                Delivery Days
              </label>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                id="deliveryDays"
                min="1"
                onChange={(event) => setForm((prev) => ({ ...prev, deliveryDays: event.target.value }))}
                placeholder="10"
                type="number"
                value={form.deliveryDays}
              />
              {errors.deliveryDays ? <p className="mt-1 text-xs text-rose-600">{errors.deliveryDays}</p> : null}
            </div>
          </div>

          {/* Competitor Bid Insights */}
          <div className="border border-slate-200 bg-slate-50 p-4 rounded-xl mt-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Competitor Bid Insights</h4>
            {isPro ? (
              bidStats && bidStats.count > 0 ? (
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white border border-slate-100 p-2 rounded-lg">
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">Min Bid</p>
                    <p className="font-extrabold text-slate-900 mt-1">₹{bidStats.min}</p>
                  </div>
                  <div className="bg-white border border-slate-100 p-2 rounded-lg">
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">Avg Bid</p>
                    <p className="font-extrabold text-blue-600 mt-1">₹{bidStats.avg}</p>
                  </div>
                  <div className="bg-white border border-slate-100 p-2 rounded-lg">
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">Max Bid</p>
                    <p className="font-extrabold text-slate-900 mt-1">₹{bidStats.max}</p>
                  </div>
                  <p className="col-span-3 text-[10px] text-slate-500 font-medium text-left mt-1.5">
                    Based on {bidStats.count} competitor proposal(s) submitted.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-medium">No proposals have been submitted yet. Be the first to bid!</p>
              )
            ) : (
              <div className="flex items-center justify-between gap-2 text-xs">
                <p className="text-slate-500 font-medium">Competitor bid statistics are locked.</p>
                <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-200/50 px-2 py-1 rounded font-extrabold uppercase select-none">
                  Pro Feature
                </span>
              </div>
            )}
          </div>

          {/* Featured Highlight Checkbox */}
          <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 p-3 rounded-xl mt-2 select-none">
            <input
              type="checkbox"
              id="highlight"
              disabled={!isPro}
              checked={highlightBid}
              onChange={(e) => setHighlightBid(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-400 cursor-pointer"
            />
            <label htmlFor="highlight" className={`text-xs font-bold flex items-center gap-1 cursor-pointer ${isPro ? "text-slate-700" : "text-slate-400"}`}>
              <span>Featured Bid Highlight</span>
              {!isPro && (
                <span className="text-[8px] bg-blue-50 text-blue-600 border border-blue-200/50 px-1 py-0.5 rounded uppercase tracking-wider font-extrabold select-none">PRO Feature</span>
              )}
            </label>
          </div>

          <button className="rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 hover:brightness-[1.02] w-full px-4 py-3 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer" disabled={isPending || isGenerating} type="submit">
            {isPending ? "Submitting..." : "Submit Application"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ApplyProjectModal;
