import React from "react";

export default function MarketplaceRetentionLoopModal({ isOpen, onClose, role, onAction }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase">
              🎉 Milestone Completed!
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">What's Next?</h3>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 text-xs font-bold">
            ✕
          </button>
        </div>

        {role === "recruiter" ? (
          <div className="space-y-2">
            <button
              onClick={() => onAction && onAction("rehire")}
              className="w-full text-left rounded-2xl border border-slate-200 bg-slate-50 p-3.5 hover:bg-blue-50/50 hover:border-blue-300 transition cursor-pointer"
            >
              <h4 className="text-xs font-bold text-slate-900">🔁 Smart Rehire for Next Phase</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Invite this specialist directly to your next project without creating a new public posting.</p>
            </button>
            <button
              onClick={() => onAction && onAction("retainer")}
              className="w-full text-left rounded-2xl border border-slate-200 bg-slate-50 p-3.5 hover:bg-emerald-50/50 hover:border-emerald-300 transition cursor-pointer"
            >
              <h4 className="text-xs font-bold text-slate-900">📅 Convert to Monthly Retainer</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Secure ongoing monthly support with automatic escrow recurring milestones.</p>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => onAction && onAction("request_retainer")}
              className="w-full text-left rounded-2xl border border-slate-200 bg-slate-50 p-3.5 hover:bg-blue-50/50 hover:border-blue-300 transition cursor-pointer"
            >
              <h4 className="text-xs font-bold text-slate-900">💡 Propose Monthly Retainer Contract</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Send a monthly retainer proposal to maintain client's code & infrastructure.</p>
            </button>
            <button
              onClick={() => onAction && onAction("showcase")}
              className="w-full text-left rounded-2xl border border-slate-200 bg-slate-50 p-3.5 hover:bg-purple-50/50 hover:border-purple-300 transition cursor-pointer"
            >
              <h4 className="text-xs font-bold text-slate-900">🌟 Publish to Public Work Showcase</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Add verified deliverable outcome to your public profile showcase.</p>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
