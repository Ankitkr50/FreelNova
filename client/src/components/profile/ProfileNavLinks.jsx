import { NavLink } from "react-router-dom";
import { ROUTES } from "../../constants/routes.js";
import { useAuth } from "../../hooks/useAuth.js";

function ProfileNavLinks() {
  const { user } = useAuth();
  const role = user?.role;

  const links = [
    { label: "Profile", to: ROUTES.PROFILE },
    { label: "Edit Profile", to: ROUTES.EDIT_PROFILE },
  ];

  if (role === "freelancer") {
    links.push({ label: "Resume Upload", to: ROUTES.RESUME_UPLOAD });
  }

  return (
    <nav className="flex flex-wrap gap-2">
      {links.map((item) => (
        <NavLink
          className={({ isActive }) =>
            `rounded-full px-4 py-2 text-sm font-medium transition ${
              isActive ? "bg-blue-50 text-blue-700" : "border border-slate-300 text-slate-700 hover:bg-slate-50"
            }`
          }
          key={item.to}
          to={item.to}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default ProfileNavLinks;

