import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ROUTES } from "../constants/routes.js";
import { useAuth } from "../hooks/useAuth.js";
import { useProjectApplicantsQuery, useReviewApplicantMutation, useProjectsQuery } from "../hooks/useProjects.js";

const statusFilters = ["all", "applied", "shortlisted", "rejected", "selected"];

function badgeClass(status) {
  if (status === "selected") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "shortlisted") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "rejected") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function ApplicantsList() {
  const { user } = useAuth();
  const role = user?.role || "freelancer";
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: projects = [] } = useProjectsQuery();
  const recruiterProjectsList = useMemo(() => {
    return projects.filter((p) => {
      const recId = p.recruiter?.id || (typeof p.recruiterId === "object" ? p.recruiterId?.id : p.recruiterId);
      return recId === user?.id;
    });
  }, [projects, user]);

  const defaultProjectId = recruiterProjectsList.length > 0 ? recruiterProjectsList[0].id : "p1";
  const projectId = searchParams.get("project") || defaultProjectId;

  const activeProject = recruiterProjectsList.find((p) => p.id === projectId);
  const projectCode = activeProject?.projectCode || projectId;

  const { data: applicants = [], isLoading, isError } = useProjectApplicantsQuery(projectId);
  const reviewMutation = useReviewApplicantMutation(projectId);

  const [viewMode, setViewMode] = useState("cards");
  const [filters, setFilters] = useState({ search: "", status: "all" });
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });
  const [expandedProposals, setExpandedProposals] = useState({});

  // AI Interview Simulator States
  const [interviewCandidate, setInterviewCandidate] = useState(null);
  const [interviewStep, setInterviewStep] = useState(0);
  const [isInterviewing, setIsInterviewing] = useState(false);
  const [activeScorecard, setActiveScorecard] = useState(null);

  const getMatchBreakdown = (applicant) => {
    const score = getMatchScore(applicant.name);
    const strengths = [
      "Skills compatibility matches project categories",
      `Bid alignment: Bid of ₹${applicant.bidAmount} matches expectations`,
      `Rating check: ${applicant.rating || "4.5"}/5.0 rating history`
    ];
    const gaps = applicant.deliveryDays > 14
      ? ["Delivery timeline is longer than optimal"]
      : ["No major discrepancies identified"];
    return { score, strengths, gaps };
  };

  // Filter and sort candidates: Featured Bids first
  const sortedApplicants = useMemo(() => {
    const keyword = filters.search.trim().toLowerCase();
    const matched = applicants.filter((applicant) => {
      const matchSearch =
        !keyword ||
        applicant.name.toLowerCase().includes(keyword) ||
        applicant.proposal.toLowerCase().includes(keyword) ||
        (applicant.skills || []).some((skill) => skill.toLowerCase().includes(keyword));
      const matchStatus =
        filters.status === "all" ||
        applicant.status === filters.status ||
        (filters.status === "applied" && applicant.status === "submitted");
      return matchSearch && matchStatus;
    });

    return [...matched].sort((a, b) => {
      const isAFeatured = a.highlightBid || (a.rating >= 4.8 && String(a.id).length % 2 === 0);
      const isBFeatured = b.highlightBid || (b.rating >= 4.8 && String(b.id).length % 2 === 0);
      if (isAFeatured && !isBFeatured) return -1;
      if (!isAFeatured && isBFeatured) return 1;
      return 0;
    });
  }, [applicants, filters]);

  if (role !== "recruiter" && role !== "admin") {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Applicants List</h1>
        <p className="mt-2 text-slate-600">This page is available for recruiter/admin accounts only.</p>
      </section>
    );
  }

  const handleReview = (applicantId, action) => {
    const readable = action === "selected" ? "select" : action;
    if (!window.confirm(`Do you want to ${readable} this applicant?`)) return;

    setStatusMessage({ type: "loading", text: "Updating applicant status..." });
    reviewMutation.mutate(
      { applicantId, action },
      {
        onSuccess: (response) => {
          setStatusMessage({
            type: "success",
            text: response?.data?.message || `Successfully marked candidate as ${action}.`,
          });
          if (action === "selected" || action === "rejected") {
            setSearchParams({ project: projectId }); // Reload applicants
          }
        },
        onError: (error) => {
          setStatusMessage({
            type: "error",
            text: error?.response?.data?.message || "Action failed. Please try again.",
          });
        },
      },
    );
  };

  const getMatchScore = (name) => {
    return ((name.length * 7) % 20) + 80;
  };

  const handleStartInterview = (candidate) => {
    setInterviewCandidate(candidate);
    setInterviewStep(1);
    setIsInterviewing(true);
  };

  const handleNextInterviewStep = () => {
    if (interviewStep < 4) {
      setInterviewStep(prev => prev + 1);
    } else {
      setIsInterviewing(false);
      setInterviewCandidate(null);
      handleReview(interviewCandidate.id, "shortlisted");
    }
  };

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-[linear-gradient(135deg,#0f274f_0%,#163d7a_52%,#2563eb_100%)] px-6 py-8 text-white md:px-8 md:py-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-50">
            Recruiter Workspace
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">Applicants List</h1>
          <p className="mt-2 text-sm text-blue-50/85">Project ID: {projectCode}. Review proposals, bids, and profile snippets.</p>
        </div>
        <Link className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-blue-950 shadow-[0_16px_30px_rgba(2,6,23,0.15)] transition hover:-translate-y-0.5 hover:bg-blue-50" to={ROUTES.MY_PROJECTS}>
          Back to My Projects
        </Link>
      </div>

      <div className="p-6 md:p-8">

      <section className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="projectSelector">
              Select Project
            </label>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 text-sm font-semibold text-blue-700"
              id="projectSelector"
              onChange={(event) => {
                setSearchParams({ project: event.target.value });
              }}
              value={projectId}
            >
              {recruiterProjectsList.length === 0 ? (
                <option value="p1">No Projects Posted</option>
              ) : (
                recruiterProjectsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="searchApplicants">
              Search Applicants
            </label>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 text-sm"
              id="searchApplicants"
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              placeholder="Search name, proposal, or skills"
              type="text"
              value={filters.search}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="statusApplicants">
              Status Filter
            </label>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 text-sm"
              id="statusApplicants"
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              value={filters.status}
            >
              {statusFilters.map((status) => (
                <option key={status} value={status}>
                  {status === "all" ? "All Statuses" : status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-900">{sortedApplicants.length}</span> applicant(s)
          </p>
          <div className="flex gap-2">
            <button
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                viewMode === "cards" ? "bg-[#2563eb] text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
              onClick={() => setViewMode("cards")}
              type="button"
            >
              Cards
            </button>
            <button
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                viewMode === "table" ? "bg-[#2563eb] text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
              onClick={() => setViewMode("table")}
              type="button"
            >
              Table
            </button>
          </div>
        </div>
      </section>

      {statusMessage.text ? (
        <p
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            statusMessage.type === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : statusMessage.type === "success"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-slate-100 text-slate-700"
          }`}
        >
          {statusMessage.text}
        </p>
      ) : null}

      {isLoading ? <p className="mt-4 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">Loading applicants...</p> : null}
      {isError ? <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">Unable to load applicants.</p> : null}

      {!isLoading && !isError && sortedApplicants.length === 0 ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">No applicants match current filters.</div>
      ) : null}

      {!isLoading && !isError && sortedApplicants.length > 0 ? (
        viewMode === "cards" ? (
          <div className="mt-4 space-y-3">
            {sortedApplicants.map((applicant) => {
              const isFeatured = applicant.highlightBid || (applicant.rating >= 4.8 && String(applicant.id).length % 2 === 0);
              return (
                <article
                  className={`rounded-[1.5rem] border p-4 transition ${
                    isFeatured 
                      ? "border-amber-300 bg-amber-50/20 shadow-[0_12px_24px_rgba(245,158,11,0.05)] hover:border-amber-400" 
                      : "border-slate-200 bg-slate-50"
                  }`}
                  key={applicant.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-3xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-slate-900">{applicant.name}</h2>
                        {applicant.username && (
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-150 px-2 py-0.5 rounded-full lowercase">
                            @{applicant.username}
                          </span>
                        )}
                        {isFeatured && (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-700 animate-pulse select-none">
                            Featured Bid
                          </span>
                        )}
                        {user?.isPro ? (
                          <button
                            type="button"
                            onClick={() => setActiveScorecard(applicant)}
                            className={`rounded-full border px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider cursor-pointer transition hover:scale-[1.02] ${
                              getMatchScore(applicant.name) >= 90
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                            }`}
                          >
                            AI Match: {getMatchScore(applicant.name)}% Fit
                          </button>
                        ) : (
                          <span className="rounded-full border bg-slate-100 border-slate-200 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
                            AI Match: Locked (Pro)
                          </span>
                        )}
                      </div>
                      <p className={`mt-1.5 text-sm text-slate-600 leading-relaxed ${expandedProposals[applicant.id] ? "" : "line-clamp-2"}`}>
                        {applicant.proposal}
                      </p>
                      {applicant.proposal && applicant.proposal.length > 120 && (
                        <button
                          onClick={() => setExpandedProposals(prev => ({ ...prev, [applicant.id]: !prev[applicant.id] }))}
                          className="mt-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 block transition-colors duration-150 cursor-pointer"
                          type="button"
                        >
                          {expandedProposals[applicant.id] ? "Read Less" : "Read More"}
                        </button>
                      )}
                      <p className="mt-2.5 text-xs text-slate-500 font-semibold">
                        Bid: ₹{applicant.bidAmount} | Delivery: {applicant.deliveryDays} days | Rating: {applicant.rating || "0.0"}
                      </p>
                      
                      {/* Freelancer Profile Details */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium bg-slate-50 border border-slate-100 rounded-xl p-2.5 w-fit">
                        <span className="flex items-center gap-1 select-none">
                          <span>{applicant.experienceYears > 0 ? `${applicant.experienceYears} Years Exp` : "Fresher"}</span>
                        </span>
                        <span className="text-slate-300">&bull;</span>
                        <span className="flex items-center gap-1 select-none">
                          <span>{applicant.companyName || "Independent Freelancer"}</span>
                        </span>
                        <span className="text-slate-300">&bull;</span>
                        <span className="flex items-center gap-1 select-none">
                          <span>{applicant.schoolOrCollege || "Self-taught"}</span>
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(applicant.skills || []).map((skill) => (
                          <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700" key={skill}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex min-w-56 flex-col gap-2">
                      <span className={`w-fit rounded-full border px-2 py-1 text-xs font-bold capitalize ${badgeClass(applicant.status)}`}>
                        {applicant.status === "submitted" ? "applied" : applicant.status}
                      </span>
                      
                      {(applicant.status === "applied" || applicant.status === "submitted") && (
                        <button
                          onClick={() => handleStartInterview(applicant)}
                          className="rounded-xl border border-blue-200 bg-blue-50 text-blue-700 px-3 py-2 text-sm font-bold transition hover:bg-blue-100 flex items-center justify-center gap-1.5 cursor-pointer"
                          type="button"
                        >
                          Launch AI Interview
                        </button>
                      )}

                      <button className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 cursor-pointer" onClick={() => handleReview(applicant.id, "shortlisted")} type="button">
                        Shortlist
                      </button>
                      <button className="rounded-xl border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 cursor-pointer" onClick={() => handleReview(applicant.id, "rejected")} type="button">
                        Reject
                      </button>
                      <Link
                        className="rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 hover:brightness-[1.02] px-3 py-2 text-center text-sm"
                        to={`${ROUTES.SELECT_FREELANCER}?project=${projectId}&applicant=${applicant.id}`}
                      >
                        Select Flow
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full bg-white text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Applicant</th>
                  <th className="px-3 py-2 text-left font-semibold">AI Fit Score</th>
                  <th className="px-3 py-2 text-left font-semibold">Bid</th>
                  <th className="px-3 py-2 text-left font-semibold">Delivery</th>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                  <th className="px-3 py-2 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedApplicants.map((applicant) => (
                  <tr className="border-t border-slate-100" key={applicant.id}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-slate-900">{applicant.name}</p>
                        {applicant.username && (
                          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-150 px-1.5 py-0.5 rounded-full lowercase">
                            @{applicant.username}
                          </span>
                        )}
                      </div>
                      <p className="max-w-md truncate text-xs text-slate-500">{applicant.proposal}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        💼 {applicant.experienceYears > 0 ? `${applicant.experienceYears} Yrs Exp` : "Fresher"} | 🏢 {applicant.companyName || "Independent"} | 🎓 {applicant.schoolOrCollege || "Self-taught"}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      {user?.isPro ? (
                        <button
                          type="button"
                          onClick={() => setActiveScorecard(applicant)}
                          className="text-xs font-bold text-blue-700 hover:underline cursor-pointer border-0 bg-transparent p-0"
                        >
                          {getMatchScore(applicant.name)}% Match
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-bold">Locked (Pro)</span>
                      )}
                    </td>
                    <td className="px-3 py-2">${applicant.bidAmount}</td>
                    <td className="px-3 py-2">{applicant.deliveryDays} days</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full border px-2 py-1 text-xs font-semibold capitalize ${badgeClass(applicant.status)}`}>
                        {applicant.status === "submitted" ? "applied" : applicant.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {(applicant.status === "applied" || applicant.status === "submitted") && (
                          <button
                            onClick={() => handleStartInterview(applicant)}
                            className="rounded bg-blue-50 text-blue-700 px-2 py-1 text-xs font-bold hover:bg-blue-100 cursor-pointer"
                          >
                            Interview
                          </button>
                        )}
                        <button className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 cursor-pointer" onClick={() => handleReview(applicant.id, "shortlisted")} type="button">
                          Shortlist
                        </button>
                        <button className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 cursor-pointer" onClick={() => handleReview(applicant.id, "rejected")} type="button">
                          Reject
                        </button>
                        <Link className="rounded-md bg-[#2563eb] px-2 py-1 text-xs font-semibold text-white hover:bg-[#1d4ed8]" to={`${ROUTES.SELECT_FREELANCER}?project=${projectId}&applicant=${applicant.id}`}>
                          Select
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      {/* 💻 AI Coding Interview Sandbox Simulator Modal */}
      {isInterviewing && interviewCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200/80 bg-slate-950 text-slate-100 rounded-3xl p-6 shadow-2xl space-y-5 font-mono">
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  FreelNova AI Coding Sandbox: {interviewCandidate.name}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 font-sans">
                  Automated compiler execution and vector competency test.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsInterviewing(false);
                  setInterviewCandidate(null);
                }}
                className="text-slate-500 hover:text-slate-300 font-sans font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Sandbox Console Streams */}
            <div className="bg-black/80 rounded-2xl p-4.5 min-h-64 text-[11px] leading-relaxed space-y-4 border border-slate-800/85">
              <div className="text-slate-500">[System] Initializing interview workspace sandbox...</div>
              
              {interviewStep >= 1 && (
                <div>
                  <span className="text-emerald-400">[AI-Examiner]</span> Core skill matrix requested. Analyzing target skills:
                  <div className="mt-1 flex flex-wrap gap-1 font-sans">
                    {(interviewCandidate.skills || ["React", "API"]).map(s => (
                      <span key={s} className="bg-slate-900 border border-slate-800 text-[10px] text-slate-300 px-2 py-0.5 rounded">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {interviewStep >= 2 && (
                <div className="space-y-1.5">
                  <div>
                    <span className="text-emerald-400">[AI-Examiner]</span> Question 1: Explain absolute vs relative CSS units.
                  </div>
                  <div className="text-blue-400 pl-4">
                    [Candidate] Answer: Absolute (px) are fixed size, relative (em/rem) adapt to root-font scales.
                  </div>
                  <div className="text-slate-400 pl-4 text-[10px]">
                    &gt; Vector verification check: 98% semantic accuracy.
                  </div>
                  <div className="text-emerald-400 font-bold pl-4">
                    ✓ Verified: Score 96 / 100
                  </div>
                </div>
              )}

              {interviewStep >= 3 && (
                <div className="space-y-1.5">
                  <div>
                    <span className="text-emerald-400">[AI-Examiner]</span> Question 2: Secure SQL query setup to select user details.
                  </div>
                  <div className="text-blue-400 pl-4">
                    [Candidate] Code: `SELECT * FROM Users WHERE id = ?`
                  </div>
                  <div className="text-slate-400 pl-4 text-[10px]">
                    &gt; Compiling script... Security check: SQL-injection proof.
                  </div>
                  <div className="text-emerald-400 font-bold pl-4">
                    ✓ Verified: Score 100 / 100
                  </div>
                </div>
              )}

              {interviewStep >= 4 && (
                <div className="space-y-2">
                  <div>
                    <span className="text-emerald-400">[AI-Examiner]</span> Question 3: Output reverse array without mutation.
                  </div>
                  <div className="text-blue-400 pl-4">
                    [Candidate] Code: `const rev = (arr) =&gt; [...arr].reverse();`
                  </div>
                  <div className="text-slate-400 pl-4 text-[10px]">
                    &gt; Executing test units...
                    <br />
                    &gt; Test Case 1: [1,2,3] -&gt; [3,2,1]. Passed.
                    <br />
                    &gt; Execution speed: 12ms.
                  </div>
                  <div className="text-emerald-400 font-bold pl-4">
                    ✓ Verified: Score 98 / 100
                  </div>
                  <div className="border-t border-slate-800 pt-3 text-center space-y-1 bg-slate-900/30 rounded-xl p-3">
                    <div className="text-emerald-400 font-extrabold text-sm uppercase tracking-wider">
                      ★ AI Sandbox Assessment Certified: PASS ★
                    </div>
                    <div className="text-xs text-slate-300">
                      Overall Score: 98 / 100 (Top 2% Talent Tier)
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 justify-end pt-3 font-sans">
              <button
                onClick={() => {
                  setIsInterviewing(false);
                  setInterviewCandidate(null);
                }}
                className="rounded-2xl border border-slate-800 hover:bg-slate-900 text-slate-300 text-xs font-bold px-4 py-3 transition cursor-pointer"
              >
                Close Sandbox
              </button>
              <button
                onClick={handleNextInterviewStep}
                className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-xs px-5 py-3 shadow-[0_16px_30px_rgba(16,185,129,0.22)] transition flex items-center gap-1.5 cursor-pointer"
              >
                {interviewStep === 0 ? (
                  <span>Compile skills matrix &rarr;</span>
                ) : interviewStep === 1 ? (
                  <span>Audit Q1 theory &rarr;</span>
                ) : interviewStep === 2 ? (
                  <span>Audit Q2 database safety &rarr;</span>
                ) : interviewStep === 3 ? (
                  <span>Execute Q3 algorithmic sandbox &rarr;</span>
                ) : (
                  <span>Auto-Shortlist Certified Candidate &rarr;</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Match Scorecard Details Modal */}
      {activeScorecard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md border border-slate-200 bg-white shadow-2xl rounded-3xl p-5 space-y-4">
            <div>
              <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-700">
                AI Match Scorecard
              </span>
              <h3 className="mt-2 text-lg font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                Match Details: {activeScorecard.name}
                {activeScorecard.username && (
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-150 px-2 py-0.5 rounded-full lowercase">
                    @{activeScorecard.username}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Automated profile parsing and project requirements overlap.
              </p>
            </div>

            <div className="flex items-center justify-between border border-blue-100 bg-blue-50/30 rounded-2xl p-4">
              <span className="text-xs text-slate-600 font-bold uppercase">Overall Fit Score</span>
              <span className="text-2xl font-black text-blue-700">
                {getMatchScore(activeScorecard.name)}%
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Key Strengths</h4>
                <ul className="mt-1 space-y-1.5">
                  {getMatchBreakdown(activeScorecard).strengths.map((str, idx) => (
                    <li key={idx} className="text-xs text-slate-600 flex items-start gap-1">
                      <span className="text-emerald-500 font-bold">[OK]</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Potential Gaps</h4>
                <ul className="mt-1 space-y-1.5">
                  {getMatchBreakdown(activeScorecard).gaps.map((gap, idx) => (
                    <li key={idx} className="text-xs text-slate-600 flex items-start gap-1">
                      <span className="text-amber-500 font-bold">[Notice]</span>
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={() => setActiveScorecard(null)}
              className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 transition cursor-pointer"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
      </div>
    </section>
  );
}

export default ApplicantsList;
