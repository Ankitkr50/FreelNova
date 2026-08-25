import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ROUTES } from "../constants/routes.js";
import { useAuth } from "../hooks/useAuth.js";

function ProtectedRoute({ allowedRoles = [] }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location.pathname }} to={ROUTES.LOGIN} />;
  }

  if (allowedRoles.length && !allowedRoles.includes(user?.role)) {
    return <Navigate replace to={ROUTES.DASHBOARD} />;
  }

  // Mandatory First-Time Onboarding Form for new Freelancers and Recruiters/Clients
  if (
    user?.role !== "admin" &&
    !user?.profileCompleted &&
    location.pathname !== ROUTES.COMPLETE_PROFILE &&
    location.pathname !== ROUTES.PENDING_VERIFICATION
  ) {
    return <Navigate replace to={ROUTES.COMPLETE_PROFILE} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
