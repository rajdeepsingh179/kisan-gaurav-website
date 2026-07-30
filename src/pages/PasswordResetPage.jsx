import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function PasswordResetPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const { forgotPassword, resetPassword } = useAuth();
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  useDocumentTitle(token ? "Reset Password" : "Forgot Password");
  useEffect(() => {
    if (token) window.history.replaceState(window.history.state, "", window.location.pathname);
  }, [token]);
  const submit = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(false);
    if (token && data.get("password") !== data.get("confirmPassword")) {
      setError(true);
      setMessage("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (token) await resetPassword(token, data.get("password"));
      else await forgotPassword(data.get("email"));
      setMessage(token ? "Password reset. You can now sign in." : "If that account exists, a secure reset link has been queued.");
    } catch (reason) { setError(true); setMessage(reason.message); } finally { setBusy(false); }
  };
  return (
    <div className="auth-page">
      <form onSubmit={submit}>
        <p className="eyebrow">Account security</p>
        <h1>{token ? "Choose a new password" : "Forgot your password?"}</h1>
        <p>{token ? "Use 12+ characters with uppercase, lowercase, a number, and a symbol." : "Enter your account email to receive a one-hour reset link."}</p>
        {token ? (
          <>
            <input autoComplete="new-password" name="password" type="password" minLength="12" required placeholder="New password" />
            <input autoComplete="new-password" name="confirmPassword" type="password" minLength="12" required placeholder="Confirm new password" />
          </>
        ) : <input autoComplete="email" name="email" type="email" required placeholder="Email address" />}
        <button disabled={busy}>{busy ? "Please wait…" : token ? "Reset password" : "Send reset link"}</button>
        {message ? <span role={error ? "alert" : "status"}>{message}</span> : null}
        <Link to="/">Return to storefront</Link>
      </form>
    </div>
  );
}
