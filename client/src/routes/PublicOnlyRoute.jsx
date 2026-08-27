import { Navigate, Outlet } from "react-router-dom";
import { ROUTES } from "../constants/routes.js";
import { useAuth } from "../hooks/useAuth.js";

function PublicOnlyRoute() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    const target = user?.role === "admin" ? ROUTES.ADMIN : ROUTES.DASHBOARD;
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
}

export default PublicOnlyRoute;

