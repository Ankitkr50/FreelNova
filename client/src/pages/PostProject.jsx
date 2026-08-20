import { useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../constants/routes.js";
import { useAuth } from "../hooks/useAuth.js";
import { useCreateProjectMutation } from "../hooks/useProjects.js";

const categories = [
  "Programming & Tech",
  "Web Development",
  "Backend Development",
  "Mobile Development",
  "Full Stack Development",
  "Machine Learning & AI",
  "Data Science",
  "Graphics & Design",
  "UI/UX Design",
  "Digital Marketing",
  "Writing & Translation",
  "Content Writing",
  "Video & Animation",
  "AI Services",
  "Music & Audio",
  "Business",
  "Consulting",
];

const CATEGORY_BENCHMARKS = {
  "Programming & Tech": { min: 400, max: 800, text: "Average hourly rate: ₹25 - ₹45/hr" },
  "Web Development": { min: 300, max: 900, text: "Average hourly rate: ₹20 - ₹55/hr" },
  "Backend Development": { min: 450, max: 1200, text: "Average hourly rate: ₹30 - ₹70/hr" },
  "Mobile Development": { min: 500, max: 1500, text: "Average hourly rate: ₹35 - ₹85/hr" },
  "Full Stack Development": { min: 600, max: 1800, text: "Average hourly rate: ₹40 - ₹100/hr" },
  "Machine Learning & AI": { min: 800, max: 2500, text: "Average hourly rate: ₹50 - ₹150/hr" },
  "Data Science": { min: 700, max: 2000, text: "Average hourly rate: ₹45 - ₹120/hr" },
  "Graphics & Design": { min: 200, max: 700, text: "Average hourly rate: ₹15 - ₹40/hr" },
  "UI/UX Design": { min: 350, max: 900, text: "Average hourly rate: ₹25 - ₹50/hr" },
  "AI Services": { min: 850, max: 3000, text: "Average hourly rate: ₹60 - ₹180/hr" },
};

const initialForm = {
  title: "",
  description: "",
  category: "",
  budgetMin: "",
  budgetMax: "",
  deadline: "",
  timeline: "",
  location: "Remote",
  clientName: "",
  requirements: "",
  skills: [],
};

function isPastDate(dateValue) {
  const selected = new Date(`${dateValue}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selected < today;
}

function PostProject() {
  const { user } = useAuth();
  const createProjectMutation = useCreateProjectMutation();

  const [form, setForm] = useState({
    ...initialForm,
    clientName: user?.role === "recruiter" ? "Recruiter Company" : "",
  });
  const [skillInput, setSkillInput] = useState("");
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: "", text: "" });

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    if (status.type === "error") setStatus({ type: "", text: "" });
  };

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    const alreadyExists = form.skills.some((item) => item.toLowerCase() === trimmed.toLowerCase());
    if (alreadyExists) return;

    setForm((prev) => ({ ...prev, skills: [...prev.skills, trimmed] }));
    setSkillInput("");
    setErrors((prev) => ({ ...prev, skills: "" }));
  };

  const handleRemoveSkill = (skill) => {
    setForm((prev) => ({ ...prev, skills: prev.skills.filter((item) => item !== skill) }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = "Title is required.";
    else if (form.title.trim().length < 8) nextErrors.title = "Title should be at least 8 characters.";

    if (!form.description.trim()) nextErrors.description = "Description is required.";
    else if (form.description.trim().length < 60) nextErrors.description = "Description should be at least 60 characters.";

    if (!form.category) nextErrors.category = "Select a category.";
    if (!form.clientName.trim()) nextErrors.clientName = "Client/company name is required.";

    const min = Number(form.budgetMin);
    const max = Number(form.budgetMax);
    if (!form.budgetMin) nextErrors.budgetMin = "Minimum budget is required.";
    else if (Number.isNaN(min) || min <= 0) nextErrors.budgetMin = "Enter a valid minimum budget.";

    if (!form.budgetMax) nextErrors.budgetMax = "Maximum budget is required.";
    else if (Number.isNaN(max) || max <= 0) nextErrors.budgetMax = "Enter a valid maximum budget.";
    else if (!nextErrors.budgetMin && max < min) nextErrors.budgetMax = "Maximum budget must be >= minimum budget.";

    if (!form.deadline) nextErrors.deadline = "Deadline is required.";
    else if (isPastDate(form.deadline)) nextErrors.deadline = "Deadline cannot be in the past.";

    if (!form.timeline.trim()) nextErrors.timeline = "Timeline is required.";
    if (!form.skills.length) nextErrors.skills = "Add at least one required skill.";

    return nextErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      setStatus({ type: "error", text: "Please resolve validation errors before posting." });
      return;
    }

    const requirements = form.requirements
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    setStatus({ type: "loading", text: "Posting project..." });
    createProjectMutation.mutate(
      {
        ...form,
        requirements,
        recruiterName: user?.name || "Client",
      },
      {
        onSuccess: (response) => {
          setStatus({ type: "success", text: response?.data?.message || "Project posted successfully." });
          setForm({
            ...initialForm,
            clientName: form.clientName,
          });
          setSkillInput("");
        },
        onError: (error) => {
          setStatus({
            type: "error",
            text: error?.response?.data?.message || "Unable to post project. Please try again.",
          });
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* Premium Blue Theme Banner Header */}
      <section className="rounded-[2rem] border border-blue-200/80 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.28),transparent_30%),linear-gradient(135deg,#0f274f_0%,#163d7a_48%,#2563eb_100%)] p-6 text-white shadow-[0_24px_70px_rgba(37,99,235,0.15)] md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-blue-50">
              Client Workspace
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">Post Project</h1>
            <p className="mt-2 text-blue-50/80">Create a new project with complete requirements to attract quality freelancers.</p>
          </div>
          <Link className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 hover:scale-[1.02]" to={ROUTES.MY_PROJECTS}>
            View My Projects
          </Link>
        </div>
      </section>

      {/* Form Container (White Card) */}
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <form className="space-y-5" noValidate onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="title">
              Project Title
            </label>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
              id="title"
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Build MERN Dashboard for Hiring Platform"
              type="text"
              value={form.title}
            />
            {errors.title ? <p className="mt-1 text-xs text-rose-600">{errors.title}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="description">
              Description
            </label>
            <textarea
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 min-h-32"
              id="description"
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Describe project scope, goals, deliverables, and expectations..."
              value={form.description}
            />
            {errors.description ? <p className="mt-1 text-xs text-rose-600">{errors.description}</p> : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="category">
                Category
              </label>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                id="category"
                onChange={(event) => updateField("category", event.target.value)}
                value={form.category}
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category ? <p className="mt-1 text-xs text-rose-600">{errors.category}</p> : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="clientName">
                Client/Company Name
              </label>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                id="clientName"
                onChange={(event) => updateField("clientName", event.target.value)}
                placeholder="e.g. Acme Corp"
                type="text"
                value={form.clientName}
              />
              {errors.clientName ? <p className="mt-1 text-xs text-rose-600">{errors.clientName}</p> : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="budgetMin">
                Budget Min (₹)
              </label>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                id="budgetMin"
                onChange={(event) => updateField("budgetMin", event.target.value)}
                placeholder="e.g. 50"
                type="number"
                value={form.budgetMin}
              />
              {errors.budgetMin ? <p className="mt-1 text-xs text-rose-600">{errors.budgetMin}</p> : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="budgetMax">
                Budget Max (₹)
              </label>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                id="budgetMax"
                onChange={(event) => updateField("budgetMax", event.target.value)}
                placeholder="e.g. 500"
                type="number"
                value={form.budgetMax}
              />
              {errors.budgetMax ? <p className="mt-1 text-xs text-rose-600">{errors.budgetMax}</p> : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="deadline">
                Deadline
              </label>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                id="deadline"
                onChange={(event) => updateField("deadline", event.target.value)}
                type="date"
                value={form.deadline}
              />
              {errors.deadline ? <p className="mt-1 text-xs text-rose-600">{errors.deadline}</p> : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="timeline">
                Timeline
              </label>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                id="timeline"
                onChange={(event) => updateField("timeline", event.target.value)}
                placeholder="e.g. 2 weeks"
                type="text"
                value={form.timeline}
              />
              {errors.timeline ? <p className="mt-1 text-xs text-rose-600">{errors.timeline}</p> : null}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="skills">
              Required Skills
            </label>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                id="skills"
                onChange={(event) => setSkillInput(event.target.value)}
                placeholder="Type a skill (e.g. React) and press Add"
                type="text"
                value={skillInput}
              />
              <button
                className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 cursor-pointer"
                onClick={handleAddSkill}
                type="button"
              >
                Add
              </button>
            </div>
            {form.skills.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {form.skills.map((skill) => (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800"
                    key={skill}
                  >
                    {skill}
                    <button
                      className="text-slate-400 hover:text-slate-600 transition"
                      onClick={() => handleRemoveSkill(skill)}
                      type="button"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            {errors.skills ? <p className="mt-1 text-xs text-rose-600">{errors.skills}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="requirements">
              Requirements (Detailed bullet points)
            </label>
            <textarea
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 min-h-36"
              id="requirements"
              onChange={(event) => updateField("requirements", event.target.value)}
              placeholder={"Role-based auth experience\nResponsive UI implementation\nREST API integration"}
              value={form.requirements}
            />
          </div>

          <button
            className="rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 hover:brightness-[1.02] px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
            disabled={createProjectMutation.isPending}
            type="submit"
          >
            {createProjectMutation.isPending ? "Posting..." : "Post Project"}
          </button>
        </form>

        {status.text ? (
          <p
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              status.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : status.type === "success"
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-slate-100 text-slate-700"
            }`}
          >
            {status.text}
          </p>
        ) : null}
      </section>
    </div>
  );
}

export default PostProject;
