import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ApplyProjectModal from "../components/projects/ApplyProjectModal.jsx";
import ProjectStatusTimeline from "../components/projects/ProjectStatusTimeline.jsx";
import ContractHealthWidget from "../components/projects/ContractHealthWidget.jsx";
import ProjectRiskRadar from "../components/projects/ProjectRiskRadar.jsx";
import JobIntentCard from "../components/projects/JobIntentCard.jsx";
import ClientTrustBadge from "../components/projects/ClientTrustBadge.jsx";
import { useQuery } from "@tanstack/react-query";
import http from "../api/http.js";
import { ROUTES } from "../constants/routes.js";
import { useAuth } from "../hooks/useAuth.js";
import { useApplyToProjectMutation, useProjectByIdQuery } from "../hooks/useProjects.js";

function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { data: project, isLoading, isError } = useProjectByIdQuery(id);
  
  const { data: intentData, isLoading: isIntentLoading } = useQuery({
    queryKey: ["project_intent", id],
    queryFn: async () => {
      const res = await http.get(`/projects/${id}/intent`);
      return res.data?.data;
    },
    enabled: Boolean(id),
  });

  const { data: trustData, isLoading: isTrustLoading } = useQuery({
    queryKey: ["client_trust", id],
    queryFn: async () => {
      const res = await http.get(`/projects/${id}/client-trust`);
      return res.data?.data;
    },
    enabled: Boolean(id),
  });
  const applyMutation = useApplyToProjectMutation(id);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });
  
  // Bid calculator state
  const [bidValue, setBidValue] = useState("");
  const [deliveryDays, setDeliveryDays] = useState(14);
  const [proposalText, setProposalText] = useState("");

  const handleOpenApply = () => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN, { state: { from: `/projects/${id}` } });
      return;
    }
    setStatus({ type: "", text: "" });
    // Pre-populate bidValue with budget min
    setBidValue(String(project?.budgetMin || ""));
    setIsModalOpen(true);
  };

  const handleApply = (payload) => {
    applyMutation.mutate(
      {
        ...payload,
        freelancerName: user?.name || "Freelancer",
        freelancerEmail: user?.email || "freelancer@example.com",
      },
      {
        onSuccess: (response) => {
          setIsModalOpen(false);
          setStatus({ type: "success", text: response?.data?.message || "Application submitted successfully." });
        },
        onError: (error) => {
          setStatus({ type: "error", text: error?.response?.data?.message || "Failed to submit application." });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-slate-500">Loading project details...</p>
      </section>
    );
  }

  if (isError || !project) {
    return (
      <section className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-rose-800">Project Not Found</h1>
        <p className="mt-2 text-sm text-rose-700">Unable to load project details. Try going back to the project list.</p>
        <Link className="mt-4 inline-block rounded-md border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100" to={ROUTES.PROJECTS}>
          Back to Projects
        </Link>
      </section>
    );
  }

  const isPro = user?.isPro || false;
  const serviceFeePercent = isPro ? 10 : 15;

  const recruiter = project.recruiter || {};
  const paymentVerified = recruiter.isVerified || (recruiter.totalSpent || 0) > 0 || (recruiter.rating || 0) >= 3;
  const connectsRequired = project.budgetMax > 800 ? 8 : project.budgetMax > 300 ? 4 : 2;

  const bidNum = Number(bidValue) || 0;
  const serviceFee = Math.round(bidNum * (serviceFeePercent / 100));
  const finalPayout = Math.max(0, bidNum - serviceFee);
  const currencySymbol = "₹";

  return (
    <section className="space-y-4">
      <Link className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 gap-1" to={ROUTES.PROJECTS}>
        &larr; Back to Projects
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left Column: Job Description & Details */}
        <div className="space-y-6">
          {/* Core Info Box */}
          <div className="border border-slate-200/80 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.06)] rounded-[2rem] p-6 md:p-8">
            <span className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
              {project.category}
            </span>
            <h1 className="mt-4 text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">{project.title}</h1>
            
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500 border-b border-slate-100 pb-4">
              <span>Posted {new Date(project.postedAt).toLocaleDateString()}</span>
              <span>&bull;</span>
              <span>{project.location || "Remote"}</span>
            </div>

            <div className="mt-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Job Description</h2>
              <p className="text-sm leading-6 text-slate-600 whitespace-pre-line">{project.description}</p>
            </div>

            <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3 text-xs">
              <div>
                <span className="text-slate-500 font-medium block">Proposed Budget</span>
                <span className="mt-1 block font-extrabold text-slate-900 text-sm">
                  {currencySymbol}{project.budgetMin.toLocaleString()} - {currencySymbol}{project.budgetMax.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Project Timeline</span>
                <span className="mt-1 block font-extrabold text-slate-900 text-sm">{project.timeline}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Deadline</span>
                <span className="mt-1 block font-extrabold text-slate-900 text-sm">{project.deadline}</span>
              </div>
            </div>
          </div>

          <ClientTrustBadge trustData={trustData} isLoading={isTrustLoading} />
          <JobIntentCard intentData={intentData} isLoading={isIntentLoading} />
          <ContractHealthWidget status="Healthy" milestoneProgress={75} />
          <ProjectRiskRadar timelineDays={project.timelineDays} budgetMax={project.budgetMax} />

          {/* Requirements & Skills */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="border border-slate-200/80 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.06)] rounded-[2rem] p-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Technical Requirements</h3>
              <ul className="mt-4 list-disc pl-5 space-y-2 text-xs leading-5 text-slate-600">
                {project.requirements && project.requirements.length > 0 ? (
                  project.requirements.map((item, idx) => <li key={idx}>{item}</li>)
                ) : (
                  <>
                    <li>Demonstrated experience in {project.category} tasks.</li>
                    <li>Strong problem-solving and clean coding standards.</li>
                    <li>Ability to check project updates and deliver milestone work.</li>
                  </>
                )}
              </ul>
            </div>

            <div className="border border-slate-200/80 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.06)] rounded-[2rem] p-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Skills & Expertise</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.skills.map((skill) => (
                  <span className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600" key={skill}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Activity on Job */}
          <div className="border border-slate-200/80 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.06)] rounded-[2rem] p-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Activity on this Job</h3>
            <div className="mt-4 grid gap-4 grid-cols-2 sm:grid-cols-4 text-xs text-slate-600">
              <div className="border-r border-slate-100 pr-2">
                <span className="text-slate-500 block">Proposals</span>
                <span className="mt-1.5 block font-bold text-slate-900 text-sm">
                  {project.proposalsCount < 5 ? "Less than 5" : project.proposalsCount < 15 ? "5 to 15" : "15 to 50"}
                </span>
              </div>
              <div className="border-r border-slate-100 pr-2">
                <span className="text-slate-500 block">Last viewed by client</span>
                <span className="mt-1.5 block font-bold text-slate-900 text-sm">2 hours ago</span>
              </div>
              <div className="border-r border-slate-100 pr-2">
                <span className="text-slate-500 block">Interviewing</span>
                <span className="mt-1.5 block font-bold text-slate-900 text-sm">1 candidate</span>
              </div>
              <div>
                <span className="text-slate-500 block">Invites sent</span>
                <span className="mt-1.5 block font-bold text-slate-900 text-sm">3 invitations</span>
              </div>
            </div>
          </div>

          {/* Project Status */}
          <div className="border border-slate-200/80 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.06)] rounded-[2rem] p-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Job Progress Status</h3>
            <div className="mt-4">
              <ProjectStatusTimeline status={project.status || "posted"} />
            </div>
          </div>
        </div>

        {/* Right Column: Client details and bid calculator */}
        <div className="space-y-6">
          {/* Apply Card with Connects Info */}
          <div className="border border-slate-200/80 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.06)] rounded-[2rem] p-6">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Bid Connects Details</h3>
            <div className="mt-3 space-y-3.5 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Connects required for this job:</span>
                <span className="font-bold text-slate-900">{connectsRequired} Connects</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Your available connects balance:</span>
                <span className="font-bold text-slate-900">80 Connects</span>
              </div>
            </div>

            <button
              onClick={handleOpenApply}
              className="w-full mt-5 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 py-3 text-sm font-bold text-white shadow-[0_16px_30px_rgba(37,99,235,0.22)] hover:brightness-[1.02] transition"
            >
              Apply For This Project
            </button>

            {status.text ? (
              <p className={`mt-4 rounded-xl border px-3 py-2 text-xs font-semibold ${
                status.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-blue-200 bg-blue-50 text-blue-700"
              }`}>
                {status.text}
              </p>
            ) : null}
          </div>

          {/* Bid Calculator Tool */}
          <div className="border border-slate-200/80 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.06)] rounded-[2rem] p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Bid Payout Estimator</h3>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Your Bid Amount ({currencySymbol})</label>
                <input
                  type="number"
                  value={bidValue}
                  onChange={(e) => setBidValue(e.target.value)}
                  placeholder="Enter bid..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:bg-white text-slate-900 font-bold"
                />
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3 text-slate-500">
                <div className="flex justify-between">
                  <span>FreelNova Service Fee ({serviceFeePercent}%):</span>
                  <span className="font-semibold text-rose-600">-{currencySymbol}{serviceFee}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold border-t border-slate-100/50 pt-2 text-[13px]">
                  <span>You will receive:</span>
                  <span className="text-blue-600">{currencySymbol}{finalPayout}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recruiter Details Card */}
          <div className="border border-slate-200/80 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.06)] rounded-[2rem] p-6 space-y-4.5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">About Client</h3>
            
            <div className="space-y-3.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                {paymentVerified ? (
                  <span className="inline-flex items-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 font-bold uppercase text-[10px]">
                    Payment Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-lg bg-slate-50 text-slate-400 border border-slate-200 px-2 py-0.5 font-bold uppercase text-[10px]">
                    Payment Unverified
                  </span>
                )}
                <span className="font-bold text-amber-500">★ {recruiter.rating || "0.0"}</span>
              </div>

              <div>
                <dt className="text-slate-400">Client Name</dt>
                <dd className="font-semibold text-slate-800 mt-0.5">{recruiter.name || "Hiring Manager"}</dd>
              </div>
              
              <div>
                <dt className="text-slate-400">Company & Workspace</dt>
                <dd className="font-semibold text-slate-800 mt-0.5">{recruiter.company || "General Client"}</dd>
              </div>

              <div>
                <dt className="text-slate-400">Client Spent Amount</dt>
                <dd className="font-semibold text-slate-800 mt-0.5">
                  {currencySymbol}{(recruiter.totalSpent || 0).toLocaleString()} spent on platform
                </dd>
              </div>

              <div>
                <dt className="text-slate-400">Member Since</dt>
                <dd className="font-semibold text-slate-800 mt-0.5">
                  {recruiter.createdAt 
                    ? new Date(recruiter.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
                    : "March 2024"}
                </dd>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen ? (
        <ApplyProjectModal
          projectTitle={project.title}
          projectCategory={project.category}
          budgetMax={project.budgetMax}
          budgetMin={project.budgetMin}
          bidStats={project.bidStats}
          isPending={applyMutation.isPending}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleApply}
        />
      ) : null}
    </section>
  );
}

export default ProjectDetails;
