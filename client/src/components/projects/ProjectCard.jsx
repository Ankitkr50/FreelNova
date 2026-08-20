import { useState } from "react";
import { Link } from "react-router-dom";

function formatBudget(min, max, currency) {
  const symbol = "₹";
  return `${symbol}${Number(min).toLocaleString()} - ${symbol}${Number(max).toLocaleString()}`;
}

function getProjectVisual(project) {
  const visuals = [
    "https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?cs=srgb&dl=pexels-pixabay-196644.jpg&fm=jpg",
    "https://images.pexels.com/photos/270348/pexels-photo-270348.jpeg?cs=srgb&dl=pexels-pixabay-270348.jpg&fm=jpg",
    "https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?cs=srgb&dl=pexels-christina-morillo-1181244.jpg&fm=jpg",
    "https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?cs=srgb&dl=pexels-fauxels-3183150.jpg&fm=jpg",
  ];

  const index = Number(String(project.id || "0").replace(/\D/g, "")) % visuals.length || 0;
  return visuals[index];
}

function ProjectCard({ project, isSaved, onToggleSave }) {
  const [expanded, setExpanded] = useState(false);
  const recruiter = project.recruiter || {};
  const paymentVerified = recruiter.isVerified || (recruiter.rating || 0) >= 3;
  
  // Dynamically calculate connects based on max budget
  const connectsRequired = project.budgetMax > 800 ? 8 : project.budgetMax > 300 ? 4 : 2;

  // Pretty proposals range string
  const getProposalsRange = (count) => {
    if (count < 5) return "Less than 5";
    if (count < 15) return "5 to 15";
    if (count < 50) return "15 to 50";
    return "50+";
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_10px_25px_rgba(15,23,42,0.04)] hover:border-blue-200/60 transition flex flex-col justify-between">
      <div>
        {/* Cover visual & key badges */}
        <div className="relative h-36">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url("${getProjectVisual(project)}")` }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.05),rgba(15,23,42,0.25)_40%,rgba(15,23,42,0.75))]" />
          <div className="relative flex h-full flex-col justify-between p-3.5 text-white">
            <div className="flex items-start justify-between gap-2">
              <span className="rounded-full border border-white/20 bg-white/12 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm">
                {project.category}
              </span>
              <span className="rounded-full border border-white/20 bg-white/12 px-2.5 py-0.5 text-[10px] font-semibold backdrop-blur-sm">
                {project.location || "Remote"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-white/85 font-medium truncate">{recruiter.company || "FreelNova Client"}</p>
                <h3 className="mt-0.5 text-sm font-bold leading-snug line-clamp-1 text-white">{project.title}</h3>
              </div>
              
              {/* Hearts/Save button */}
              {onToggleSave && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onToggleSave(project.id);
                  }}
                  className={`rounded-full p-1.5 border transition shrink-0 ${
                    isSaved
                      ? "bg-rose-50 border-rose-200 text-rose-500"
                      : "bg-white/15 border-white/15 text-white/80 hover:bg-white hover:text-slate-900"
                  }`}
                  title={isSaved ? "Saved" : "Save Project"}
                >
                  <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content body */}
        <div className="p-3.5">
          <p className={`text-[11px] leading-relaxed text-slate-500 ${expanded ? "" : "line-clamp-2"}`}>
            {project.description}
          </p>
          {project.description && project.description.length > 100 && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="mt-0.5 text-[9px] font-bold text-blue-600 hover:text-blue-700 block transition-colors duration-150 cursor-pointer"
              type="button"
            >
              {expanded ? "Read Less" : "Read More"}
            </button>
          )}

          <div className="mt-2.5 flex flex-wrap gap-1">
            {project.skills.slice(0, 3).map((skill) => (
              <span className="rounded bg-slate-50 border border-slate-200/75 px-1.5 py-0.5 text-[9px] text-slate-500 font-semibold" key={skill}>
                {skill}
              </span>
            ))}
            {project.skills.length > 3 && (
              <span className="text-[9px] text-slate-400 font-semibold self-center ml-0.5">+{project.skills.length - 3} more</span>
            )}
          </div>

          {/* Quick specs grid */}
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 text-[10px] text-slate-500">
            <div>
              Budget
              <span className="mt-0.5 block font-bold text-slate-800 text-[11px]">
                {formatBudget(project.budgetMin, project.budgetMax, project.currency)}
              </span>
            </div>
            <div>
              Duration
              <span className="mt-0.5 block font-bold text-slate-800 text-[11px]">{project.timeline}</span>
            </div>
            <div>
              Proposals
              <span className="mt-0.5 block font-bold text-slate-800 text-[11px]">{getProposalsRange(project.proposalsCount)}</span>
            </div>
            <div>
              Connects
              <span className="mt-0.5 block font-bold text-slate-800 text-[11px] flex items-center gap-1">
                <span>⚡ {connectsRequired}</span>
                <span className="text-[7px] bg-blue-50 text-blue-600 border border-blue-200/50 px-1 py-0.2 rounded font-bold uppercase select-none">AI</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer recruiter metrics and action buttons */}
      <div className="px-3.5 pb-3.5 pt-0">
        <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-500">
          {paymentVerified ? (
            <span className="flex items-center text-emerald-600 font-bold gap-1">
              <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 111.414-1.414L9 10.586l3.293-3.293a1 1 0 111.414 1.414z" />
              </svg>
              Payment Verified
            </span>
          ) : (
            <span className="text-slate-400 font-semibold">Payment Unverified</span>
          )}
          <span className="font-semibold text-slate-700">★ {recruiter.rating || "0.0"} rating</span>
        </div>

        <div className="mt-2.5 flex gap-2">
          <Link
            className="flex-1 text-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-2 text-[11px] font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.2)] transition hover:-translate-y-0.5 hover:brightness-[1.02]"
            to={`/projects/${project.id}`}
          >
            Apply Now
          </Link>
        </div>
      </div>
    </article>
  );
}

export default ProjectCard;
