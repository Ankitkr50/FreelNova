import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { useProfileQuery } from "../../hooks/useProfile.js";
import { calculateProfileCompletion, getMissingFields } from "../../utils/profile.js";
import { ROUTES } from "../../constants/routes.js";

function ProfileCompletionBanner() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfileQuery();

  const activeUser = profile ? { ...user, ...profile } : user;

  const completion = calculateProfileCompletion(activeUser);
  const missingFields = getMissingFields(activeUser);
  if (user?.role === "admin" || !profile || isLoading || completion >= 100) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-4 py-2.5 text-white shadow-sm z-10 relative">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-semibold">
          <span>
            Your FreelNova Profile is <strong className="underline">{completion}% Complete</strong>. Missing:{" "}
            <span className="font-normal text-amber-100">
              {missingFields.slice(0, 4).join(", ")}
              {missingFields.length > 4 ? ` +${missingFields.length - 4} more` : ""}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={ROUTES.EDIT_PROFILE}
            className="rounded-xl bg-white text-amber-900 font-bold px-3 py-1.5 shadow-xs transition hover:bg-amber-50 cursor-pointer"
          >
            Complete Profile Now
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ProfileCompletionBanner;
