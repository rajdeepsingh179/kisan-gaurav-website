import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { isAdminRole } from "../utils/roles";
import AdminAccessSkeleton from "../components/admin/AdminAccessSkeleton";
import BrandMark from "../components/brand/BrandMark";

export default function AdminLoginPage() {
  const { user, loading, signInEmail, signInGoogle } = useAuth();
  const [email,setEmail]=useState("");const[password,setPassword]=useState("");const[error,setError]=useState("");const[busy,setBusy]=useState(false);
  useDocumentTitle("Admin Login");
  const submit=async(event)=>{event.preventDefault();setBusy(true);setError("");try{await signInEmail(email,password);}catch(reason){setError(reason.message);}finally{setBusy(false);}};
  if(loading)return <AdminAccessSkeleton label="Checking secure session" />;
  if(user&&isAdminRole(user.role))return <Navigate replace to="/admin/dashboard"/>;
  if(user)return <Navigate replace to="/account"/>;
  return <div className="admin-login"><section><div className="admin-login__brand"><BrandMark className="admin-brand-mark admin-brand-mark--login" priority sizes="56px"/><span><strong>Kisan Gaurav</strong><small>Commerce administration</small></span></div><div className="admin-login__copy"><p>Secure operations workspace</p><h1>Run your store.<br/>Grow with clarity.</h1><span>Products, orders, content and customers in one Cloudflare-native workspace.</span></div></section><main><form onSubmit={submit}><p>Welcome back</p><h2>Sign in to Admin</h2><span>Use an authorized administrator account.</span>{error?<div className="admin-error" role="alert">{error}</div>:null}<label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event)=>setEmail(event.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" required minLength="8" value={password} onChange={(event)=>setPassword(event.target.value)}/></label><button className="admin-primary" disabled={busy}>{busy?"Signing in…":"Sign in securely"}</button><div className="admin-login__divider"><span>or</span></div><button type="button" className="admin-google" onClick={signInGoogle}>Continue with Google</button><Link to="/forgot-password">Forgot password?</Link></form></main></div>;
}
