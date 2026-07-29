import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import AuthModal, { FormDivider, FormField, GoogleButton, PasswordField } from "./AuthModal";
import { Button } from "../ui";

export default function SignInModal({ isOpen, onClose, onSwitchToSignUp }) {
  const { signInEmail, signInGoogle } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    setBusy(true);
    try { await signInEmail(data.get("email"), data.get("password"), data.get("rememberMe") === "on"); onClose(); } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };
  const google = async () => {
    setError("");
    try { await signInGoogle(); onClose(); } catch (reason) { setError(reason.message); }
  };
  return (
    <AuthModal description="Welcome back. Access your wishlist, addresses and orders." isOpen={isOpen} onClose={onClose} title="Sign in to your account">
      <div className="space-y-5">
        <GoogleButton label="Continue with Google" onClick={google} />
        <FormDivider />
        <form className="space-y-4" onSubmit={submit}>
          <FormField autoComplete="email" label="Email" name="email" type="email" />
          <PasswordField autoComplete="current-password" label="Password" name="password" />
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-foreground-muted"><input className="accent-primary-700" name="rememberMe" type="checkbox" />Remember me</label>
            <a className="text-xs font-semibold text-primary-700 hover:underline" href="/forgot-password">Forgot password?</a>
          </div>
          {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
          <Button className="mt-1 w-full" disabled={busy} type="submit">{busy ? "Signing in…" : "Sign In"}</Button>
        </form>
        <p className="text-center text-sm text-foreground-muted">New to Kisan Gaurav?{" "}<button className="font-semibold text-primary-700 hover:underline" type="button" onClick={onSwitchToSignUp}>Create an account</button></p>
      </div>
    </AuthModal>
  );
}
