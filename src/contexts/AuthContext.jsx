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
    const error = new URL(url, window.location.origin).searchParams.get("error");
    if (error) return fallback;
  } catch {
    return "Authentication service returned an invalid response.";
  }
  return null;
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

  const credentialsSignIn = useCallback(async (email, password) => {
    const { csrfToken } = await authCsrf();
    const redirectUrl = await postAuthAction("/api/auth/callback/credentials", { csrfToken, email, password, callbackUrl: window.location.href });
    const error = authErrorFrom(redirectUrl, "Email or password is incorrect.");
    if (error) throw new Error(error);
    if (!(await refreshSession())) throw new Error("Sign-in did not create a valid session.");
  }, [refreshSession]);
  const signInGoogle = useCallback(async () => {
    const { csrfToken } = await authCsrf();
    const redirectUrl = await postAuthAction("/api/auth/signin/google", { csrfToken, callbackUrl: window.location.href });
    const error = authErrorFrom(redirectUrl, "Google sign-in is unavailable.");
    if (error) throw new Error(error);
    window.location.assign(redirectUrl);
  }, []);
  const signUpEmail = useCallback(async ({ email, password, displayName, mobile }) => {
    await apiFetch("/api/account/signup", { method: "POST", body: JSON.stringify({ email, password, name: displayName, mobile }) });
    return credentialsSignIn(email, password);
  }, [credentialsSignIn]);
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
