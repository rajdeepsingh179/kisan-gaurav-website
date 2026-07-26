import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/api";
import { useAuth } from "./AuthContext";

const CommerceContext = createContext(null);
const readLocal = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };

export function CommerceProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(() => readLocal("kg-cart", []));
  const [wishlist, setWishlist] = useState(() => readLocal("kg-wishlist", []));
  const [cartOpen, setCartOpen] = useState(false);
  useEffect(() => { localStorage.setItem("kg-cart", JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem("kg-wishlist", JSON.stringify(wishlist)); }, [wishlist]);
  useEffect(() => {
    if (!user) return;
    Promise.all([apiFetch("/api/customer-state/cart"), apiFetch("/api/customer-state/wishlist")]).then(([savedCart, savedWishlist]) => {
      if (savedCart.length) setCart(savedCart);
      if (savedWishlist.length) setWishlist(savedWishlist);
    }).catch(() => {});
  }, [user]);
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => Promise.all([
      apiFetch("/api/customer-state/cart", { method: "PUT", body: JSON.stringify(cart) }),
      apiFetch("/api/customer-state/wishlist", { method: "PUT", body: JSON.stringify(wishlist) }),
    ]).catch(() => {}), 500);
    return () => clearTimeout(timer);
  }, [cart, user, wishlist]);
  const value = useMemo(() => ({
    cart, wishlist, cartOpen, setCartOpen,
    cartCount: cart.reduce((total, item) => total + item.quantity, 0),
    addToCart(product, variant, quantity = 1) {
      const key = `${product.slug}:${variant}`;
      setCart((current) => {
        const existing = current.find((item) => item.key === key);
        if (existing) return current.map((item) => item.key === key ? { ...item, quantity: Math.min(10, item.quantity + quantity) } : item);
        return [...current, { key, slug: product.slug, name: product.name, image: product.image, variant, price: product.price + product.variants.indexOf(variant) * (product.category === "gifts" ? 500 : 300), quantity }];
      });
      setCartOpen(true);
    },
    removeFromCart: (key) => setCart((current) => current.filter((item) => item.key !== key)),
    updateQuantity: (key, quantity) => setCart((current) => current.map((item) => item.key === key ? { ...item, quantity: Math.max(1, Math.min(10, quantity)) } : item)),
    clearCart: () => setCart([]),
    toggleWishlist: (slug) => setWishlist((current) => current.includes(slug) ? current.filter((value) => value !== slug) : [...current, slug]),
    moveWishlistToCart(product) {
      const variant = product.variants[0];
      const key = `${product.slug}:${variant}`;
      setCart((current) => current.some((item) => item.key === key) ? current.map((item) => item.key === key ? { ...item, quantity: Math.min(10, item.quantity + 1) } : item) : [...current, { key, slug: product.slug, name: product.name, image: product.image, variant, price: product.price, quantity: 1 }]);
      setWishlist((current) => current.filter((slug) => slug !== product.slug));
      setCartOpen(true);
    },
  }), [cart, cartOpen, wishlist]);
  return <CommerceContext.Provider value={value}>{children}</CommerceContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCommerce() {
  const context = useContext(CommerceContext);
  if (!context) throw new Error("useCommerce must be used within CommerceProvider");
  return context;
}
