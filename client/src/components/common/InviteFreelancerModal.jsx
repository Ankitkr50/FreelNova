import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes.js";
import { useProjectsQuery } from "../../hooks/useProjects.js";
import { useAuth } from "../../hooks/useAuth.js";

function InviteFreelancerModal({ isOpen, onClose, freelancer }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: allProjects = [] } = useProjectsQuery();

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

  // Get client's posted projects (from API & localStorage fallback)
  const clientProjects = useMemo(() => {
    if (!user) return [];
    
    const apiProjects = allProjects.filter(
      (p) => p.postedBy === user.id || p.clientId === user.id || p.authorId === user.id
    );

    const localProjects = JSON.parse(localStorage.getItem("sb_posted_projects") || "[]").filter(
      (p) => p.clientId === user.id || p.postedBy === user.id
    );

    // Combine & deduplicate by id
    const combined = [...apiProjects, ...localProjects];
    const uniqueMap = new Map();
    combined.forEach((item) => uniqueMap.set(item.id, item));
    return Array.from(uniqueMap.values());
  }, [allProjects, user]);

  if (!isOpen || !freelancer) return null;

  const hasProjects = clientProjects.length > 0;
  const activeProject = clientProjects.find((p) => String(p.id) === String(selectedProjectId)) || clientProjects[0];

  const handleSelectProjectChange = (e) => {
    const projId = e.target.value;
    setSelectedProjectId(projId);
    const found = clientProjects.find((p) => String(p.id) === String(projId));
    if (found) {
      setOfferPrice(found.budgetMax || found.budgetMin || found.price || 3000);
    }
  };

  const handleSendInvite = (e) => {
    e.preventDefault();
    if (!activeProject) {
      setStatusMsg({ type: "error", text: "Please select a project to invite for." });
      return;
    }

    const requests = JSON.parse(localStorage.getItem("sb_chat_requests") || "[]");

    // Check if invitation already exists for this project & freelancer
    const alreadyInvited = requests.find(
      (r) => r.receiverId === freelancer.id && (r.projectId === activeProject.id || r.projectTitle === activeProject.title)
    );

    if (alreadyInvited) {
      setStatusMsg({ type: "error", text: `You have already invited ${freelancer.name} for "${activeProject.title}".` });
      return;
    }

    const priceVal = offerPrice || activeProject.budgetMax || activeProject.price || 3000;

    const newReq = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      senderId: user?.id || "client_1",
      senderName: user?.name || "Hiring Client",
      senderRole: "Recruiter",
      receiverId: freelancer.id,
      receiverName: freelancer.name,
      receiverUsername: freelancer.username || "",
      projectId: activeProject.id,
      projectTitle: activeProject.title,
      offerPrice: Number(priceVal),
      message: customMessage || `Hi ${freelancer.name}, I loved your profile on FreelNova. I would like to invite you to collaborate on our project: "${activeProject.title}".`,
      status: "pending", // Waiting for freelancer to accept
      createdAt: new Date().toISOString(),
    };

    requests.push(newReq);
    localStorage.setItem("sb_chat_requests", JSON.stringify(requests));

    setStatusMsg({
      type: "success",
      text: `🎉 Invitation sent to ${freelancer.name} for "${activeProject.title}"! Once they accept, escrow deposit & chat will unlock.`,
    });

    setTimeout(() => {
      onClose();
      navigate(`${ROUTES.MESSAGES}?chat=${newReq.id}`);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={onClose}></div>

      <div className="relative bg-white rounded-3xl border border-slate-200 max-w-lg w-full shadow-2xl p-6 md:p-8 space-y-6 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center uppercase">
              {freelancer.name?.charAt(0)}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Invite {freelancer.name}
              </h3>
              <p className="text-xs text-blue-600 font-semibold">
                @{freelancer.username || "freelancer"} &bull; {freelancer.headline || "Specialist"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-bold bg-transparent border-0 cursor-pointer outline-none"
          >
            ✕
          </button>
        </div>

        {/* Content State 1: Client has NO posted projects */}
        {!hasProjects ? (
          <div className="text-center py-4 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-3xl text-amber-600">
              📌
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-extrabold text-slate-900">Post a Project Required</h4>
              <p className="text-xs text-slate-600 leading-relaxed px-4">
                You need to post a project brief first before inviting freelancers. Posting a project helps freelancers review your requirements, milestones, and budget.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(ROUTES.POST_PROJECT);
                }}
                className="w-full text-center rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-extrabold py-3.5 text-xs shadow-lg transition cursor-pointer border-0"
              >
                Post Project Now 🚀
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full text-center rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 text-xs transition cursor-pointer border-0"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Content State 2: Client HAS posted projects -> Select Project Form */
          <form onSubmit={handleSendInvite} className="space-y-4">
            {statusMsg.text && (
              <div
                className={`p-3 rounded-xl text-xs font-bold ${
                  statusMsg.type === "success"
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                    : "bg-rose-50 border border-rose-200 text-rose-700"
                }`}
              >
                {statusMsg.text}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Select Posted Project
              </label>
              <select
                value={selectedProjectId || clientProjects[0]?.id}
                onChange={handleSelectProjectChange}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 transition font-semibold"
                required
              >
                {clientProjects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.title} (Budget: ₹{(proj.budgetMax || proj.price || 3000).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Offer / Milestone Budget (₹)
              </label>
              <input
                type="number"
                value={offerPrice || activeProject?.budgetMax || 3000}
                onChange={(e) => setOfferPrice(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Personalized Message to {freelancer.name}
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder={`Hi ${freelancer.name}, I reviewed your profile and portfolio on FreelNova. I would like to invite you to collaborate on our project...`}
                rows="3"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 transition resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs px-5 py-3 transition cursor-pointer border-0"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-extrabold text-xs px-6 py-3 shadow-lg shadow-blue-500/20 transition cursor-pointer border-0"
              >
                Send Project Invite ✉️
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default InviteFreelancerModal;
