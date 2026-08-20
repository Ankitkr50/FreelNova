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

  return <Outlet />;
}

export default ProtectedRoute;
