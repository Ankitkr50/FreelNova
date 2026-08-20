import SectionCard from "./SectionCard.jsx";

function ExperienceSection({ experienceYears, education, editable = false, onChange, errors = {} }) {
  return (
    <SectionCard description="Highlight your total experience and educational background." title="Experience">
      {editable ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="experienceYears">
              Years of Experience
            </label>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-sky-500 focus:ring-2"
              id="experienceYears"
              min="0"
              onChange={(event) => onChange("experienceYears", event.target.value)}
              type="number"
              value={experienceYears ?? 0}
            />
            {errors.experienceYears ? <p className="mt-1 text-xs text-rose-600">{errors.experienceYears}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="education">
              Education
            </label>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-sky-500 focus:ring-2"
              id="education"
              onChange={(event) => onChange("education", event.target.value)}
              placeholder="B.Tech Computer Science"
              type="text"
              value={education || ""}
            />
            {errors.education ? <p className="mt-1 text-xs text-rose-600">{errors.education}</p> : null}
          </div>
        </div>
      ) : (
        <dl className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-500">Experience</dt>
            <dd>{experienceYears} years</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Education</dt>
            <dd>{education}</dd>
          </div>
        </dl>
      )}
    </SectionCard>
  );
}

export default ExperienceSection;

