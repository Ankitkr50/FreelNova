import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import http from "../api/http.js";

export default function ProjectVault() {
  const { id: urlProjectId } = useParams();
  const [activeTab, setActiveTab] = useState("requirements");
  const [newDecisionTitle, setNewDecisionTitle] = useState("");
  const [newDecisionNote, setNewDecisionNote] = useState("");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswerResult, setAiAnswerResult] = useState(null);
  const [feedback, setFeedback] = useState({ text: "", type: "" });

  // 1. Fetch user's latest projects if no projectId is passed in URL
  const { data: userProjectsList, isLoading: isProjectsLoading } = useQuery({
    queryKey: ["user_projects_list_for_vault"],
    queryFn: async () => {
      const res = await http.get("/projects");
      const list = res.data?.data?.projects || res.data?.data || [];
      return Array.isArray(list) ? list : [];
    },
    enabled: !urlProjectId,
    staleTime: 30000,
  });

  const targetProjectId = urlProjectId || (userProjectsList && userProjectsList.length > 0 ? userProjectsList[0].id : null);

  // 2. Fetch Real Vault Data for targetProjectId
  const { data: vaultData, isLoading: isVaultLoading, refetch } = useQuery({
    queryKey: ["project_vault", targetProjectId],
    queryFn: async () => {
      const res = await http.get(`/projects/${targetProjectId}/vault`);
      return res.data?.data?.vault;
    },
    enabled: Boolean(targetProjectId),
  });

  // Add Decision Mutation
  const addDecisionMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await http.post(`/projects/${targetProjectId}/vault/decisions`, payload);
      return res.data;
    },
    onSuccess: () => {
      setFeedback({ text: "Decision recorded in Project Vault!", type: "success" });
      setNewDecisionTitle("");
      setNewDecisionNote("");
      refetch();
    },
  });

  // Query AI Memory Mutation
  const queryAIMemoryMutation = useMutation({
    mutationFn: async (question) => {
      const res = await http.post(`/projects/${targetProjectId}/vault/ai-memory`, { question });
      return res.data?.data;
    },
    onSuccess: (data) => {
      setAiAnswerResult(data);
    },
  });

  const handleAddDecision = (e) => {
    e.preventDefault();
    if (!newDecisionTitle.trim() || !newDecisionNote.trim()) return;
    addDecisionMutation.mutate({ title: newDecisionTitle, note: newDecisionNote });
  };

  const handleAskAI = (e) => {
    e.preventDefault();
    if (!aiQuestion.trim()) return;
    queryAIMemoryMutation.mutate(aiQuestion.trim());
  };

  const isLoading = isProjectsLoading || (Boolean(targetProjectId) && isVaultLoading);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4">
        <div className="h-64 rounded-3xl bg-slate-100 animate-pulse flex items-center justify-center text-slate-400 font-bold">
          Loading Real-Time Project Vault Data...
        </div>
      </div>
    );
  }

  const fallbackVault = {
    title: "Project Vault Workspace",
    projectCode: "PROJ-VAULT",
    sections: {
      requirements: {
        description: "No active project brief loaded yet.",
        category: "General",
        skills: [],
        budgetMin: 0,
        budgetMax: 0,
      },
      contract: {
        terms: "Standard FreelNova Milestone & Fixed-Price Escrow Agreement.",
        client: { name: "Client Partner", email: "-" },
        freelancer: { name: "Assigned Specialist", email: "-" }
      },
      milestones: [],
      chat: {
        threadStatus: "ACTIVE",
        sentiment: "NEUTRAL",
        messagesCount: 0
      },
      files: [],
      deliverables: [],
      codeRepoLinks: [],
      payments: [],
      escrow: {
        status: "PENDING_FUNDING",
        balance: 0,
        totalHeld: 0,
        totalReleased: 0
      },
      decisions: [],
      auditHistory: [
        { event: "Project Vault Workspace Initialized", timestamp: new Date().toISOString() }
      ]
    },
  };

  const currentVault = vaultData || fallbackVault;
  const sections = currentVault.sections || fallbackVault.sections;

  const tabs = [
    { key: "requirements", label: "Requirements" },
    { key: "contract", label: "Contract" },
    { key: "milestones", label: "Milestones" },
    { key: "chat", label: "Chat Logs" },
    { key: "files", label: "Files" },
    { key: "deliverables", label: "Deliverables" },
    { key: "codeRepoLinks", label: "Code Repo" },
    { key: "payments", label: "Payments" },
    { key: "escrow", label: "Escrow Vault" },
    { key: "aiAssistant", label: "AI Memory" },
    { key: "decisions", label: "Decisions" },
    { key: "auditHistory", label: "Audit Trail" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 animate-fadeIn pt-4 px-4">
      {/* Feedback Toast */}
      {feedback.text && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-900 flex justify-between items-center">
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback({ text: "", type: "" })} className="text-emerald-700 hover:text-emerald-950 font-black cursor-pointer">✕</button>
        </div>
      )}

      {/* Header Banner */}
      <div className="overflow-hidden rounded-[2rem] border border-slate-800/80 bg-slate-900 p-6 md:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-500/20 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-blue-400 border border-blue-500/30">
                VAULT-001
              </span>
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 border border-emerald-500/30">
                PERMANENT VAULT
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight mt-3">
              {currentVault.title || "Enterprise Work Vault Overview"}
            </h1>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed max-w-2xl">
              Encrypted, tamper-proof repository for all project requirements, payments, chat logs, deliverables, and audit records.
            </p>
          </div>

          <Link
            to={targetProjectId ? `/projects/${targetProjectId}` : "/projects"}
            className="inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 text-xs font-bold transition border border-white/20 shrink-0"
          >
            ← Back to Project
          </Link>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto pb-3 [scrollbar-width:none]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border-0 ${
              activeTab === tab.key
                ? "bg-slate-900 text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Vault Content Display */}
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 md:p-8 shadow-xs min-h-[360px]">
        {/* 1. REQUIREMENTS TAB */}
        {activeTab === "requirements" && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Project Requirements Brief</h3>
            <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-200/80 font-mono text-xs text-slate-800 leading-relaxed">
              <pre className="whitespace-pre-wrap font-mono">
                {typeof sections?.requirements === "string"
                  ? sections.requirements
                  : sections?.requirements?.description || JSON.stringify(sections?.requirements || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* 2. CONTRACT TAB */}
        {activeTab === "contract" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-900">Contract &amp; Participant Terms</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hiring Client</p>
                <p className="text-sm font-bold text-slate-900">{sections?.contract?.client?.name || "Client Partner"}</p>
                <p className="text-xs text-slate-500 font-mono">{sections?.contract?.client?.email || "client@email.com"}</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Freelancer</p>
                <p className="text-sm font-bold text-slate-900">
                  {sections?.contract?.freelancer?.name || "Not Selected Yet"}
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  {sections?.contract?.freelancer?.email || "-"}
                </p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 text-xs text-blue-950 font-medium leading-relaxed">
              <strong>Contract Terms:</strong> {sections?.contract?.terms || "Standard FreelNova Escrow & Milestone Agreement."}
            </div>
          </div>
        )}

        {/* 3. MILESTONES TAB */}
        {activeTab === "milestones" && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Milestones Breakdown</h3>
            <div className="space-y-3">
              {(sections?.milestones || fallbackVault.sections.milestones).map((m, idx) => (
                <div key={m.id || idx} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{m.title || `Milestone ${idx + 1}`}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {m.percentage ? `${m.percentage}% Allocation — ` : ""}₹{(m.amount || 0).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                    m.released ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    {m.released ? "Escrow Released" : "Pending Release"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. CHAT LOGS TAB */}
        {activeTab === "chat" && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Workspace Chat Transcripts</h3>
            <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <span className="text-slate-600">
                  Channel Status: <strong className="text-slate-900">{sections?.chat?.threadStatus || "ACTIVE"}</strong>
                </span>
                <span className="text-slate-600">
                  Sentiment Score: <strong className="text-emerald-600">{sections?.chat?.sentiment || "HIGHLY_POSITIVE"}</strong>
                </span>
                {sections?.chat?.messagesCount && (
                  <span className="text-slate-600">
                    Total Messages: <strong className="text-slate-900">{sections.chat.messagesCount}</strong>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-200/60 pt-3">
                🔒 All communication logs are encrypted and monitored by FreelNova AI Safety Layer to prevent fraud and off-platform contact sharing.
              </p>
            </div>
          </div>
        )}

        {/* 5. FILES TAB */}
        {activeTab === "files" && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Vault Files &amp; Attachments</h3>
            {(!sections?.files || sections.files.length === 0) ? (
              <p className="text-xs text-slate-400 italic">No files attached to this project vault yet.</p>
            ) : (
              <div className="space-y-2">
                {sections.files.map((f, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">📄 {f.name || `Attachment_${idx + 1}`} {f.size ? `(${f.size})` : ""}</span>
                    <span className="text-[10px] font-semibold text-slate-400">Preserved in Vault</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 6. DELIVERABLES TAB */}
        {activeTab === "deliverables" && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Project Deliverables</h3>
            {(!sections?.deliverables || sections.deliverables.length === 0) ? (
              <p className="text-xs text-slate-400 italic">No formal deliverables uploaded yet.</p>
            ) : (
              sections.deliverables.map((d, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">📦 {d.name || `Deliverable Package #${idx + 1}`}</span>
                  <a href={d.url || "#"} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline">
                    View Package →
                  </a>
                </div>
              ))
            )}
          </div>
        )}

        {/* 7. CODE REPO TAB */}
        {activeTab === "codeRepoLinks" && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Code Repositories</h3>
            {(!sections?.codeRepoLinks || sections.codeRepoLinks.length === 0) ? (
              <p className="text-xs text-slate-400 italic">No code repositories linked yet.</p>
            ) : (
              sections.codeRepoLinks.map((r, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                  <span className="font-bold text-slate-900">💻 {r.label || "Repository Link"}</span>
                  <a href={r.url || "#"} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline truncate max-w-xs">
                    {r.url || "View Repo"}
                  </a>
                </div>
              ))
            )}
          </div>
        )}

        {/* 8. PAYMENTS TAB */}
        {activeTab === "payments" && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Payment Records</h3>
            {(!sections?.payments || sections.payments.length === 0) ? (
              <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200 text-center space-y-1.5">
                <p className="text-xs font-bold text-slate-700">No payment transactions recorded for this project yet.</p>
                <p className="text-[11px] text-slate-500">Payments will appear here automatically when milestones are funded or released.</p>
              </div>
            ) : (
              sections.payments.map((p, idx) => (
                <div key={p.id || idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-slate-900">
                  <span className="text-slate-900 font-semibold">Order ID: <strong className="text-slate-950 font-bold">{p.gatewayOrderId || p.id || `TXN-${idx + 1}`}</strong></span>
                  <span className="font-bold text-emerald-800">₹{(p.amount || 0).toLocaleString()} ({p.escrowStatus || p.status || "HELD"})</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* 9. ESCROW VAULT TAB */}
        {activeTab === "escrow" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-900">Escrow Vault Security Audit</h3>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-1">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Vault Status</p>
                <p className="text-base font-extrabold text-emerald-950">{sections?.escrow?.status || "PENDING_FUNDING"}</p>
              </div>

              <div className="p-5 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-1">
                <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Total Funds Held</p>
                <p className="text-xl font-extrabold text-blue-950">
                  ₹{(sections?.escrow?.totalHeld || sections?.escrow?.balance || 0).toLocaleString()}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-indigo-50/80 border border-indigo-200 space-y-1">
                <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Total Released</p>
                <p className="text-xl font-extrabold text-indigo-950">
                  ₹{(sections?.escrow?.totalReleased || 0).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 text-xs text-slate-700 space-y-2 leading-relaxed">
              <p className="font-bold text-slate-900">🔒 Razorpay Escrow Guarantee &amp; Hold Policy</p>
              <p>
                Project funds are locked safely in the FreelNova Escrow Vault. Neither party can unilaterally withdraw funds. Escrow payouts are automatically dispatched to the freelancer upon client milestone approval or after the 14-day delivery auto-completion period.
              </p>
            </div>
          </div>
        )}

        {/* 10. AI MEMORY ASSISTANT TAB */}
        {activeTab === "aiAssistant" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Project AI Memory Assistant</h3>
              <p className="text-xs text-slate-500 mt-1">
                Ask questions based strictly on authorized project specifications, milestones, technical stack, and decisions.
              </p>
            </div>

            <form onSubmit={handleAskAI} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder='e.g. "What is the agreed budget and milestone timeline?"'
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 placeholder:opacity-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
                  required
                />
                <button
                  type="submit"
                  disabled={queryAIMemoryMutation.isPending}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 text-xs font-bold transition cursor-pointer border-0 shrink-0"
                >
                  {queryAIMemoryMutation.isPending ? "Searching..." : "Ask AI Memory"}
                </button>
              </div>
            </form>

            {aiAnswerResult && (
              <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-2 text-xs">
                <p className="font-bold text-blue-900">Question: {aiAnswerResult.question}</p>
                <p className="text-slate-800 leading-relaxed font-mono">{aiAnswerResult.answer}</p>
              </div>
            )}
          </div>
        )}

        {/* 11. DECISIONS TAB */}
        {activeTab === "decisions" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-900">Decisions &amp; Meeting Notes Log</h3>

            <form onSubmit={handleAddDecision} className="space-y-3 p-5 rounded-2xl bg-slate-50/80 border border-slate-200">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Log New Decision / Note</p>
              <input
                type="text"
                value={newDecisionTitle}
                onChange={(e) => setNewDecisionTitle(e.target.value)}
                placeholder="Decision Title (e.g. Approved Razorpay Gateway for Checkout)"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 placeholder:opacity-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
                required
              />
              <textarea
                rows={3}
                value={newDecisionNote}
                onChange={(e) => setNewDecisionNote(e.target.value)}
                placeholder="Details & agreed resolution..."
                className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 placeholder:opacity-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none shadow-2xs"
                required
              />
              <button
                type="submit"
                disabled={addDecisionMutation.isPending}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-bold cursor-pointer border-0"
              >
                {addDecisionMutation.isPending ? "Recording..." : "Record Decision"}
              </button>
            </form>

            <div className="space-y-3">
              {(!sections?.decisions || sections.decisions.length === 0) ? (
                <p className="text-xs text-slate-400 italic">No formal decisions logged yet.</p>
              ) : (
                sections.decisions.map((d, idx) => (
                  <div key={d.id || idx} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1 text-xs">
                    <p className="font-bold text-slate-900">{d.title}</p>
                    <p className="text-slate-600 leading-relaxed">{d.note}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Logged by {d.author || "Client & Freelancer"}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 12. AUDIT TRAIL TAB (CRASH FIXED) */}
        {activeTab === "auditHistory" && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Immutable Audit Trail</h3>
            <div className="space-y-2">
              {(sections?.auditHistory || fallbackVault.sections.auditHistory).map((a, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-800 font-semibold">🛡️ {a.event}</span>
                  <span className="text-[10px] text-slate-400">
                    {a.timestamp ? new Date(a.timestamp).toLocaleString() : "Just now"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
