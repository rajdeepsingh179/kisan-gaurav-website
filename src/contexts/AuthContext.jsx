import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile } from "firebase/auth";

import { auth, isFirebaseConfigured } from "../firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!auth) return undefined;
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    configured: isFirebaseConfigured,
    signInEmail: (email, password) => {
      if (!auth) throw new Error("Firebase is not configured. Add the VITE_FIREBASE_* environment values.");
      return signInWithEmailAndPassword(auth, email, password);
    },
    signUpEmail: async ({ email, password, displayName }) => {
      if (!auth) throw new Error("Firebase is not configured. Add the VITE_FIREBASE_* environment values.");
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName });
      return credential;
    },
    signInGoogle: () => {
      if (!auth) throw new Error("Firebase is not configured. Add the VITE_FIREBASE_* environment values.");
      return signInWithPopup(auth, new GoogleAuthProvider());
    },
    signOutUser: () => auth ? signOut(auth) : Promise.resolve(),
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
