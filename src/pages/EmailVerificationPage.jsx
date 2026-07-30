import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function EmailVerificationPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const { verifyEmail } = useAuth();
  const started = useRef(false);
  const [state, setState] = useState({ busy: Boolean(token), message: token ? "Verifying your email…" : "This verification link is incomplete.", error: !token });
  useDocumentTitle("Verify Email");

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    window.history.replaceState(window.history.state, "", window.location.pathname);
    verifyEmail(token)
      .then((result) => setState({ busy: false, message: result.message, error: false }))
      .catch((error) => setState({ busy: false, message: error.message, error: true }));
  }, [token, verifyEmail]);

  return (
    <div className="auth-page">
      <section className="auth-page__card" aria-busy={state.busy}>
        <p className="eyebrow">Account security</p>
        <h1>{state.busy ? "Verifying email" : state.error ? "Unable to verify" : "Email verified"}</h1>
        <p role={state.error ? "alert" : "status"}>{state.message}</p>
        <Link to="/">{state.error ? "Return to storefront" : "Continue to storefront and sign in"}</Link>
      </section>
    </div>
  );
}
