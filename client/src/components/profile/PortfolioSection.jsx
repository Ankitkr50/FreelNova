import SectionCard from "./SectionCard.jsx";

function PortfolioSection({ links, editable = false, portfolioInput = "", onPortfolioInputChange, onAddPortfolioLink, onRemovePortfolioLink, errors = {} }) {
  const hasLinks = links?.length > 0;

  return (
    <SectionCard description="Add links to GitHub, Behance, personal website, or project demos." title="Portfolio Links">
      {editable ? (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700" htmlFor="portfolioLink">
            Add Portfolio URL
          </label>
          <div className="flex gap-2">
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-sky-500 focus:ring-2"
              id="portfolioLink"
              onChange={(event) => onPortfolioInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onAddPortfolioLink();
                }
              }}
              placeholder="https://github.com/your-profile"
              type="url"
              value={portfolioInput}
            />
            <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={onAddPortfolioLink} type="button">
              Add
            </button>
          </div>
          {errors.portfolioLinks ? <p className="text-xs text-rose-600">{errors.portfolioLinks}</p> : null}
        </div>
      ) : null}

      {hasLinks ? (
        <ul className={`${editable ? "mt-4" : ""} space-y-2`}>
          {links.map((link) => (
            <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm" key={link}>
              <a className="truncate font-medium text-blue-700 hover:text-blue-800" href={link} rel="noreferrer" target="_blank">
                {link}
              </a>
              {editable ? (
                <button className="text-xs font-semibold text-rose-600 hover:text-rose-700" onClick={() => onRemovePortfolioLink(link)} type="button">
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className={`text-sm text-slate-600 ${editable ? "mt-4" : ""}`}>No portfolio links added yet.</p>
      )}
    </SectionCard>
  );
}

export default PortfolioSection;

