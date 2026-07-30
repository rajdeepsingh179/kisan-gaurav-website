import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/api";
import { useAuth } from "./AuthContext";

const CommerceContext = createContext(null);
const redirectToAuthentication = () => {
  const returnTo = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/account?${new URLSearchParams({ auth: "signin", returnTo })}`);
};

export function CommerceProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [hydratedUserId, setHydratedUserId] = useState(null);
  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    Promise.all([apiFetch("/api/customer-state/cart"), apiFetch("/api/customer-state/wishlist")]).then(([savedCart, savedWishlist]) => {
      if (!active) return;
      setCart(Array.isArray(savedCart) ? savedCart : []);
      setWishlist(Array.isArray(savedWishlist) ? savedWishlist : []);
      setHydratedUserId(user.id);
    }).catch(() => { if (active) setHydratedUserId(user.id); });
    return () => { active = false; };
  }, [user]);
  useEffect(() => {
    if (!user || hydratedUserId !== user.id) return undefined;
    const timer = setTimeout(() => Promise.all([
      apiFetch("/api/customer-state/cart", { method: "PUT", body: JSON.stringify(cart) }),
      apiFetch("/api/customer-state/wishlist", { method: "PUT", body: JSON.stringify(wishlist) }),
    ]).catch(() => {}), 500);
    return () => clearTimeout(timer);
  }, [cart, hydratedUserId, user, wishlist]);
  const visibleCart = useMemo(() => user && hydratedUserId === user.id ? cart : [], [cart, hydratedUserId, user]);
  const visibleWishlist = useMemo(() => user && hydratedUserId === user.id ? wishlist : [], [hydratedUserId, user, wishlist]);
  const value = useMemo(() => ({
    cart: visibleCart, wishlist: visibleWishlist, cartOpen: Boolean(user && cartOpen),
    setCartOpen(next) {
      if (next && !user) { redirectToAuthentication(); return; }
      setCartOpen(next);
    },
    cartCount: visibleCart.reduce((total, item) => total + item.quantity, 0),
    addToCart(product, variant, quantity = 1) {
      if (!user) { redirectToAuthentication(); return false; }
      const key = `${product.slug}:${variant}`;
      setCart((current) => {
        const existing = current.find((item) => item.key === key);
        if (existing) return current.map((item) => item.key === key ? { ...item, quantity: Math.min(10, item.quantity + quantity) } : item);
        const variantRecord = product.variantDetails?.[variant];
        const price = variantRecord ? Number(variantRecord.festival_price_paise || variantRecord.price_paise || 0) / 100 : product.price;
        return [...current, { key, slug: product.slug, name: product.name, image: product.image, variant, price, quantity }];
      });
      setCartOpen(true);
      return true;
    },
    removeFromCart: (key) => user && setCart((current) => current.filter((item) => item.key !== key)),
    updateQuantity: (key, quantity) => user && setCart((current) => current.map((item) => item.key === key ? { ...item, quantity: Math.max(1, Math.min(10, quantity)) } : item)),
    clearCart: () => setCart([]),
    toggleWishlist(slug) {
      if (!user) { redirectToAuthentication(); return false; }
      setWishlist((current) => current.includes(slug) ? current.filter((value) => value !== slug) : [...current, slug]);
      return true;
    },
    moveWishlistToCart(product) {
      if (!user) { redirectToAuthentication(); return false; }
      const variant = product.variants[0];
      const key = `${product.slug}:${variant}`;
      setCart((current) => current.some((item) => item.key === key) ? current.map((item) => item.key === key ? { ...item, quantity: Math.min(10, item.quantity + 1) } : item) : [...current, { key, slug: product.slug, name: product.name, image: product.image, variant, price: product.price, quantity: 1 }]);
      setWishlist((current) => current.filter((slug) => slug !== product.slug));
      setCartOpen(true);
      return true;
    },
  }), [cartOpen, user, visibleCart, visibleWishlist]);
  return <CommerceContext.Provider value={value}>{children}</CommerceContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCommerce() {
  const context = useContext(CommerceContext);
  if (!context) throw new Error("useCommerce must be used within CommerceProvider");
  return context;
}
