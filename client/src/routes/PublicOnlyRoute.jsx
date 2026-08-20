import { Navigate, Outlet } from "react-router-dom";
import { ROUTES } from "../constants/routes.js";
import { useAuth } from "../hooks/useAuth.js";

function PublicOnlyRoute() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return <Outlet />;
}

export default PublicOnlyRoute;

