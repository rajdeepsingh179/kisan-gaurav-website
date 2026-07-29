import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { isAdminRole } from "../../utils/roles";
import AdminAccessSkeleton from "../admin/AdminAccessSkeleton";

export default function AdminRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <AdminAccessSkeleton />;
  if (!user) return <Navigate replace state={{ from: location.pathname }} to="/admin/login" />;
  if (!isAdminRole(user.role)) return <Navigate replace to="/account" />;

  return <Outlet />;
}
