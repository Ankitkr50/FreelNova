import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/routes.js";

function AdminDashboard({ data }) {
  const metrics = data?.metrics || {};

  return (
    <div className="grid gap-4">
      <section className="border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-[16px] rounded-[2rem] p-6">
        <h2 className="text-xl font-semibold text-slate-900">Super Admin Overview</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="border border-slate-200/80 bg-white/95 shadow-[0_16px_38px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_45px_rgba(15,23,42,0.1)] hover:border-blue-300/60 rounded-[1.35rem] p-4">
            <p className="text-sm text-slate-500">Users</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{metrics.users || 0}</p>
          </article>
          <article className="border border-slate-200/80 bg-white/95 shadow-[0_16px_38px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_45px_rgba(15,23,42,0.1)] hover:border-blue-300/60 rounded-[1.35rem] p-4">
            <p className="text-sm text-slate-500">Projects</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{metrics.projects || 0}</p>
          </article>
          <article className="border border-slate-200/80 bg-white/95 shadow-[0_16px_38px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_45px_rgba(15,23,42,0.1)] hover:border-blue-300/60 rounded-[1.35rem] p-4">
            <p className="text-sm text-slate-500">Applications</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{metrics.applications || 0}</p>
          </article>
        </div>
        <div className="mt-4">
          <Link className="rounded-2xl border border-slate-300 bg-white/85 font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 hover:border-blue-300/50 px-3 py-2 text-sm" to={ROUTES.ADMIN}>
            Open Super Admin Panel
          </Link>
        </div>
      </section>
    </div>
  );
}

export default AdminDashboard;


