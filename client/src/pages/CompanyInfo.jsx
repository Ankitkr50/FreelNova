import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "../constants/routes.js";
import { useAuth } from "../hooks/useAuth.js";
import http from "../api/http.js";
import { TERMS_AND_CONDITIONS } from "../constants/terms.js";

const tabsList = [
  { id: "about", label: "About Us" },
  { id: "help", label: "Help Center" },
  { id: "safety", label: "Trust & Safety" },
  { id: "careers", label: "Careers" },
  { id: "terms", label: "Terms of Service" },
  { id: "privacy", label: "Privacy Policy" },
];

function CompanyInfo() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("about");
  const [contactForm, setContactForm] = useState({ name: "", email: "", msg: "" });
  const [contactSuccess, setContactSuccess] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Set active tab based on location state
  useEffect(() => {
    if (location.state?.tab) {
      const match = tabsList.find((t) => t.id === location.state.tab);
      if (match) {
        setActiveTab(match.id);
      }
    }
  }, [location.state]);

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.msg) return;
    
    setIsSending(true);
    setErrorMsg("");
    setContactSuccess(false);

    try {
      const res = await http.post("/users/support-inquiry", contactForm);
      if (res.data.success) {
        setContactSuccess(true);
        setContactForm({ name: "", email: "", msg: "" });
      } else {
        setErrorMsg(res.data.message || "Failed to submit ticket.");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-slate-50/50 pt-6 pb-12 text-slate-800">
      {/* Header Breadcrumbs */}
      <div className="mb-8 max-w-7xl mx-auto px-4">
        <nav className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span className="cursor-pointer hover:text-slate-600 transition" onClick={() => navigate(ROUTES.HOME)}>
            Home
          </span>
          <span>/</span>
          <span className="text-slate-600 font-bold uppercase tracking-wider">Company Workspace</span>
        </nav>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
          FreelNova Corporate Info
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Learn about our vision, secure escrow systems, job opportunities, and official platform policies.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* Sidebar Navigation */}
        <aside className="space-y-1.5">
          {tabsList.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left text-sm font-semibold transition cursor-pointer border-0 ${
                  isActive
                    ? "bg-slate-900 text-white shadow-md"
                    : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                <span>{tab.label}</span>
                {isActive && <span className="h-2 w-2 rounded-full bg-blue-400" />}
              </button>
            );
          })}
        </aside>

        {/* Tab Content Panel */}
        <main className="min-h-[500px]">
          {/* ABOUT US TAB */}
          {activeTab === "about" && (
            <section className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_16px_38px_rgba(15,23,42,0.04)] md:p-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">About FreelNova</h2>
                <p className="mt-1.5 text-sm text-slate-500">Our mission, journey, and community vision.</p>
              </div>
              
              <div className="prose prose-slate text-sm text-slate-600 leading-7 space-y-4">
                <p>
                  FreelNova is a next-generation freelance marketplace engineered to connect talented independent professionals (freelancers) with innovative organizations, startups, and clients (recruiters) across 700+ technical and creative domains.
                </p>
                <p>
                  Built with transparency, safety, and speed at its core, FreelNova offers real-time workspace messaging, OTP email verification, automated project milestones, Razorpay escrow checkout, and an intelligent AI Chat Safety &amp; Moderation Layer that protects users from scam attempts and off-platform payment bypasses.
                </p>
                <p className="border-l-4 border-blue-500 pl-4 py-2 font-medium italic text-slate-800 bg-blue-50/50 rounded-r-xl">
                  &quot;Our mission is to empower global freelancers to build sustainable careers while giving recruiters instant access to vetted, top-tier talent backed by 100% escrow payment protection.&quot;
                </p>
              </div>

              <div className="grid gap-4 mt-8 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
                  <p className="text-3xl font-extrabold text-blue-600">50K+</p>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Verified Freelancers</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
                  <p className="text-3xl font-extrabold text-blue-600">₹10Cr+</p>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Milestone Payouts</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
                  <p className="text-3xl font-extrabold text-blue-600">99.8%</p>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Satisfaction Rate</p>
                </div>
              </div>
            </section>
          )}

          {/* HELP CENTER TAB */}
          {activeTab === "help" && (
            <section className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_16px_38px_rgba(15,23,42,0.04)] md:p-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Help Center & Support</h2>
                <p className="mt-1.5 text-sm text-slate-500">24/7 dedicated support lines for account, contract, and payment queries.</p>
              </div>

              {/* Support Email Card */}
              <div className="rounded-[1.75rem] border border-blue-100 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Have a direct question?</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Our customer help team is available 24/7. Send your queries directly to our official support desk.
                  </p>
                  <p className="text-base font-extrabold text-blue-700 mt-2 select-all font-mono">
                    fn.freelnova@gmail.com
                  </p>
                </div>
                <a
                  href="mailto:fn.freelnova@gmail.com"
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 shadow-sm text-sm border-0"
                >
                  Send Email
                </a>
              </div>

              {/* FAQ list */}
              <div className="mt-8 space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Frequently Asked Questions</h3>
                
                <div className="rounded-2xl border border-slate-100 p-4 bg-slate-50/50">
                  <p className="font-bold text-sm text-slate-800">Q: How do platform payouts and Escrow work?</p>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    Recruiters deposit milestone funds into the secure FreelNova Escrow Vault before work begins. Funds remain safely held by the platform until the recruiter reviews and approves the completed deliverable, at which point funds are instantly transferred to the freelancer's wallet.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 p-4 bg-slate-50/50">
                  <p className="font-bold text-sm text-slate-800">Q: What are the platform commission fees?</p>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    Freelancers on the Basic Plan are charged a standard 10% commission fee per completed milestone. Upgraded FreelNova Pro members enjoy a discounted 5% commission rate along with priority proposal placement and featured badges.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 p-4 bg-slate-50/50">
                  <p className="font-bold text-sm text-slate-800">Q: Why are phone numbers and emails blocked in chat?</p>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    Our AI Chat Moderation Layer automatically detects and blocks off-platform contact sharing (phone numbers, emails, WhatsApp, Telegram, UPI IDs, bank details, QR codes) to protect both parties from scam attempts, un-escrowed work, and payment forfeiture.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 p-4 bg-slate-50/50">
                  <p className="font-bold text-sm text-slate-800">Q: How do I unblock a restricted account?</p>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    Accounts restricted for policy breaches can apply for administrative unblocking by paying the required unblocking fine through the platform security panel or contacting fn.freelnova@gmail.com.
                  </p>
                </div>
              </div>

              {/* Simple Contact Form */}
              {isAuthenticated ? (
                <form onSubmit={handleContactSubmit} className="mt-8 border-t border-slate-150 pt-8 space-y-4">
                  <h3 className="text-lg font-bold text-slate-900">Send an Inquiry Ticket</h3>
                  {contactSuccess ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                      Message sent successfully! We will contact you at {contactForm.email} shortly.
                    </div>
                  ) : null}
                  {errorMsg ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
                      {errorMsg}
                    </div>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Your Name</label>
                      <input
                        type="text"
                        required
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        placeholder="Full Name"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Email Address</label>
                      <input
                        type="email"
                        required
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Inquiry Message</label>
                    <textarea
                      required
                      rows={4}
                      value={contactForm.msg}
                      onChange={(e) => setContactForm({ ...contactForm, msg: e.target.value })}
                      placeholder="Specify your inquiry details, contract ID, or issue..."
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSending}
                    className="rounded-xl bg-slate-900 px-5 py-3 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer border-0 disabled:opacity-50"
                  >
                    {isSending ? "Sending Inquiry..." : "Submit Ticket"}
                  </button>
                </form>
              ) : (
                <div className="mt-8 border-t border-slate-150 pt-8 text-center space-y-4">
                  <h3 className="text-lg font-bold text-slate-900">Send an Inquiry</h3>
                  <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/50 p-6 max-w-lg mx-auto">
                    <p className="text-xs text-slate-500">
                      You must be registered and signed in to FreelNova to submit support inquiry tickets directly to our team.
                    </p>
                    <div className="mt-4 flex justify-center gap-3">
                      <button
                        onClick={() => navigate(ROUTES.LOGIN)}
                        className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer border-0"
                      >
                        Sign In
                      </button>
                      <button
                        onClick={() => navigate(ROUTES.REGISTER)}
                        className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer border-0"
                      >
                        Register
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* TRUST & SAFETY TAB */}
          {activeTab === "safety" && (
            <section className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_16px_38px_rgba(15,23,42,0.04)] md:p-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Trust & Safety Architecture</h2>
                <p className="mt-1.5 text-sm text-slate-500">Our multi-layered security protocols, escrow protections, and community standards.</p>
              </div>

              <div className="space-y-4 text-sm leading-relaxed">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <h4 className="font-bold text-slate-900 text-sm">Escrow Vault Payout Security</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Clients fund contract milestones prior to project kickoff via Razorpay. Funds are locked securely in escrow and cannot be unilaterally withdrawn by either party. Payment is released to the freelancer only upon milestone approval or 14-day auto-completion.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                    <h4 className="font-bold text-slate-900 text-sm">AI Chat Safety & Anti-Bypass Moderation Layer</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    All workspace conversations are monitored in real time by our automated moderation engine. Sharing external emails, phone numbers, WhatsApp, Telegram handles, UPI IDs, bank details, or QR codes is strictly prohibited to prevent fraud and off-platform scams. Violating messages are automatically redacted and flagged.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <h4 className="font-bold text-slate-900 text-sm">Administrative Account Restriction & Unblocking Fines</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Users attempting off-platform payment evasion or policy bypass will face immediate account restriction. Restricted accounts may be subject to an administrative unblocking fine of up to ₹5,000 to restore full platform access.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                    <h4 className="font-bold text-slate-900 text-sm">Formal Dispute Resolution & Arbitration Desk</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    If quality or milestone disputes occur, either party can open a formal dispute ticket. The FreelNova Support Team reviews logs, submitted files, and project briefs to issue a final, binding arbitration decision within 48 hours.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* CAREERS TAB */}
          {activeTab === "careers" && (
            <section className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_16px_38px_rgba(15,23,42,0.04)] md:p-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Work at FreelNova</h2>
                <p className="mt-1.5 text-sm text-slate-500">Help us shape the future of independent work and global talent sourcing.</p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-8 bg-slate-50/50 text-center space-y-3">
                <p className="text-sm font-bold text-slate-800">No Open Internal Positions Currently</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  We are not actively hiring internal staff at this moment. However, thousands of freelance jobs are available daily on our marketplace!
                </p>
                <button
                  onClick={() => navigate(ROUTES.PROJECTS)}
                  className="mt-3 inline-flex rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer border-0"
                >
                  Explore Freelance Projects →
                </button>
              </div>
            </section>
          )}

          {/* TERMS OF SERVICE TAB (FULL TERMS FROM TERMS.JS) */}
          {activeTab === "terms" && (
            <section className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_16px_38px_rgba(15,23,42,0.04)] md:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Terms of Service</h2>
                  <p className="mt-1 text-sm text-slate-500">Complete, binding user agreement, platform guidelines, and escrow policies.</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-3.5 py-1.5 text-xs font-bold text-blue-700 shrink-0">
                  <span>19 Binding Sections</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                  <span>Version 2.4</span>
                </div>
              </div>

              {/* Security Policy Notice Banner */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50/90 p-4 text-xs font-semibold text-blue-950 leading-relaxed shadow-sm">
                🔒 <strong className="text-blue-900">Security & Protection Notice:</strong> All user communications, proposals, and payment checkouts must take place within the FreelNova platform. Off-platform contact sharing (phone numbers, emails, WhatsApp, Telegram, UPI IDs, bank details, QR codes) is strictly prohibited to guarantee escrow protection and account safety.
              </div>

              <div className="space-y-4 max-h-[650px] overflow-y-auto pr-2 [scrollbar-width:thin]">
                {TERMS_AND_CONDITIONS.map((term, index) => (
                  <div key={index} className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 space-y-2 text-left">
                    <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">{term.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">{term.content}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* PRIVACY POLICY TAB */}
          {activeTab === "privacy" && (
            <section className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_16px_38px_rgba(15,23,42,0.04)] md:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Privacy Policy</h2>
                  <p className="mt-1 text-sm text-slate-500">Official data protection, AI chat moderation limits, and privacy rights.</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-xs font-bold text-emerald-700 shrink-0">
                  <span>SSL 256-Bit Encrypted</span>
                </div>
              </div>

              <div className="space-y-4 max-h-[650px] overflow-y-auto pr-2 [scrollbar-width:thin]">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 space-y-2 text-left">
                  <h3 className="font-extrabold text-slate-900 text-sm">1. Personal Information We Collect</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    During registration and account creation, FreelNova collects your Full Name, Email Address, Account Role (Freelancer or Recruiter), and Password credentials. Email address verification is enforced via a One-Time Password (OTP). Additionally, profile pictures, portfolios, resume uploads, and payment verification details are collected to enable platform services.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 space-y-2 text-left">
                  <h3 className="font-extrabold text-slate-900 text-sm">2. AI Chat Safety & Moderation Scanning</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    To maintain platform security and protect users from fraud, all messaging logs inside the FreelNova chat workspace are analyzed in real time by automated security algorithms. Shared phone numbers, email addresses, WhatsApp/Telegram links, UPI IDs, bank account numbers, or QR code images are automatically detected, redacted, and logged for administrative safety review.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 space-y-2 text-left">
                  <h3 className="font-extrabold text-slate-900 text-sm">3. Financial Data & Razorpay Checkout Safety</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    All escrow deposits, top-ups, and subscription checkouts are processed through Razorpay, a PCI-DSS certified third-party payment gateway. FreelNova never stores full credit card numbers, CVVs, or net-banking credentials on our servers. We store transaction reference IDs and wallet milestone balances.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 space-y-2 text-left">
                  <h3 className="font-extrabold text-slate-900 text-sm">4. How We Use Your Information</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Your personal information is used exclusively to operate the marketplace, facilitate project proposals, match freelancers with recruiter listings via AI algorithms, process milestone payouts, send transaction notifications, and enforce platform security policies.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 space-y-2 text-left">
                  <h3 className="font-extrabold text-slate-900 text-sm">5. Third-Party Data Sharing & Non-Disclosure</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    FreelNova strictly covenants that your personal data, contact information, and private communication logs will never be sold, rented, or commercialized to third-party advertisers or data brokers. Information is shared only as necessary to process payments (Razorpay) or as mandated by official law enforcement subpoenas.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 space-y-2 text-left">
                  <h3 className="font-extrabold text-slate-900 text-sm">6. Cookies & Session Management</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    We utilize HTTP-only cookies and local storage tokens to maintain user authentication sessions, preserve user preferences, and secure API endpoints. You can clear cookies through your browser settings, though doing so will terminate active user sessions.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 space-y-2 text-left">
                  <h3 className="font-extrabold text-slate-900 text-sm">7. Data Rights, Account Deletion & Security Updates</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Users possess the right to inspect, update, or request the permanent deletion of their account profile and data, provided all active contracts and milestone payouts are closed. Account deletion requests can be initiated by contacting support at fn.freelnova@gmail.com.
                  </p>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default CompanyInfo;
