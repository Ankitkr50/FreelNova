import { Link } from "react-router-dom";

function formatBudget(min, max) {
  return `₹${min} - ₹${max}`;
}

function ProjectsTable({ projects }) {
  return (
    <div className="border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-[16px] overflow-x-auto rounded-[1.75rem]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50/80 text-slate-600">
          <tr>
            <th className="px-4 py-3 font-semibold">Project</th>
            <th className="px-4 py-3 font-semibold">Category</th>
            <th className="px-4 py-3 font-semibold">Budget</th>
            <th className="px-4 py-3 font-semibold">Skills</th>
            <th className="px-4 py-3 font-semibold">Proposals</th>
            <th className="px-4 py-3 font-semibold">Deadline</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr className="border-t border-slate-100/90" key={project.id}>
              <td className="px-4 py-3">
                <p className="font-semibold text-slate-900">{project.title}</p>
                <p className="text-xs text-slate-500">{project.clientName}</p>
              </td>
              <td className="px-4 py-3 text-slate-700">{project.category}</td>
              <td className="px-4 py-3 text-slate-700">{formatBudget(project.budgetMin, project.budgetMax)}</td>
              <td className="px-4 py-3 text-slate-700">{project.skills.slice(0, 3).join(", ")}</td>
              <td className="px-4 py-3 text-slate-700">{project.proposalsCount}</td>
              <td className="px-4 py-3 text-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <span>{project.deadline}</span>
                  <Link className="rounded-2xl border border-slate-300 bg-white/85 font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 hover:border-blue-300/50 px-2 py-1 text-xs" to={`/projects/${project.id}`}>
                    View
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ProjectsTable;


