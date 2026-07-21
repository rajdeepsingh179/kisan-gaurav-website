import AuthModal, { FormDivider, FormField, GoogleButton } from "./AuthModal";
import { Button } from "../ui";

export default function SignUpModal({ isOpen, onClose, onSwitchToSignIn }) {
  return (
    <AuthModal
      description="Create your account to get more from Kisan Gaurav."
      isOpen={isOpen}
      onClose={onClose}
      title="Join Kisan Gaurav"
    >
      <div className="space-y-5">
        <GoogleButton label="Sign up with Google" />
        <FormDivider />
        <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
          <FormField autoComplete="name" label="Full Name" name="fullName" />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField autoComplete="email" label="Email" name="email" type="email" />
            <FormField autoComplete="tel" label="Mobile Number" name="mobile" type="tel" />
          </div>
          <FormField autoComplete="new-password" label="Password" name="password" type="password" />
          <label className="flex items-start gap-3 text-sm leading-5 text-foreground-muted">
            <input
              className="mt-0.5 size-4 shrink-0 accent-primary-700"
              name="terms"
              type="checkbox"
              required
            />
            <span>
              I agree to the{" "}
              <a className="font-semibold text-primary-700 hover:underline" href="/#terms">
                Terms &amp; Conditions
              </a>
              .
            </span>
          </label>
          <Button className="mt-1 w-full" type="submit">
            Sign Up
          </Button>
        </form>
        <p className="text-center text-sm text-foreground-muted">
          Already have an account?{" "}
          <button
            className="font-semibold text-primary-700 underline-offset-4 hover:text-primary-800 hover:underline"
            type="button"
            onClick={onSwitchToSignIn}
          >
            Sign in
          </button>
        </p>
      </div>
    </AuthModal>
  );
}
