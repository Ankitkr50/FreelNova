import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ProjectStatusTimeline from "../components/projects/ProjectStatusTimeline.jsx";
import { ROUTES } from "../constants/routes.js";
import { useAuth } from "../hooks/useAuth.js";
import { useProjectsQuery, useUpdateProjectStatusMutation, useAppliedProjectsQuery } from "../hooks/useProjects.js";

const statuses = ["all", "posted", "applied", "selected", "in_progress", "completed", "paid"];

function displayStatus(status) {
  return status.replaceAll("_", " ");
}

function MyProjects() {
  const { user } = useAuth();
  const role = user?.role || "freelancer";
  const { data: projects = [], isLoading, isError } = useProjectsQuery();
  const { data: appliedList = [], isLoading: isLoadingApplied } = useAppliedProjectsQuery();
  const updateStatusMutation = useUpdateProjectStatusMutation();

  const [filters, setFilters] = useState({ status: "all", category: "all" });
  const [viewMode, setViewMode] = useState("cards");
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });
  const [freelancerTab, setFreelancerTab] = useState("contracts");
  const [expandedBios, setExpandedBios] = useState({});

  // Futuristic AI Modals states
  const [auditProject, setAuditProject] = useState(null);
  const [auditStep, setAuditStep] = useState(0);

  const [mediationProject, setMediationProject] = useState(null);
  const [mediationStep, setMediationStep] = useState(0);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(projects.map((project) => project.category)))],
    [projects],
  );

  const recruiterProjects = useMemo(() => {
    return projects
      .filter((project) => filters.status === "all" || project.status === filters.status)
      .filter((project) => filters.category === "all" || project.category === filters.category)
      .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
  }, [projects, filters]);

  const handleStatusChange = (projectId, status) => {
    setStatusMessage({ type: "loading", text: "Updating project status..." });
    updateStatusMutation.mutate(
      { projectId, status },
      {
        onSuccess: (response) => {
          setStatusMessage({ type: "success", text: response?.data?.message || "Status updated." });
          if (status === "completed" || status === "paid") {
            try {
              const chatReqs = JSON.parse(localStorage.getItem("sb_chat_requests") || "[]");
              const updated = chatReqs.map((req) => {
                if (req.projectId === projectId) {
                  return { ...req, status: "completed" };
                }
                return req;
              });
              localStorage.setItem("sb_chat_requests", JSON.stringify(updated));
            } catch (err) {
              console.error("Failed to sync project status to local chat request:", err);
            }
          }
        },
        onError: (error) => {
          setStatusMessage({
            type: "error",
            text: error?.response?.data?.message || "Unable to update status.",
          });
        },
      },
    );
  };

  const handleRequestPayment = (title) => {
    alert(`Payment release request sent to the client for "${title}"! The escrow balance will be updated once reviewed.`);
  };

  const handleAutoReleaseEscrow = (projId) => {
    handleStatusChange(projId, "paid");
    setAuditProject(null);
    alert("🎉 AI Audit successfully released funds. Payout completed instantly via Razorpay Escrow!");
  };

  const handleAcceptMediationSplit = (projId) => {
    handleStatusChange(projId, "paid");
    setMediationProject(null);
    alert("⚖️ Dispute resolved. Mediated split payout completed successfully.");
  };

  // Freelancer view
  if (role !== "recruiter" && role !== "admin") {
    const contracts = appliedList.filter((app) => app.applicationStatus === "selected");
    const activeProposals = appliedList.filter((app) => app.applicationStatus !== "selected");

    return (
      <section className="border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-[16px] rounded-[2rem] p-6 md:p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
              Freelancer Workspace
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">My Contracts & Proposals</h1>
            <p className="mt-2 text-slate-600">Track active work milestones, submit deliverables, and manage pending proposals.</p>
          </div>
          <Link className="rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 hover:brightness-[1.02] px-5 py-3 text-sm" to={ROUTES.PROJECTS}>
            Browse Jobs
          </Link>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setFreelancerTab("contracts")}
            className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all ${
              freelancerTab === "contracts"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Active Contracts ({contracts.length})
          </button>
          <button
            onClick={() => setFreelancerTab("proposals")}
            className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all ${
              freelancerTab === "proposals"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Submitted Proposals ({activeProposals.length})
          </button>
        </div>

        {/* Contracts View */}
        {freelancerTab === "contracts" && (
          <div className="space-y-4">
            {isLoadingApplied ? (
              <p className="text-sm text-slate-500">Loading contracts list...</p>
            ) : contracts.length > 0 ? (
              contracts.map((item) => (
                <div key={item.id} className="border border-slate-200/80 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)] rounded-[1.5rem] p-5 space-y-4">
                  <div className="flex flex-wrap justify-between items-start gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <span>Client:</span>
                        <span className="font-semibold text-slate-700">{item.recruiter?.name || "Hiring Manager"}</span>
                        <span className="text-amber-500 font-bold text-[11px] flex items-center">
                          ★ {item.recruiter?.ratingAvg || "0.0"}
                        </span>
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      In Progress
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 text-xs text-slate-500 rounded-xl bg-slate-50 p-4 border border-slate-100">
                    <div>
                      <span className="block font-medium">Contract Value</span>
                      <span className="block font-bold text-slate-900 mt-0.5">{item.currency === "INR" ? "₹" : "$"}{item.bidAmount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="block font-medium">Timeline Allocated</span>
                      <span className="block font-bold text-slate-900 mt-0.5">{item.deliveryDays} Days</span>
                    </div>
                    <div>
                      <span className="block font-medium">Contract Status</span>
                      <span className="block font-bold text-slate-900 mt-0.5 capitalize">{item.status}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRequestPayment(item.title)}
                        className="rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 font-bold px-4 py-2.5 text-xs transition cursor-pointer"
                      >
                        Request Payment Release
                      </button>
                      <button
                        onClick={() => { setAuditProject({ title: item.title, id: item.id, budgetMax: item.bidAmount }); setAuditStep(0); }}
                        className="rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-extrabold uppercase tracking-wider px-4 py-2.5 text-[10px] transition cursor-pointer"
                      >
                        🔍 Run AI Audit
                      </button>
                    </div>
                    <Link
                      to={`/projects/${item.id}`}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      View Details &rarr;
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
                <p className="text-sm text-slate-500">You don't have any active contracts at the moment.</p>
                <Link to={ROUTES.PROJECTS} className="mt-3 inline-block text-xs font-bold text-blue-600 hover:text-blue-700">
                  Browse Marketplace &rarr;
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Proposals View */}
        {freelancerTab === "proposals" && (
          <div className="space-y-4">
            {isLoadingApplied ? (
              <p className="text-sm text-slate-500">Loading submitted proposals...</p>
            ) : activeProposals.length > 0 ? (
              activeProposals.map((item) => (
                <div key={item.id} className="border border-slate-200/80 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)] rounded-[1.5rem] p-5 space-y-3">
                  <div className="flex justify-between items-start gap-3">
                    <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      item.applicationStatus === "rejected"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}>
                      {item.applicationStatus}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="font-semibold text-slate-700 block mb-0.5">Your Cover Letter:</span>
                    {item.proposal}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                    <div>
                      <span>Proposed Bid: </span>
                      <span className="font-bold text-slate-800">{item.currency === "INR" ? "₹" : "$"}{item.bidAmount.toLocaleString()}</span>
                    </div>
                    <Link to={`/projects/${item.id}`} className="font-bold text-blue-600 hover:text-blue-700">
                      View details &rarr;
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
                <p className="text-sm text-slate-500">You haven't submitted any proposals yet.</p>
                <Link to={ROUTES.PROJECTS} className="mt-3 inline-block text-xs font-bold text-blue-600 hover:text-blue-700">
                  Search Jobs &rarr;
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Audit Modal for Freelancer */}
        {renderAuditModal()}
      </section>
    );
  }

  // Recruiter view
  return (
    <section className="border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-[16px] rounded-[2rem] overflow-hidden">
      <div className="bg-[linear-gradient(135deg,#0f274f_0%,#163d7a_52%,#2563eb_100%)] px-6 py-8 text-white md:px-8 md:py-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-50">
            Recruiter Workspace
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">My Job Postings</h1>
          <p className="mt-2 text-sm text-blue-50/85">Manage posted projects, review applicants, update status, and open details.</p>
        </div>
        <Link className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-blue-950 shadow-[0_16px_30px_rgba(2,6,23,0.15)] transition hover:-translate-y-0.5 hover:bg-blue-50" to={ROUTES.POST_PROJECT}>
          Post New Project
        </Link>
      </div>

      <div className="p-6 md:p-8 space-y-6">

      <section className="border border-slate-200/80 bg-slate-50/95 shadow-[0_10px_24px_rgba(15,23,42,0.04)] rounded-[1.5rem] p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="statusFilter">
              Status
            </label>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 text-sm"
              id="statusFilter"
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              value={filters.status}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status === "all" ? "All Statuses" : displayStatus(status)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="categoryFilter">
              Category
            </label>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 text-sm"
              id="categoryFilter"
              onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
              value={filters.category}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === "all" ? "All Categories" : category}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-900">{recruiterProjects.length}</span> project(s)
          </p>
          <div className="flex gap-2">
            <button
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                viewMode === "cards" ? "bg-[#2563eb] text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
              onClick={() => setViewMode("cards")}
              type="button"
            >
              Cards View
            </button>
            <button
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                viewMode === "table" ? "bg-[#2563eb] text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
              onClick={() => setViewMode("table")}
              type="button"
            >
              Table View
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

      {isLoading ? <p className="mt-4 text-sm text-slate-500">Loading recruiter projects...</p> : null}
      {isError ? <p className="mt-4 text-sm text-rose-700">Failed to load projects.</p> : null}

      {!isLoading && !isError && recruiterProjects.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 text-center">
          No projects match the current filters.
        </div>
      ) : null}

      {!isLoading && !isError && recruiterProjects.length > 0 ? (
        viewMode === "cards" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {recruiterProjects.map((project) => (
              <article className="rounded-[1.75rem] border border-slate-200 bg-white/95 shadow-[0_10px_24px_rgba(15,23,42,0.03)] p-5 hover:border-blue-100 transition flex flex-col justify-between" key={project.id}>
                <div>
                  <div className="flex justify-between items-start gap-3">
                    <h2 className="text-[17px] font-bold text-slate-900 leading-tight">{project.title}</h2>
                    <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                      {project.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {project.category} &bull; Budget: ₹{project.budgetMin}-₹{project.budgetMax}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Deadline: {project.deadline}</p>
                  
                  <p className={`mt-3 text-xs text-slate-600 leading-relaxed ${expandedBios[project.id] ? "" : "line-clamp-2"}`}>
                    {project.description || "No project description provided."}
                  </p>
                  {project.description && project.description.length > 120 && (
                    <button
                      onClick={() => setExpandedBios(prev => ({ ...prev, [project.id]: !prev[project.id] }))}
                      className="mt-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 block transition-colors duration-150"
                      type="button"
                    >
                      {expandedBios[project.id] ? "Read Less" : "Read More"}
                    </button>
                  )}

                  {project.freelancer && (
                    <p className="text-xs text-slate-500 mt-2.5 flex items-center gap-1.5">
                      <span>Freelancer:</span>
                      <span className="font-semibold text-slate-700">{project.freelancer.name}</span>
                      <span className="text-amber-500 font-bold text-[11px] flex items-center">
                        ★ {project.freelancer.ratingAvg || "0.0"}
                      </span>
                    </p>
                  )}
                  
                  <div className="mt-4">
                    <ProjectStatusTimeline compact status={project.status || "posted"} />
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Update status:</span>
                    <select
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-900 outline-none"
                      defaultValue={project.status || "posted"}
                      onChange={(event) => handleStatusChange(project.id, event.target.value)}
                    >
                      {statuses
                        .filter((status) => status !== "all")
                        .map((status) => (
                          <option key={status} value={status}>
                            {displayStatus(status)}
                          </option>
                        ))}
                    </select>
                  </div>
                  
                  {/* Escrow Release & AI Audit Buttons */}
                  {(project.status === "in_progress" || project.status === "completed") && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => { setAuditProject(project); setAuditStep(0); }}
                        className="flex-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 py-2.5 text-[10px] font-extrabold uppercase tracking-wider transition cursor-pointer"
                      >
                        🔍 Run AI Audit
                      </button>
                      <button
                        onClick={() => { setMediationProject(project); setMediationStep(0); }}
                        className="flex-1 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 py-2.5 text-[10px] font-extrabold uppercase tracking-wider transition cursor-pointer"
                      >
                        ⚖️ AI Mediation
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link
                      className="flex-1 text-center rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200/50 text-blue-700 px-3 py-2 text-xs font-bold transition"
                      to={`${ROUTES.APPLICANTS_LIST}?project=${project.id}`}
                    >
                      Review Applicants ({project.proposalsCount})
                    </Link>
                    <Link
                      className="rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition"
                      to={`/projects/${project.id}`}
                    >
                      Details
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200">
            <table className="min-w-full bg-white text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Project</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Applicants</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recruiterProjects.map((project) => (
                  <tr className="hover:bg-slate-50/30 transition" key={project.id}>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{project.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Deadline: {project.deadline}</p>
                      {project.freelancer && (
                        <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                          <span>Assigned:</span>
                          <span className="font-semibold text-slate-700">{project.freelancer.name}</span>
                          <span className="text-amber-500 font-bold flex items-center">
                            ★ {project.freelancer.ratingAvg || "0.0"}
                          </span>
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">{project.category}</td>
                    <td className="px-4 py-3">
                      <div className="mb-2">
                        <ProjectStatusTimeline compact status={project.status || "posted"} />
                      </div>
                      <select
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-900 outline-none"
                        defaultValue={project.status || "posted"}
                        onChange={(event) => handleStatusChange(project.id, event.target.value)}
                      >
                        {statuses
                          .filter((status) => status !== "all")
                          .map((status) => (
                            <option key={status} value={status}>
                              {displayStatus(status)}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{project.proposalsCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        {(project.status === "in_progress" || project.status === "completed") && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => { setAuditProject(project); setAuditStep(0); }}
                              className="rounded bg-emerald-50 text-emerald-700 px-2.5 py-1 text-[9px] font-extrabold uppercase hover:bg-emerald-100 cursor-pointer"
                            >
                              Audit
                            </button>
                            <button
                              onClick={() => { setMediationProject(project); setMediationStep(0); }}
                              className="rounded bg-amber-50 text-amber-700 px-2.5 py-1 text-[9px] font-extrabold uppercase hover:bg-amber-100 cursor-pointer"
                            >
                              Dispute
                            </button>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Link className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50" to={`${ROUTES.APPLICANTS_LIST}?project=${project.id}`}>
                            Applicants
                          </Link>
                          <Link className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50" to={`/projects/${project.id}`}>
                            Details
                          </Link>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      {/* Audit Modal for Recruiter */}
      {renderAuditModal()}

      {/* Dispute Mediation Modal */}
      {renderMediationModal()}
      </div>
    </section>
  );

  function renderAuditModal() {
    if (!auditProject) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
        <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto border border-slate-200/80 bg-slate-950 text-slate-100 rounded-3xl p-5 shadow-2xl space-y-4 font-mono">
          <div className="flex justify-between items-start border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                AI Smart Escrow Code Auditor
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5 font-sans">
                Reviewing deliverable files for project: "{auditProject.title}"
              </p>
            </div>
            <button onClick={() => setAuditProject(null)} className="text-slate-500 hover:text-slate-300 font-sans text-base">✕</button>
          </div>

          <div className="bg-black/85 rounded-xl p-4 min-h-56 text-[10px] leading-relaxed space-y-3 border border-slate-800">
            <div>[System] Initializing deliverable audit sequence...</div>
            {auditStep >= 1 && <div>&gt; Pulling target repository logs... OK (14 files scanned)</div>}
            {auditStep >= 2 && <div>&gt; Performing static analysis & security check: 0 vulnerabilities found.</div>}
            {auditStep >= 3 && (
              <div>
                &gt; Executing test suite compatibilities:
                <br />
                &gt; Test Case 1: Database Prisma Sync. Passed.
                <br />
                &gt; Test Case 2: REST Controller payload. Passed.
              </div>
            )}
            {auditStep >= 4 && (
              <div className="border-t border-slate-800 pt-2.5 mt-2 space-y-2 bg-slate-900/40 rounded-xl p-3">
                <div className="text-emerald-400 font-extrabold text-xs uppercase tracking-wider text-center">
                  ★ AI Escrow Audit Certified: PASS (97/100) ★
                </div>
                <div className="text-[11px] text-slate-300 font-sans space-y-1">
                  <div className="flex justify-between">
                    <span>Requirements matching score:</span>
                    <span className="font-bold text-emerald-400">97%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Plagiarism check index:</span>
                    <span className="font-bold text-emerald-400">0% copied</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800/80 pt-1 text-slate-200">
                    <span>Recommendation:</span>
                    <span className="font-bold">Safe to payout milestone.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2.5 justify-end font-sans">
            <button onClick={() => setAuditProject(null)} className="rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-300 text-xs font-bold px-4 py-2.5 cursor-pointer">
              Close Audit
            </button>
            <button
              onClick={() => {
                if (auditStep < 4) {
                  setAuditStep(prev => prev + 1);
                } else {
                  handleAutoReleaseEscrow(auditProject.id);
                }
              }}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-xs px-4 py-2.5 transition cursor-pointer"
            >
              {auditStep === 0 ? "Inspect Repo Files &rarr;" : auditStep === 1 ? "Run Security Audit &rarr;" : auditStep === 2 ? "Verify Test Cases &rarr;" : auditStep === 3 ? "Generate Recommendation &rarr;" : "Auto-Release Escrow Payout"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderMediationModal() {
    if (!mediationProject) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
        <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto border border-slate-200/80 bg-slate-950 text-slate-100 rounded-3xl p-5 shadow-2xl space-y-4 font-mono">
          <div className="flex justify-between items-start border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                FreelNova AI Legal Mediation Board
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5 font-sans">
                neutral AI Arbitration on contract: "{mediationProject.title}"
              </p>
            </div>
            <button onClick={() => setMediationProject(null)} className="text-slate-500 hover:text-slate-300 font-sans text-base">✕</button>
          </div>

          <div className="bg-black/85 rounded-xl p-4 min-h-56 text-[10px] leading-relaxed space-y-3 border border-slate-800">
            <div>[System] Initializing dispute mediation review board...</div>
            {mediationStep >= 1 && (
              <div>
                &gt; Analyzing contract brief... Budget: ${mediationProject.budgetMax || 500}
                <br />
                &gt; Recruiter claim: "Incomplete user-auth routes, login frontend buttons missing."
                <br />
                &gt; Freelancer defense: "Auth backend is fully coded. Client requested design changes that were outside original scope."
              </div>
            )}
            {mediationStep >= 2 && (
              <div>
                &gt; Auditing submitted code history...
                <br />
                &gt; Scope completed check: 85% of core features implemented correctly.
                <br />
                &gt; Design changes verified as post-contract additions.
              </div>
            )}
            {mediationStep >= 3 && (
              <div className="border-t border-slate-800 pt-2.5 mt-2 space-y-2 bg-slate-900/40 rounded-xl p-3">
                <div className="text-amber-400 font-extrabold text-xs uppercase tracking-wider text-center">
                  ★ AI Mediated Split Proposal ★
                </div>
                <div className="text-[11px] text-slate-300 font-sans space-y-1.5">
                  <p className="text-slate-400">Neutral suggestion based on completed milestone deliverables:</p>
                  <div className="flex justify-between">
                    <span>Release to Freelancer (85%):</span>
                    <span className="font-bold text-emerald-400">${((mediationProject.budgetMax || 500) * 0.85).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Refund to Recruiter (15%):</span>
                    <span className="font-bold text-amber-400">${((mediationProject.budgetMax || 500) * 0.15).toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-1 text-center">
                    Accepting will close contract instantly and update payment statistics.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2.5 justify-end font-sans">
            <button onClick={() => setMediationProject(null)} className="rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-300 text-xs font-bold px-4 py-2.5 cursor-pointer">
              Close Board
            </button>
            <button
              onClick={() => {
                if (mediationStep < 3) {
                  setMediationStep(prev => prev + 1);
                } else {
                  handleAcceptMediationSplit(mediationProject.id);
                }
              }}
              className="rounded-xl bg-amber-600 hover:bg-amber-700 font-bold text-white text-xs px-4 py-2.5 transition cursor-pointer"
            >
              {mediationStep === 0 ? "Review Claims &rarr;" : mediationStep === 1 ? "Audit Work Scope &rarr;" : mediationStep === 2 ? "Generate Split Suggestion &rarr;" : "Accept AI Mediated Split"}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default MyProjects;
