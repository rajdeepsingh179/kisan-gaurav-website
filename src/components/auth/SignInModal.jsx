import AuthModal, { FormDivider, FormField, GoogleButton } from "./AuthModal";
import { Button } from "../ui";

export default function SignInModal({ isOpen, onClose, onSwitchToSignUp }) {
  return (
    <AuthModal
      description="Welcome back. Sign in to continue your farming journey."
      isOpen={isOpen}
      onClose={onClose}
      title="Sign in to your account"
    >
      <div className="space-y-5">
        <GoogleButton label="Continue with Google" />
        <FormDivider />
        <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
          <FormField autoComplete="email" label="Email" name="email" type="email" />
          <FormField autoComplete="tel" label="Mobile Number" name="mobile" type="tel" />
          <FormField autoComplete="current-password" label="Password" name="password" type="password" />
          <Button className="mt-1 w-full" type="submit">
            Sign In
          </Button>
        </form>
        <p className="text-center text-sm text-foreground-muted">
          New to Kisan Gaurav?{" "}
          <button
            className="font-semibold text-primary-700 underline-offset-4 hover:text-primary-800 hover:underline"
            type="button"
            onClick={onSwitchToSignUp}
          >
            Create an account
          </button>
        </p>
      </div>
    </AuthModal>
  );
}
