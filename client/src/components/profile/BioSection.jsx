import SectionCard from "./SectionCard.jsx";

function BioSection({ bio, editable = false, onChange, errors = {} }) {
  return (
    <SectionCard description="A short summary that helps clients understand your expertise." title="Bio">
      {editable ? (
        <textarea
          className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-sky-500 focus:ring-2"
          onChange={(event) => onChange("bio", event.target.value)}
          placeholder="Write a concise professional summary..."
          value={bio}
        />
      ) : (
        <p className="text-sm leading-6 text-slate-700">{bio}</p>
      )}
      {editable && errors.bio ? (
        <p className="mt-1 text-xs text-rose-600">{errors.bio}</p>
      ) : (
        null
      )}
    </SectionCard>
  );
}

export default BioSection;

