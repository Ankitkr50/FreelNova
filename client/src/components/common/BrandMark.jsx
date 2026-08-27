import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/routes.js";

function BrandMark({ compact = false, className = "" }) {
  const targetRoute = ROUTES.HOME || "/";
  const marginClass = compact ? "ml-0 md:-ml-8" : "ml-0 md:-ml-11";

  return (
    <Link
      to={targetRoute}
      className={`inline-flex items-center select-none ${marginClass} ${className}`.trim()}
    >
      <span
        className={`${compact ? "text-[1.85rem] tracking-tight" : "text-5xl tracking-tighter"
          } text-black flex items-end gap-0.5 transition hover:opacity-90`}
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        <span className="font-bold text-black">Freel</span>
        <span className="font-normal text-black -ml-0.5">Nova</span>
        <span
          className={`${compact ? "h-2 w-2 mb-2.5" : "h-3 w-3 mb-3.5"} rounded-full bg-blue-600 shrink-0`}
        />
      </span>
    </Link>
  );
}

export default BrandMark;
