import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "../firebase";
import { useAuth } from "./AuthContext";

const CommerceContext = createContext(null);
const readLocal = (key, fallback) => {
  try { return JSON.parse(window.localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
};

export function CommerceProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(() => readLocal("kg-cart", []));
  const [wishlist, setWishlist] = useState(() => readLocal("kg-wishlist", []));

  useEffect(() => { window.localStorage.setItem("kg-cart", JSON.stringify(cart)); }, [cart]);
  useEffect(() => { window.localStorage.setItem("kg-wishlist", JSON.stringify(wishlist)); }, [wishlist]);

  useEffect(() => {
    if (!user || !db) return;
    const ref = doc(db, "customers", user.uid, "commerce", "state");
    getDoc(ref).then((snapshot) => {
      if (!snapshot.exists()) {
        return setDoc(ref, { cart, wishlist, updatedAt: serverTimestamp() }, { merge: true });
      }
      const data = snapshot.data();
      setCart((current) => data.cart?.length ? data.cart : current);
      setWishlist((current) => data.wishlist?.length ? data.wishlist : current);
    }).catch(() => {});
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user || !db) return;
    const timer = window.setTimeout(() => {
      setDoc(doc(db, "customers", user.uid, "commerce", "state"), { cart, wishlist, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
    }, 500);
    return () => window.clearTimeout(timer);
  }, [cart, user, wishlist]);

  const value = useMemo(() => ({
    cart,
    wishlist,
    cartCount: cart.reduce((total, item) => total + item.quantity, 0),
    addToCart(product, variant, quantity = 1) {
      const key = `${product.slug}:${variant}`;
      setCart((current) => {
        const existing = current.find((item) => item.key === key);
        if (existing) return current.map((item) => item.key === key ? { ...item, quantity: Math.min(10, item.quantity + quantity) } : item);
        return [...current, { key, slug: product.slug, name: product.name, image: product.image, variant, price: product.price + product.variants.indexOf(variant) * (product.category === "gifts" ? 500 : 300), quantity }];
      });
    },
    removeFromCart(key) { setCart((current) => current.filter((item) => item.key !== key)); },
    updateQuantity(key, quantity) { setCart((current) => current.map((item) => item.key === key ? { ...item, quantity: Math.max(1, Math.min(10, quantity)) } : item)); },
    clearCart() { setCart([]); },
    toggleWishlist(slug) { setWishlist((current) => current.includes(slug) ? current.filter((value) => value !== slug) : [...current, slug]); },
  }), [cart, wishlist]);

  return <CommerceContext.Provider value={value}>{children}</CommerceContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCommerce() {
  const context = useContext(CommerceContext);
  if (!context) throw new Error("useCommerce must be used within CommerceProvider");
  return context;
}
