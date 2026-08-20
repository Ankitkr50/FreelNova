import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import http from "../../api/http.js";

export default function AITwinModal({ freelancer, onClose }) {
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState([
    {
      sender: "twin",
      text: `Hello! I am ${freelancer.name}'s AI Professional Twin. I can explain skills, verified project history, typical contract scope, and availability based strictly on verified platform data. What would you like to know?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const queryTwinMutation = useMutation({
    mutationFn: async (userQuestion) => {
      const res = await http.post(`/users/${freelancer.id}/ai-twin/query`, { question: userQuestion });
      return res.data?.data;
    },
    onSuccess: (data) => {
      setChatHistory((prev) => [
        ...prev,
        {
          sender: "twin",
          text: data.answer,
          disclaimer: data.disclaimer,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    },
    onError: (err) => {
      setChatHistory((prev) => [
        ...prev,
        {
          sender: "twin",
          text: err.response?.data?.message || "Sorry, I could not answer that question right now.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    },
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const userText = question.trim();
    setChatHistory((prev) => [
      ...prev,
      {
        sender: "user",
        text: userText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setQuestion("");
    queryTwinMutation.mutate(userText);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-6 md:p-8 shadow-2xl space-y-4 my-auto animate-fadeIn flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black flex items-center justify-center text-xs shadow-md">
              AI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{freelancer.name}'s AI Twin</h3>
                <span className="rounded-full bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 text-[10px] font-bold uppercase">
                  Verified Data Only
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Verified FreelNova AI Profile Assistant • Never invents non-existent experience
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition border-0 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Chat History Box */}
        <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 min-h-[240px]">
          {chatHistory.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs font-medium leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-slate-900 text-white rounded-br-none"
                    : "bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-2xs"
                }`}
              >
                {msg.sender === "twin" && (
                  <span className="text-[10px] font-bold text-purple-600 block mb-1">
                    AI Professional Twin
                  </span>
                )}
                <p>{msg.text}</p>
                {msg.disclaimer && (
                  <p className="text-[9px] font-semibold text-slate-400 mt-1.5 pt-1 border-t border-slate-100">
                    {msg.disclaimer}
                  </p>
                )}
              </div>
              <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
            </div>
          ))}
          {queryTwinMutation.isPending && (
            <div className="flex items-center gap-2 text-xs font-bold text-purple-600 bg-purple-50 p-3 rounded-2xl w-fit">
              AI Twin is checking verified records...
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px] font-semibold">
          {[
            "What are your verified skills?",
            "What is your contract completion rate?",
            "What is your hourly rate & availability?",
            "What typical project types do you do?",
          ].map((chip) => (
            <button
              key={chip}
              onClick={() => {
                setQuestion(chip);
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-full whitespace-nowrap transition cursor-pointer border-0 shrink-0"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="flex gap-2 pt-2 border-t border-slate-100">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={`Ask ${freelancer.name}'s AI Twin anything...`}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold outline-none focus:border-purple-500"
            required
          />
          <button
            type="submit"
            disabled={queryTwinMutation.isPending}
            className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 text-xs font-bold transition cursor-pointer border-0 shadow-md disabled:opacity-50"
          >
            Ask Twin
          </button>
        </form>
      </div>
    </div>
  );
}
