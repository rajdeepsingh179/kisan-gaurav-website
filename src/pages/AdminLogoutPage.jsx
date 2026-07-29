import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import AdminAccessSkeleton from "../components/admin/AdminAccessSkeleton";

export default function AdminLogoutPage(){
  const {signOutUser}=useAuth();
  useEffect(()=>{signOutUser().finally(()=>window.location.replace("/admin/login"));},[signOutUser]);
  return <AdminAccessSkeleton label="Signing out securely" />;
}
