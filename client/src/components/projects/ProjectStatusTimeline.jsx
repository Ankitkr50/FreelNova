const timelineSteps = ["posted", "applied", "selected", "in_progress", "completed", "paid"];

function toLabel(step) {
  return step.replace("_", " ");
}

function ProjectStatusTimeline({ status = "posted", compact = false }) {
  const currentIndex = Math.max(0, timelineSteps.indexOf(status));

  return (
    <div className={compact ? "overflow-x-auto" : ""}>
      <div className={`flex min-w-max items-center gap-2 ${compact ? "text-xs" : "text-sm"}`}>
        {timelineSteps.map((step, index) => {
          const completed = index < currentIndex;
          const active = index === currentIndex;
          const pending = index > currentIndex;

          return (
            <div className="flex items-center gap-2" key={step}>
              <div className="flex flex-col items-center">
                <span
                  className={`rounded-full border px-3 py-1 font-semibold capitalize ${
                    completed
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : active
                        ? "border-sky-300 bg-linear-to-r from-sky-50 to-cyan-50 text-sky-700"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  {toLabel(step)}
                </span>
                {!compact ? (
                  <span className={`mt-1 text-[11px] font-medium ${completed || active ? "text-slate-700" : "text-slate-400"}`}>
                    {active ? "current" : completed ? "done" : "pending"}
                  </span>
                ) : null}
              </div>
              {index < timelineSteps.length - 1 ? (
                <span className={`h-[2px] w-6 rounded-full ${pending ? "bg-slate-200" : "bg-sky-300"}`} />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProjectStatusTimeline;

