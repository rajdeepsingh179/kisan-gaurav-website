import { createContext, useContext, useEffect, useState } from "react";
import { API_BASE_URL, apiFetch, authCsrf } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshSession = async () => {
    try { const session = await apiFetch("/api/auth/session"); setUser(session?.user?.id ? session.user : null); } catch { setUser(null); }
    setLoading(false);
  };
  useEffect(() => {
    let active = true;
    apiFetch("/api/auth/session").then((session) => { if (active) setUser(session?.user?.id ? session.user : null); }).catch(() => { if (active) setUser(null); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const credentialsSignIn = async (email, password) => {
    const { csrfToken } = await authCsrf();
    const form = new URLSearchParams({ csrfToken, email, password, redirect: "false", callbackUrl: window.location.href });
    const response = await fetch(`${API_BASE_URL}/api/auth/callback/credentials`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
    if (!response.ok) throw new Error("Email or password is incorrect.");
    await refreshSession();
  };
  const value = {
    user, loading, configured: true,
    signInEmail: credentialsSignIn,
    signUpEmail: async ({ email, password, displayName, mobile }) => {
      await apiFetch("/api/account/signup", { method: "POST", body: JSON.stringify({ email, password, name: displayName, mobile }) });
      return credentialsSignIn(email, password);
    },
    signInGoogle: async () => {
      const { csrfToken } = await authCsrf();
      const form = document.createElement("form");
      form.method = "POST"; form.action = `${API_BASE_URL}/api/auth/signin/google`;
      for (const [name, value] of Object.entries({ csrfToken, callbackUrl: window.location.href })) { const input = document.createElement("input"); input.type = "hidden"; input.name = name; input.value = value; form.appendChild(input); }
      document.body.appendChild(form); form.submit();
    },
    forgotPassword: (email) => apiFetch("/api/account/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
    resetPassword: (token, password) => apiFetch("/api/account/reset-password", { method: "POST", body: JSON.stringify({ token, password }) }),
    signOutUser: async () => {
      const { csrfToken } = await authCsrf();
      await fetch(`${API_BASE_URL}/api/auth/signout`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ csrfToken, callbackUrl: window.location.origin }) });
      setUser(null);
    },
    refreshSession,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
