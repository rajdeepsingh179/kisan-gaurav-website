import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function AdminLogoutPage(){
  const {signOutUser}=useAuth();
  useEffect(()=>{signOutUser().finally(()=>window.location.replace("/admin/login"));},[signOutUser]);
  return <div className="admin-gate"><span className="admin-spinner"/>Signing out securely…</div>;
}
