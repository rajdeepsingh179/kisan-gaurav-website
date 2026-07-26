import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function PasswordResetPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const { forgotPassword, resetPassword } = useAuth();
  const [message, setMessage] = useState("");
  useDocumentTitle(token ? "Reset Password" : "Forgot Password");
  const submit = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      if (token) await resetPassword(token, data.get("password"));
      else await forgotPassword(data.get("email"));
      setMessage(token ? "Password reset. You can now sign in." : "If that account exists, a secure reset link has been queued.");
    } catch (error) { setMessage(error.message); }
  };
  return <div className="auth-page"><form onSubmit={submit}><p className="eyebrow">Account security</p><h1>{token ? "Choose a new password" : "Forgot your password?"}</h1><p>{token ? "Use at least eight characters." : "Enter your account email to receive a one-hour reset link."}</p>{token ? <input name="password" type="password" minLength="8" required placeholder="New password" /> : <input name="email" type="email" required placeholder="Email address" />}<button>{token ? "Reset password" : "Send reset link"}</button>{message ? <span role="status">{message}</span> : null}<Link to="/">Return to storefront</Link></form></div>;
}
