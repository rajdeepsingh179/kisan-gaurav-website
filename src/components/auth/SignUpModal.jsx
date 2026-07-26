import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import AuthModal, { FormDivider, FormField, GoogleButton } from "./AuthModal";
import { Button } from "../ui";

export default function SignUpModal({ isOpen, onClose, onSwitchToSignIn }) {
  const { signInGoogle, signUpEmail } = useAuth();
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    try { await signUpEmail({ displayName: data.get("fullName"), email: data.get("email"), mobile: data.get("mobile"), password: data.get("password") }); onClose(); } catch (reason) { setError(reason.message); }
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
          <FormField autoComplete="name" label="Full Name" name="fullName" />
          <FormField autoComplete="email" label="Email" name="email" type="email" />
          <FormField autoComplete="tel" label="Mobile Number" name="mobile" type="tel" />
          <FormField autoComplete="new-password" label="Password" name="password" type="password" />
          <label className="flex items-start gap-3 text-sm text-foreground-muted"><input className="mt-1 accent-primary-700" name="terms" type="checkbox" required />I agree to the Terms &amp; Conditions.</label>
          {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
          <Button className="mt-1 w-full" type="submit">Create Account</Button>
        </form>
        <p className="text-center text-sm text-foreground-muted">Already registered?{" "}<button className="font-semibold text-primary-700 hover:underline" type="button" onClick={onSwitchToSignIn}>Sign in</button></p>
      </div>
    </AuthModal>
  );
}
