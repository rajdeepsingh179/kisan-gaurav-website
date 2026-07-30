import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import RouteFallback from "../RouteFallback";

export default function CustomerRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <RouteFallback />;
  if (!user) {
    const params = new URLSearchParams({
      auth: "signin",
      returnTo: `${location.pathname}${location.search}`,
    });
    return <Navigate replace to={`/account?${params}`} />;
  }
  return <Outlet />;
}
