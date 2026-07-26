import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import AuthModal, { FormDivider, FormField, GoogleButton } from "./AuthModal";
import { Button } from "../ui";

export default function SignInModal({ isOpen, onClose, onSwitchToSignUp }) {
  const { signInEmail, signInGoogle } = useAuth();
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    try { await signInEmail(data.get("email"), data.get("password")); onClose(); } catch (reason) { setError(reason.message); }
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
          <FormField autoComplete="current-password" label="Password" name="password" type="password" />
          <a className="block text-right text-xs font-semibold text-primary-700 hover:underline" href="/forgot-password">Forgot password?</a>
          {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
          <Button className="mt-1 w-full" type="submit">Sign In</Button>
        </form>
        <p className="text-center text-sm text-foreground-muted">New to Kisan Gaurav?{" "}<button className="font-semibold text-primary-700 hover:underline" type="button" onClick={onSwitchToSignUp}>Create an account</button></p>
      </div>
    </AuthModal>
  );
}
