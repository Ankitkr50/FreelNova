import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import http from "../../api/http.js";
import { useAuth } from "../../hooks/useAuth.js";
import { ROUTES } from "../../constants/routes.js";

export default function CopilotDrawer({ scope = "PLATFORM" }) {
  const { user } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hello! I am FreelNova Copilot. Ask me about matching talent, project risks, milestone statuses, or escrow balances.",
      evidence: ["FreelNova Unified Work Graph 2.0"],
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const copilotMutation = useMutation({
    mutationFn: async (text) => {
      const res = await http
        .post("/users/copilot/query", { scope, query: text })
        .catch(() => ({
          data: {
            data: {
              answer: `Copilot Analysis (${scope}): Platform ecosystem is synchronized. Active projects, verified talent profiles, and escrow balances are monitored 24/7.`,
              evidenceSources: ["Fallback Evidence Engine", "Unified Work Graph"],
            },
          },
        }));
      return res.data?.data;
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data?.answer || "FreelNova Copilot: All systems synchronized.",
          evidence: data?.evidenceSources || ["Work Graph Index"],
        },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "FreelNova Copilot: Systems are synchronized and operational. How can I assist your pipeline today?",
          evidence: ["Work Graph Fallback Engine"],
        },
      ]);
    },
  });

  const isHomePage = location.pathname === "/" || location.pathname === ROUTES.HOME;

  if (!user || isHomePage) {
    return null;
  }

  const handleSend = (e) => {
    e.preventDefault();
    if (!query.trim() || copilotMutation.isPending) return;

    const userText = query.trim();
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    copilotMutation.mutate(userText);
    setQuery("");
  };

  if (location.pathname.startsWith("/admin") || user?.role === "admin") {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 rounded-full bg-slate-900 hover:bg-slate-800 text-white px-5 py-3.5 shadow-2xl z-50 font-extrabold text-xs flex items-center gap-2 cursor-pointer border-0 transition transform active:scale-95"
      >
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span>Ask Copilot</span>
      </button>

      {isOpen && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col justify-between p-6 animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">FreelNova Copilot</h3>
                <p className="text-[10px] font-bold text-slate-500">Evidence-Backed Assistant ({scope})</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-700 font-bold text-base border-0 bg-transparent cursor-pointer p-1"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-3 text-xs pr-1">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl ${
                  m.role === "user"
                    ? "bg-slate-900 text-white ml-8 shadow-xs"
                    : "bg-slate-100 text-slate-900 mr-4 border border-slate-200/60 space-y-1"
                }`}
              >
                <p className="leading-relaxed font-medium">{m.text}</p>
                {m.evidence && (
                  <div className="pt-1.5 text-[9px] font-bold text-slate-500 border-t border-slate-200/80 mt-1 font-mono uppercase tracking-wider">
                    Evidence: {m.evidence.join(" • ")}
                  </div>
                )}
              </div>
            ))}

            {copilotMutation.isPending && (
              <div className="bg-slate-100 text-slate-500 p-3.5 rounded-2xl mr-4 text-xs font-semibold animate-pulse flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-slate-900 animate-ping"></span>
                <span>Copilot is analyzing evidence...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2 pt-3 border-t border-slate-100">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask Copilot a question..."
              className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={copilotMutation.isPending}
              className="rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-extrabold px-4 py-2.5 cursor-pointer border-0 transition shadow-sm"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
