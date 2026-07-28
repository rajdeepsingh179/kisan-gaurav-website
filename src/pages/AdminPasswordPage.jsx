import { KeyRound, ShoppingBasket } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../services/api";
import useDocumentTitle from "../hooks/useDocumentTitle";

const ADMIN_ROLES=new Set(["SUPER_ADMIN","ADMIN"]);
export default function AdminPasswordPage(){
  const {user,loading,refreshSession}=useAuth();const navigate=useNavigate();const[currentPassword,setCurrentPassword]=useState("");const[newPassword,setNewPassword]=useState("");const[confirm,setConfirm]=useState("");const[error,setError]=useState("");const[busy,setBusy]=useState(false);
  useDocumentTitle("Change Admin Password");
  const submit=async(event)=>{event.preventDefault();if(newPassword!==confirm){setError("New passwords do not match.");return;}setBusy(true);setError("");try{await apiFetch("/api/admin/account/password",{method:"PATCH",body:JSON.stringify({currentPassword,newPassword})});await refreshSession();navigate("/admin/dashboard",{replace:true});}catch(reason){setError(reason.message);}finally{setBusy(false);}};
  if(loading)return <div className="admin-gate"><span className="admin-spinner"/>Checking access…</div>;
  if(!user)return <Navigate replace to="/admin/login"/>;
  if(!ADMIN_ROLES.has(user.role))return <div className="admin-gate"><ShoppingBasket/><h1>Access denied</h1><p>You do not have administrator permissions.</p></div>;
  return <div className="admin-login admin-password-page"><section><div className="admin-login__brand"><ShoppingBasket/><span><strong>Kisan Gaurav</strong><small>Account security</small></span></div><div className="admin-login__copy"><KeyRound/><h1>Choose a new password.</h1><span>Use at least 12 characters and avoid passwords used on other services.</span></div></section><main><form onSubmit={submit}><p>Administrator security</p><h2>Change password</h2><span>Signed in as {user.email}</span>{error?<div className="admin-error" role="alert">{error}</div>:null}<label>Current password<input type="password" autoComplete="current-password" required value={currentPassword} onChange={(event)=>setCurrentPassword(event.target.value)}/></label><label>New password<input type="password" autoComplete="new-password" minLength="12" required value={newPassword} onChange={(event)=>setNewPassword(event.target.value)}/></label><label>Confirm new password<input type="password" autoComplete="new-password" minLength="12" required value={confirm} onChange={(event)=>setConfirm(event.target.value)}/></label><button className="admin-primary" disabled={busy}>{busy?"Updating…":"Update password"}</button><Link to="/admin/dashboard">Return to dashboard</Link></form></main></div>;
}
