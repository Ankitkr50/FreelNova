import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ROUTES } from "../constants/routes.js";
import { useAuth } from "../hooks/useAuth.js";
import { useProjectApplicantsQuery, useReviewApplicantMutation, useProjectByIdQuery, useProjectsQuery } from "../hooks/useProjects.js";
import { useRazorpay } from "../hooks/useRazorpay.js";

function SelectFreelancer() {
  const { user } = useAuth();
  const role = user?.role || "freelancer";
  const [searchParams] = useSearchParams();

  const { data: projects = [] } = useProjectsQuery();
  const recruiterProjectsList = useMemo(() => {
    return projects.filter((p) => {
      const recId = p.recruiter?.id || (typeof p.recruiterId === "object" ? p.recruiterId?.id : p.recruiterId);
      return recId === user?.id;
    });
  }, [projects, user]);

  const defaultProjectId = recruiterProjectsList.length > 0 ? recruiterProjectsList[0].id : "p1";
  const projectId = searchParams.get("project") || defaultProjectId;
  const defaultApplicant = searchParams.get("applicant") || "";

  const { data: project = {} } = useProjectByIdQuery(projectId);
  const { data: applicants = [], isLoading, isError } = useProjectApplicantsQuery(projectId);
  const reviewMutation = useReviewApplicantMutation(projectId);
  const [selected, setSelected] = useState(defaultApplicant);
  const [status, setStatus] = useState({ type: "", text: "" });

  // Escrow funding state
  const { openCheckout, loading: checkoutLoading } = useRazorpay();
  const [isFunding, setIsFunding] = useState(false);
  const [expandedProposals, setExpandedProposals] = useState({});

  const candidates = useMemo(() => applicants.filter((item) => item.status !== "rejected"), [applicants]);
  const selectedApplicant = candidates.find((item) => item.id === selected);
  const selectedCurrent = applicants.find((item) => item.status === "selected");

  if (role !== "recruiter" && role !== "admin") {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Select Freelancer</h1>
        <p className="mt-2 text-slate-600">This page is available for client/admin accounts only.</p>
      </section>
    );
  }

  const executeReviewMutation = (applicantId, action) => {
    setStatus({ type: "loading", text: "Updating applicant status..." });
    reviewMutation.mutate(
      { applicantId, action },
      {
        onSuccess: (response) => {
          setStatus({ type: "success", text: response?.data?.message || "Applicant status updated." });
        },
        onError: (error) => {
          setStatus({ type: "error", text: error?.response?.data?.message || "Unable to update applicant." });
        },
      },
    );
  };

  const applyAction = (action) => {
    if (!selected) {
      setStatus({ type: "error", text: "Please choose an applicant first." });
      return;
    }

    if (action === "selected") {
      // Recruiter is assigning the project -> Enforce Escrow Deposit modal first!
      setIsFunding(true);
      return;
    }

    const actionText = action === "shortlisted" ? "shortlist" : action;
    if (!window.confirm(`Do you want to ${actionText} this applicant?`)) return;
    executeReviewMutation(selected, action);
  };

  const handleFundEscrowCheckout = () => {
    if (!selectedApplicant) return;

    setStatus({ type: "", text: "" });
    const bidAmount = selectedApplicant.bidAmount || 100;
    const currencySymbol = "₹";

    const hasYearlySub = localStorage.getItem("sb_active_subscription") === "pro_yearly";
    const isFreelancerPro = selectedApplicant.rating >= 4.7 || selectedApplicant.isPro;
    const taxRate = (hasYearlySub || isFreelancerPro) ? 0.10 : 0.15;
    const taxAmountVal = bidAmount * taxRate;
    const netAmountVal = bidAmount * (1 - taxRate);

    // Open Razorpay sandbox direct checkout overlay
    openCheckout({
      amount: bidAmount * 100, // in paise
      currency: currencySymbol === "USD" ? "USD" : "INR",
      keyId: "rzp_test_SccNR3IGzdIMlu",
      name: "FreelNova Escrow Funding",
      description: `Contract Escrow Deposit - ${selectedApplicant.name}`,
      prefillName: user?.name || "",
      prefillEmail: user?.email || "",
      onSuccess: (response) => {
        // Record payment in local payments logs so dashboards read this paid value instantly
        // Record payment in local payments logs so dashboards read this paid value instantly
        try {
          const localPayments = JSON.parse(localStorage.getItem("sb_local_payments") || "[]");
          const newPayment = {
            id: `local_pay_${Date.now()}`,
            projectId,
            applicantId: selected,
            amount: bidAmount,
            tax: taxAmountVal, 
            net: netAmountVal, 
            status: "paid",
            createdAt: new Date().toISOString()
          };
          localPayments.push(newPayment);
          localStorage.setItem("sb_local_payments", JSON.stringify(localPayments));
        } catch (e) {
          console.error(e);
        }

        // Auto-create chat request and inbox thread
        try {
          const chatReqs = JSON.parse(localStorage.getItem("sb_chat_requests") || "[]");
          const projectTitle = project?.title || "Assigned Gig";
          const existingIdx = chatReqs.findIndex(
            (r) =>
              r.projectTitle === projectTitle &&
              ((r.senderId === user.id && r.receiverId === selectedApplicant.applicantId) ||
               (r.senderId === selectedApplicant.applicantId && r.receiverId === user.id))
          );

          let activeChatId = `req_${Date.now()}`;
          if (existingIdx > -1) {
            chatReqs[existingIdx].status = "accepted";
            activeChatId = chatReqs[existingIdx].id;
          } else {
            const newReq = {
              id: activeChatId,
              senderId: user?.id,
              senderName: user?.name || "Hiring Manager",
              senderUsername: user?.username,
              senderRole: "Recruiter",
              receiverId: selectedApplicant.applicantId,
              receiverName: selectedApplicant.name,
              receiverUsername: selectedApplicant.username,
              projectId,
              projectTitle,
              status: "accepted",
              createdAt: new Date().toISOString()
            };
            chatReqs.push(newReq);
          }
          localStorage.setItem("sb_chat_requests", JSON.stringify(chatReqs));

          // Seed greeting messages
          const chatMsgKey = `sb_chat_msgs_${activeChatId}`;
          if (!localStorage.getItem(chatMsgKey)) {
            const seedMsgs = [
              { sender: "system", text: `Contract created! ${selectedApplicant.name} has been selected for "${projectTitle}".` },
              { sender: "other", text: `Hello! Thank you for selecting me for "${projectTitle}". I am ready to start working. Let's discuss details!` }
            ];
            localStorage.setItem(chatMsgKey, JSON.stringify(seedMsgs));
          }
        } catch (err) {
          console.error("Failed to automatically initialize local chat request:", err);
        }

        setIsFunding(false);
        executeReviewMutation(selected, "selected");
        alert(`🎉 Escrow funds of ${currencySymbol} ${bidAmount} deposited successfully! ${(taxRate * 100).toFixed(0)}% platform tax deducted. Freelancer is assigned.`);
      },
      onError: (err) => {
        setStatus({ type: "error", text: err?.description || "Payment failed. Escrow must be funded to assign freelancer." });
        setIsFunding(false);
      },
      onDismiss: () => {
        setIsFunding(false);
      }
    });
  };

  const projectCode = project?.projectCode || projectId;

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-[linear-gradient(135deg,#0f274f_0%,#163d7a_52%,#2563eb_100%)] px-6 py-8 text-white md:px-8 md:py-10">
        <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-50">
          Client Workspace
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">Select Freelancer</h1>
        <p className="mt-2 text-sm text-blue-50/85">Project ID: {projectCode}. Confirm the best candidate for this project.</p>
      </div>

      <div className="p-6 md:p-8">

      {selectedCurrent ? (
        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Currently selected: <span className="font-semibold">{selectedCurrent.name}</span>
        </div>
      ) : null}

      {isLoading ? <p className="mt-4 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">Loading applicants...</p> : null}
      {isError ? <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">Unable to load applicants.</p> : null}

      {!isLoading && !isError && candidates.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          No active applicants available for selection.
        </div>
      ) : null}

      {!isLoading && !isError && candidates.length > 0 ? (
        <div className="mt-6 space-y-3">
          {candidates.map((applicant) => (
            <div
              className={`w-full rounded-[1.5rem] border p-4 text-left transition cursor-pointer ${
                selected === applicant.id ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"
              }`}
              key={applicant.id}
              onClick={() => setSelected(applicant.id)}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link to={`/profile/${applicant.applicantId}`} className="hover:text-blue-600 transition-colors" onClick={(e) => e.stopPropagation()}>
                      <h2 className="text-lg font-semibold text-slate-900">{applicant.name}</h2>
                    </Link>
                    {applicant.username && (
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-150 px-1.5 py-0.5 rounded-full lowercase">
                        @{applicant.username}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">
                    Bid: ₹{applicant.bidAmount} | Delivery: {applicant.deliveryDays} days | Rating: {applicant.rating || "0.0"}
                  </p>

                  {/* Freelancer Profile Details */}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium bg-white/60 border border-slate-100 rounded-lg p-1.5 w-fit">
                    <span>💼 {applicant.experienceYears > 0 ? `${applicant.experienceYears} Yrs Exp` : "Fresher"}</span>
                    <span className="text-slate-300">&bull;</span>
                    <span>🏢 {applicant.companyName || "Independent"}</span>
                    <span className="text-slate-300">&bull;</span>
                    <span>🎓 {applicant.schoolOrCollege || "Self-taught"}</span>
                  </div>

                  <p className={`mt-2 text-sm text-slate-600 leading-relaxed ${expandedProposals[applicant.id] ? "" : "line-clamp-2"}`}>
                    {applicant.proposal}
                  </p>
                  {applicant.proposal && applicant.proposal.length > 120 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedProposals(prev => ({ ...prev, [applicant.id]: !prev[applicant.id] }));
                      }}
                      className="mt-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 block transition-colors duration-150 cursor-pointer"
                      type="button"
                    >
                      {expandedProposals[applicant.id] ? "Read Less" : "Read More"}
                    </button>
                  )}
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold capitalize text-slate-700">
                  {applicant.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          disabled={reviewMutation.isPending || !selectedApplicant}
          onClick={() => applyAction("shortlisted")}
          type="button"
        >
          Shortlist
        </button>
        <button
          className="rounded-xl border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          disabled={reviewMutation.isPending || !selectedApplicant}
          onClick={() => applyAction("rejected")}
          type="button"
        >
          Reject
        </button>
        <button
          className="rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 hover:brightness-[1.02] px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          disabled={reviewMutation.isPending || !selectedApplicant}
          onClick={() => applyAction("selected")}
          type="button"
        >
          {reviewMutation.isPending ? "Updating..." : "Confirm Selection"}
        </button>
        <Link className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100" to={`${ROUTES.APPLICANTS_LIST}?project=${projectId}`}>
          Back to Applicants
        </Link>
      </div>

      {status.text ? (
        <p
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            status.type === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : status.type === "success"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-slate-100 text-slate-700"
          }`}
        >
          {status.text}
        </p>
      ) : null}

      {/* 🔒 Escrow Project Funding Modal before Assignment */}
      {(() => {
        const hasYearlySub = localStorage.getItem("sb_active_subscription") === "pro_yearly";
        const isFreelancerPro = selectedApplicant ? (selectedApplicant.rating >= 4.7 || selectedApplicant.isPro) : false;
        const taxRate = (hasYearlySub || isFreelancerPro) ? 0.10 : 0.15;
        const taxAmountVal = selectedApplicant ? selectedApplicant.bidAmount * taxRate : 0;
        const netAmountVal = selectedApplicant ? selectedApplicant.bidAmount * (1 - taxRate) : 0;

        if (!isFunding || !selectedApplicant) return null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-200 bg-white shadow-2xl rounded-3xl p-5 space-y-4">
              <div>
                <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-700">
                  🔒 Secure Escrow Deposit
                </span>
                <h3 className="mt-2 text-lg font-bold text-slate-900">
                  Fund Milestone Budget
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Fund the escrow budget to assign <span className="font-semibold">{selectedApplicant.name}</span> to the project.
                </p>
              </div>

              <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4.5 space-y-3 text-xs text-slate-600">
                <div className="flex justify-between items-center">
                  <span>Milestone Bid Budget:</span>
                  <span className="font-bold text-slate-800">₹{selectedApplicant.bidAmount}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Freelancer Payout ({(1 - taxRate) * 100}%):</span>
                  <span>₹{netAmountVal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>FreelNova Platform Tax ({taxRate * 100}%):</span>
                  <span>₹{taxAmountVal.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-sm font-bold text-slate-950">
                  <span>Total Escrow Deposit:</span>
                  <span>₹{selectedApplicant.bidAmount}</span>
                </div>
              </div>

              <div className="flex gap-2.5 justify-end">
                <button
                  onClick={() => setIsFunding(false)}
                  className="rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2.5 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={checkoutLoading}
                  onClick={handleFundEscrowCheckout}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-white text-xs px-5 py-2.5 shadow-[0_16px_30px_rgba(37,99,235,0.22)] transition cursor-pointer"
                >
                  {checkoutLoading ? "Connecting..." : "Pay Escrow via Razorpay"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      </div>
    </section>
  );
}

export default SelectFreelancer;
