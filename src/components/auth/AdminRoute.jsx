import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { isAdminRole } from "../../utils/roles";

export default function AdminRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="admin-gate"><span className="admin-spinner" />Checking secure access…</div>;
  if (!user) return <Navigate replace state={{ from: location.pathname }} to="/admin/login" />;
  if (!isAdminRole(user.role)) return <Navigate replace to="/account" />;

  return <Outlet />;
}
