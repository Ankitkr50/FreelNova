import SectionCard from "./SectionCard.jsx";

function SkillsSection({ skills, editable = false, skillInput = "", onAddSkill, onRemoveSkill, onSkillInputChange, errors = {} }) {
  const tags = skills?.length ? skills : ["No skills added"];

  return (
    <SectionCard description="Showcase your strongest technical and domain capabilities." title="Skills">
      {editable ? (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700" htmlFor="skills">
            Add Skill
          </label>
          <div className="flex gap-2">
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-sky-500 focus:ring-2"
              id="skills"
              onChange={(event) => onSkillInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onAddSkill();
                }
              }}
              placeholder="React"
              type="text"
              value={skillInput}
            />
            <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={onAddSkill} type="button">
              Add
            </button>
          </div>
          {errors.skills ? <p className="text-xs text-rose-600">{errors.skills}</p> : null}
          <p className="text-xs text-slate-500">Press Enter or click Add to create skill tags.</p>
        </div>
      ) : null}

      <div className={`flex flex-wrap gap-2 ${editable ? "mt-4" : ""}`}>
        {tags.map((skill) => (
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700" key={skill}>
            {skill}
            {editable ? (
              <button className="text-xs font-bold text-blue-700 hover:text-rose-600" onClick={() => onRemoveSkill(skill)} type="button">
                x
              </button>
            ) : null}
          </span>
        ))}
      </div>
    </SectionCard>
  );
}

export default SkillsSection;

