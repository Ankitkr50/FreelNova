import { useState } from "react";

export default function SmartRehiringWidget({ suggestions, onInvite }) {
  const items = suggestions || [
    {
      freelancerId: "f1",
      freelancerName: "Ankit Kumar",
      username: "ankitkumar",
      rating: 4.9,
      previousProjectsCount: 3,
      matchReason: "You previously worked with Ankit on e-commerce portal and rated him 4.9★. He matches 93% of project requirements.",
    },
  ];

  const [invitedMap, setInvitedMap] = useState({});

  const handleInvite = (id) => {
    setInvitedMap((prev) => ({ ...prev, [id]: true }));
    if (onInvite) onInvite(id);
  };

  return (
    <div className="rounded-[2rem] border border-blue-200 bg-blue-50/70 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-blue-950">Smart Rehiring Recommendations</h4>
          <p className="text-[11px] text-blue-800 font-medium">
            Verified freelancers from your previous successful contracts matching this project requirement.
          </p>
        </div>
        <span className="text-[10px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-3 py-1 rounded-full">
          Preferred Talent Pool
        </span>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.freelancerId}
            className="p-4 rounded-2xl bg-white border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">{item.freelancerName}</span>
                <span className="text-[10px] font-bold text-amber-600">★ {item.rating}</span>
                <span className="text-[10px] text-slate-400 font-semibold">({item.previousProjectsCount} Previous Contracts)</span>
              </div>
              <p className="text-slate-600 mt-1 text-[11px] leading-relaxed">{item.matchReason}</p>
            </div>

            <button
              onClick={() => handleInvite(item.freelancerId)}
              disabled={invitedMap[item.freelancerId]}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 text-xs transition cursor-pointer border-0 shrink-0 disabled:bg-emerald-600"
            >
              {invitedMap[item.freelancerId] ? "✓ Invitation Sent" : "Invite Again →"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
