import SectionCard from "./SectionCard.jsx";

function HourlyRateSection({ hourlyRate, editable = false, onChange, errors = {} }) {
  return (
    <SectionCard
      description="Specify your hourly charging rate in INR so clients can calculate hire budgets."
      title="Hourly Rate"
    >
      {editable ? (
        <div className="max-w-xs">
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="hourlyRate">
            Hourly Price (₹ / hr)
          </label>
          <div className="relative rounded-2xl shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <span className="text-slate-500 sm:text-sm">₹</span>
            </div>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-8 pr-4 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 transition"
              id="hourlyRate"
              min="0"
              placeholder="e.g. 1500"
              onChange={(event) => onChange("hourlyRate", event.target.value)}
              type="number"
              value={hourlyRate || ""}
            />
          </div>
          {errors.hourlyRate ? (
            <p className="mt-1 text-xs text-rose-600">{errors.hourlyRate}</p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl bg-blue-50/50 border border-blue-100 p-4 w-fit">
          <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">
            Standard Hourly Rate
          </span>
          <span className="text-2xl font-black text-blue-900 mt-1 block">
            ₹{(hourlyRate || 0).toLocaleString()}{" "}
            <span className="text-sm font-medium text-slate-500">/ hour</span>
          </span>
        </div>
      )}
    </SectionCard>
  );
}

export default HourlyRateSection;
