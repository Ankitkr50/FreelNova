import { useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/routes.js";
import { useFreelancersQuery } from "../../hooks/useProjects.js";
import { useAuth } from "../../hooks/useAuth.js";
import { usePaymentStatsQuery } from "../../hooks/usePayments.js";

function RecruiterDashboard({ data }) {
  const { user } = useAuth();
  const metrics = data?.metrics || {};
  const postedProjects = data?.postedProjects || [];
  const applicantsSummary = data?.applicantsSummary || [];
  const quickActions = data?.quickActions || [];

  const [activeTab, setActiveTab] = useState("postings");
  const [diyTeams, setDiyTeams] = useState(() => {
    try {
      const saved = localStorage.getItem("sb_diy_teams");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [talentSearch, setTalentSearch] = useState("");
  const { data: freelancers = [], isLoading: isLoadingTalent } = useFreelancersQuery({ q: talentSearch });
  
  // Real spent stats from backend
  const { data: stats } = usePaymentStatsQuery();

  const handleInvite = (freelancer) => {
    const projectTitle = prompt(
      `Invite ${freelancer.name} to a project. Enter project title:`,
      "React Frontend Gig"
    );
    if (!projectTitle) return;

    const requests = JSON.parse(localStorage.getItem("sb_chat_requests") || "[]");
    const newReq = {
      id: `req_${Date.now()}`,
      senderId: user?.id || "recruiter_1",
      senderName: user?.name || "Hiring Manager",
      senderRole: "Recruiter",
      receiverId: freelancer.id,
      receiverName: freelancer.name,
      projectTitle,
      status: "pending",
      createdAt: new Date().toISOString()
    };
    requests.push(newReq);
    localStorage.setItem("sb_chat_requests", JSON.stringify(requests));
    alert(`Invitation sent to ${freelancer.name} for "${projectTitle}"! Chat request created.`);
  };

  const grossSpent = stats?.totalAmount || 0;
  const taxPaid = stats?.taxAmount || 0;
  const netSpent = stats?.netAmount || 0;
  const commissionRatePercent = grossSpent > 0 ? Math.round((taxPaid / grossSpent) * 100) : 15;
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
      {/* Recruiter Quick Access Console */}
      <section className="col-span-full grid gap-4 grid-cols-2 md:grid-cols-4">
        <Link
          to={ROUTES.TALENT_SOLUTIONS}
          className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-white p-5 shadow-sm hover:shadow-md transition hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-9 1.5h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm-.75-6h.008v.008H6.75v-.008zm0 2.25h.008v.008H6.75v-.008zm11.25-3h.008v.008H18v-.008zM15.75 9h.008v.008H15.75V9zm0 2.25h.008v.008H15.75v-.008zM13.5 9h.008v.008H13.5V9zm0 2.25h.008v.008H13.5v-.008zM11.25 9h.008v.008H11.25V9zm0 2.25h.008v.008H11.25v-.008zM9 9h.008v.008H9V9zm0 2.25h.008v.008H9v-.008zM6.75 9h.008v.008H6.75V9zm0 2.25h.008v.008H6.75v-.008z" />
              </svg>
            </span>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Talent Solutions</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">AI briefs & custom pods</p>
            </div>
          </div>
        </Link>

        <Link
          to={ROUTES.POST_PROJECT}
          className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-white p-5 shadow-sm hover:shadow-md transition hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </span>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Post Project</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Publish a new vacancy</p>
            </div>
          </div>
        </Link>

        <Link
          to={ROUTES.MY_PROJECTS}
          className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/70 to-white p-5 shadow-sm hover:shadow-md transition hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75c.9 0 1.625.725 1.625 1.625v1.875c0 .9-.725 1.625-1.625 1.625H5.625A1.625 1.625 0 0 1 4 7.625V6.125C4 5.225 4.725 4.5 5.625 4.5z" />
              </svg>
            </span>
            <div>
              <h4 className="text-sm font-bold text-slate-800">My Projects</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Manage vacancies & escrows</p>
            </div>
          </div>
        </Link>

        <Link
          to={ROUTES.APPLICANTS_LIST}
          className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-white p-5 shadow-sm hover:shadow-md transition hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A2.25 2.25 0 0 1 12.75 21.5h-1.5a2.25 2.25 0 0 1-2.25-2.263v-.109m0 0A9.38 9.38 0 0 1 9 19.5a9.337 9.337 0 0 1-4.121-.952 4.125 4.125 0 0 1 7.533-2.493M9 19.128v-.003c0-1.113.285-2.16.786-3.07M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-7-3a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm14 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
              </svg>
            </span>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Applicants</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Review freelancer bids</p>
            </div>
          </div>
        </Link>
      </section>

      {/* Left Column: Postings Feed, Search and Spent Graphs */}
      <div className="space-y-6">
        {/* Recruiter Overview Stats */}
        <section className="border border-slate-200/80 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.06)] rounded-[2rem] overflow-hidden">
          <div className="bg-[linear-gradient(135deg,#0f274f_0%,#163d7a_52%,#2563eb_100%)] px-6 py-4">
            <h2 className="text-lg font-bold text-white tracking-tight">Hiring & Expenditure</h2>
            <p className="text-xs text-blue-100/90 mt-0.5">Track your project allocations, escrow funds, and platform commissions.</p>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-4">
              <article className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Spent</p>
                <p className="mt-2 text-xl font-extrabold text-slate-900">₹{grossSpent.toLocaleString()}</p>
                <span className="text-[10px] text-slate-500 font-medium mt-1 inline-block">Gross platform outflow</span>
              </article>

              <article className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Platform Fee ({commissionRatePercent}%)</p>
                <p className="mt-2 text-xl font-extrabold text-blue-600">₹{taxPaid.toLocaleString()}</p>
                <span className="text-[10px] text-slate-500 font-medium mt-1 inline-block">{commissionRatePercent}% tax/service charge</span>
              </article>

              <article className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Project Pay</p>
                <p className="mt-2 text-xl font-extrabold text-slate-900">₹{netSpent.toLocaleString()}</p>
                <span className="text-[10px] text-slate-500 font-medium mt-1 inline-block">Direct freelancer payouts</span>
              </article>

              <article className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Postings</p>
                <p className="mt-2 text-xl font-extrabold text-slate-900">{metrics.postedProjects || 0}</p>
                <span className="text-[10px] text-slate-500 font-medium mt-1 inline-block">Running vacancies</span>
              </article>
            </div>

            {/* Spent Graph Container */}
            <div className="border-t border-slate-100 pt-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Expense Analytics Chart</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Visual overview of gross budget allocation vs platform fees (Hover for details).</p>
              </div>
              
              {/* SVG Interactive Trend Graph */}
              <div className="relative border-b border-slate-200 pb-4 pt-6">
                <div className="w-full">
                  <div className="h-48 w-full relative">
                    <svg className="w-full h-full" viewBox="0 0 600 150" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="recruiterSpentGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Grid background lines */}
                      <line x1="0" y1="30" x2="600" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="0" y1="75" x2="600" y2="75" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="0" y1="120" x2="600" y2="120" stroke="#f1f5f9" strokeWidth="1" />

                      {/* Area and Paths */}
                      {graphData.length > 0 ? (
                        <>
                          {/* Area under Gross Line */}
                          <path d={areaPath} fill="url(#recruiterSpentGrad)" />

                          {/* Gross Line (Solid Blue) */}
                          <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                          {/* Net Line (Dashed Emerald) */}
                          <path d={netLinePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray="5 3" strokeLinecap="round" strokeLinejoin="round" />
                        </>
                      ) : (
                        <>
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
                                <p className="flex justify-between"><span>Gross Spent:</span> <span className="font-bold">₹{p.data.amount.toLocaleString()}</span></p>
                                <p className="flex justify-between text-blue-300"><span>Platform Fee ({commissionRatePercent}%):</span> <span className="font-bold">₹{p.data.tax.toLocaleString()}</span></p>
                                <p className="flex justify-between text-emerald-400 font-bold border-t border-white/10 pt-1"><span>Net Freelancer Payout:</span> <span>₹{p.data.net.toLocaleString()}</span></p>
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
          </div>
        </section>

        {/* Tabbed Interface: Posted Jobs vs Search Talent */}
        <section className="border border-slate-200/80 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.06)] rounded-[2rem] overflow-hidden">
          <div className="bg-[linear-gradient(135deg,#0f274f_0%,#163d7a_52%,#2563eb_100%)] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-1.5 bg-white/10 backdrop-blur-md border border-white/15 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveTab("postings")}
                className={`px-3 py-1.5 rounded-lg transition-all border-0 outline-none cursor-pointer ${
                  activeTab === "postings" ? "bg-white text-blue-900 shadow-sm font-bold" : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                My Job Postings ({postedProjects.length})
              </button>
              <button
                onClick={() => setActiveTab("talent")}
                className={`px-3 py-1.5 rounded-lg transition-all border-0 outline-none cursor-pointer ${
                  activeTab === "talent" ? "bg-white text-blue-900 shadow-sm font-bold" : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                Browse & Hire Talent
              </button>
              <button
                onClick={() => setActiveTab("diy-teams")}
                className={`px-3 py-1.5 rounded-lg transition-all border-0 outline-none cursor-pointer ${
                  activeTab === "diy-teams" ? "bg-white text-blue-900 shadow-sm font-bold" : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                My Custom Teams ({diyTeams.length})
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === "postings" && (
              <div className="space-y-4">
                {postedProjects.length ? (
                  postedProjects.map((project) => (
                    <div key={project.id} className="border border-slate-100 bg-slate-50/40 rounded-2xl p-5 hover:border-blue-200 transition">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Link to={`/projects/${project.id}`} className="text-base font-bold text-slate-900 hover:text-blue-600">
                            {project.title}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">
                            Category: {project.category} &bull; Deadline: {new Date(project.deadline).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          Active
                        </span>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-xs text-slate-600">
                          Candidates Applied: <span className="font-semibold text-slate-900">{project.proposals}</span>
                        </span>
                        <Link
                          to={`/projects/${project.id}/applicants`}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700"
                        >
                          Review Applicants &rarr;
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                    <p className="text-sm text-slate-500">You haven't posted any jobs yet.</p>
                    <Link to="/post-project" className="mt-3 inline-block text-xs font-semibold text-blue-600 hover:text-blue-700">
                      Post your first job &rarr;
                    </Link>
                  </div>
                )}
              </div>
            )}

            {activeTab === "talent" && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={talentSearch}
                    onChange={(e) => setTalentSearch(e.target.value)}
                    placeholder="Search freelancers by name, skill, or keyword..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                  />
                </div>

                {isLoadingTalent ? (
                  <p className="text-sm text-slate-500">Searching freelancers...</p>
                ) : freelancers.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {freelancers.map((talent) => (
                      <div key={talent.id} className="border border-slate-100 bg-slate-50/40 rounded-2xl p-4 flex flex-col justify-between hover:border-blue-200 transition">
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-900">{talent.name}</h4>
                            <div className="flex items-center text-xs text-amber-500 font-semibold">
                              ★ <span className="ml-1 text-slate-700">{talent.ratingAvg || "0.0"}</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{talent.headline || "Professional Freelancer"}</p>
                          <p className="text-xs text-slate-600 line-clamp-2 mt-2">{talent.bio || "No biography provided."}</p>
                          
                          <div className="mt-3 flex flex-wrap gap-1">
                            {talent.skills.slice(0, 3).map((s) => (
                              <span key={s} className="rounded bg-white border border-slate-200 px-2 py-0.5 text-[9px] text-slate-500">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2 pt-3 border-t border-slate-100/60">
                          <button
                            onClick={() => handleInvite(talent)}
                            className="flex-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold py-1.5 transition border border-blue-200/50"
                          >
                            Invite to Job
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-sm text-slate-500">
                    No freelancers found matching your search.
                  </div>
                )}
              </div>
            )}

            {activeTab === "diy-teams" && (
              <div className="space-y-4">
                {diyTeams.length ? (
                  diyTeams.map((team) => (
                    <div key={team.id} className="border border-slate-100 bg-slate-50/40 rounded-2xl p-5 hover:border-blue-200 transition space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/60 pb-3">
                        <div>
                          <h4 className="text-base font-bold text-slate-900">{team.name}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Created: {team.date} &bull; Total Escrow Paid: <span className="font-semibold text-slate-900">₹{team.grossTotal?.toLocaleString()}</span>
                          </p>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          {team.status}
                        </span>
                      </div>

                      {/* Team Slots/Members */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        {team.slots.map((slot) => (
                          <div key={slot.id} className="rounded-xl border border-slate-200/70 bg-white p-4 space-y-2 text-xs">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-slate-800">{slot.freelancer?.name || "Freelancer"}</p>
                                {slot.freelancer?.username && (
                                  <p className="text-[10px] text-blue-600 font-semibold">@{slot.freelancer.username}</p>
                                )}
                              </div>
                              <span className="rounded bg-slate-100 px-2 py-0.5 font-bold text-slate-600 text-[10px] uppercase">
                                {slot.category}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-slate-505 pt-2 border-t border-slate-100/60 mt-1">
                              <span>Allocated Pay:</span>
                              <span className="font-bold text-slate-955">₹{slot.payAmount?.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                    <p className="text-sm text-slate-505">You haven't built any custom teams yet.</p>
                    <Link to="/talent-solutions" state={{ tab: "diy-team" }} className="mt-3 inline-block text-xs font-semibold text-blue-600 hover:text-blue-700">
                      Build your first team &rarr;
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Right Column: Quick Actions & Hire Stats */}
      <div className="space-y-6">
        {/* Quick Actions Panel */}
        <section className="border border-slate-200/80 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.06)] rounded-[2rem] overflow-hidden">
          <div className="px-6 pt-5 pb-3 border-b border-slate-100/80">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Hiring Actions</h3>
          </div>
          <div className="p-6">
            <div className="space-y-2.5">
              <Link
                to="/post-project"
                className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 hover:brightness-[1.02]"
              >
                Post a New Project
              </Link>
              {quickActions.filter(a => a.path !== "/post-project").map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex w-full items-center justify-center rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 transition"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Company profile tracker */}
        <section className="border border-slate-200/80 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.06)] rounded-[2rem] overflow-hidden">
          <div className="px-6 pt-5 pb-3 border-b border-slate-100/80">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Payment Verification</h3>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Status</span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Verified</span>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-500">
              <span>Total spent on platform</span>
              <span className="font-bold text-slate-900">₹{grossSpent.toLocaleString()}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default RecruiterDashboard;
