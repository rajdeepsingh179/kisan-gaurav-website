import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import AuthModal, { FormDivider, FormField, GoogleButton, PasswordField } from "./AuthModal";
import { Button } from "../ui";

export default function SignUpModal({ isOpen, onClose, onSwitchToSignIn }) {
  const { signInGoogle, signUpEmail } = useAuth();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setError("");
    setMessage("");
    const data = new FormData(form);
    if (data.get("password") !== data.get("confirmPassword")) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const result = await signUpEmail({
        firstName: data.get("firstName"),
        lastName: data.get("lastName"),
        email: data.get("email"),
        password: data.get("password"),
      });
      form.reset();
      setMessage(result.message);
    } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };
  const google = async () => {
    setError("");
    try { await signInGoogle(); onClose(); } catch (reason) { setError(reason.message); }
  };
  return (
    <AuthModal description="Create an account for faster checkout, saved addresses and order history." isOpen={isOpen} onClose={onClose} title="Join Kisan Gaurav">
      <div className="space-y-5">
        <GoogleButton label="Sign up with Google" onClick={google} />
        <FormDivider />
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField autoComplete="given-name" label="First Name" name="firstName" />
            <FormField autoComplete="family-name" label="Last Name" name="lastName" />
          </div>
          <FormField autoComplete="email" label="Email" name="email" type="email" />
          <PasswordField autoComplete="new-password" label="Password" minLength="12" name="password" />
          <PasswordField autoComplete="new-password" label="Confirm Password" minLength="12" name="confirmPassword" />
          <p className="text-xs leading-5 text-foreground-muted">Use 12+ characters with uppercase, lowercase, a number, and a symbol.</p>
          <label className="flex items-start gap-3 text-sm text-foreground-muted"><input className="mt-1 accent-primary-700" name="terms" type="checkbox" required />I agree to the Terms &amp; Conditions.</label>
          {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
          {message ? <p className="rounded-control bg-primary-50 p-3 text-sm text-primary-800" role="status">{message}</p> : null}
          <Button className="mt-1 w-full" disabled={busy} type="submit">{busy ? "Creating account…" : "Create Account"}</Button>
        </form>
        <p className="text-center text-sm text-foreground-muted">Already registered?{" "}<button className="font-semibold text-primary-700 hover:underline" type="button" onClick={onSwitchToSignIn}>Sign in</button></p>
      </div>
    </AuthModal>
  );
}
