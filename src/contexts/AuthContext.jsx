import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { API_BASE_URL, apiFetch, authCsrf } from "../services/api";

const AuthContext = createContext(null);

async function postAuthAction(path, values) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Auth-Return-Redirect": "1",
    },
    body: new URLSearchParams(values),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.url) throw new Error("Authentication service is unavailable.");
  return result.url;
}

function authErrorFrom(url, fallback) {
  try {
    const params = new URL(url, window.location.origin).searchParams;
    const error = params.get("error");
    if (params.get("code") === "account_restricted") {
      return "This account is restricted. Please contact Kisan Gaurav support.";
    }
    if (error) return fallback;
  } catch {
    return "Authentication service returned an invalid response.";
  }
  return null;
}

function canonicalCallbackUrl() {
  const canonicalOrigin = import.meta.env.VITE_CANONICAL_ORIGIN || window.location.origin.replace("://www.", "://");
  return new URL(`${window.location.pathname}${window.location.search}${window.location.hash}`, canonicalOrigin).toString();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshSession = useCallback(async () => {
    let nextUser;
    try { const session = await apiFetch("/api/auth/session"); nextUser = session?.user?.id ? session.user : null; } catch { nextUser = null; }
    setUser(nextUser);
    setLoading(false);
    return nextUser;
  }, []);
  useEffect(() => {
    let active = true;
    apiFetch("/api/auth/session").then((session) => { if (active) setUser(session?.user?.id ? session.user : null); }).catch(() => { if (active) setUser(null); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const credentialsSignIn = useCallback(async (email, password, rememberMe = false) => {
    const { csrfToken } = await authCsrf();
    const redirectUrl = await postAuthAction("/api/auth/callback/credentials", {
      csrfToken, email, password, rememberMe: rememberMe ? "1" : "0", callbackUrl: canonicalCallbackUrl(),
    });
    const error = authErrorFrom(redirectUrl, "Unable to sign in. Check your credentials, verify your email, or wait 15 minutes if your account is locked.");
    if (error) throw new Error(error);
    if (!(await refreshSession())) throw new Error("Sign-in did not create a valid session.");
  }, [refreshSession]);
  const signInGoogle = useCallback(async () => {
    const { csrfToken } = await authCsrf();
    const redirectUrl = await postAuthAction("/api/auth/signin/google", { csrfToken, callbackUrl: canonicalCallbackUrl() });
    const error = authErrorFrom(redirectUrl, "Google sign-in is unavailable.");
    if (error) throw new Error(error);
    window.location.assign(redirectUrl);
  }, []);
  const signUpEmail = useCallback(({ firstName, lastName, email, password }) => (
    apiFetch("/api/account/signup", { method: "POST", body: JSON.stringify({ firstName, lastName, email, password }) })
  ), []);
  const signOutUser = useCallback(async () => {
    const { csrfToken } = await authCsrf();
    const redirectUrl = await postAuthAction("/api/auth/signout", { csrfToken, callbackUrl: window.location.origin });
    const error = authErrorFrom(redirectUrl, "Unable to sign out.");
    if (error) throw new Error(error);
    const session = await apiFetch("/api/auth/session");
    if (session?.user?.id) throw new Error("The session could not be revoked. Please try again.");
    setUser(null);
  }, []);
  const value = useMemo(() => ({
    user, loading, configured: true,
    signInEmail: credentialsSignIn,
    signUpEmail,
    signInGoogle,
    forgotPassword: (email) => apiFetch("/api/account/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
    resetPassword: (token, password) => apiFetch("/api/account/reset-password", { method: "POST", body: JSON.stringify({ token, password }) }),
    verifyEmail: (token) => apiFetch("/api/account/verify-email", { method: "POST", body: JSON.stringify({ token }) }),
    signOutUser,
    refreshSession,
  }), [credentialsSignIn, loading, refreshSession, signInGoogle, signOutUser, signUpEmail, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
