import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useCommerce } from "../../contexts/CommerceContext";

const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function CartDrawer() {
  const { cart, cartOpen, removeFromCart, setCartOpen, updateQuantity } = useCommerce();
  const drawerRef = useRef(null);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  useEffect(() => {
    if (!cartOpen) return undefined;
    const previouslyFocused = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector(focusableSelector)?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setCartOpen(false);
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const elements = [...drawerRef.current.querySelectorAll(focusableSelector)];
      const first = elements[0];
      const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [cartOpen, setCartOpen]);

  return (
    <div className={`cart-overlay ${cartOpen ? "is-open" : ""}`} onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}>
      <aside ref={drawerRef} className="cart-drawer" aria-label="Shopping cart" aria-hidden={!cartOpen} aria-modal="true" role="dialog">
        <header><div><ShoppingBag size={18} aria-hidden="true" /><strong>Your cart</strong><span>{cart.length} items</span></div><button type="button" onClick={() => setCartOpen(false)} aria-label="Close cart"><X aria-hidden="true" /></button></header>
        <div className="cart-drawer__items">
          {cart.length ? cart.map((item) => <article key={item.key}><img src={item.image} alt="" loading="lazy" decoding="async" /><div><strong>{item.name}</strong><span>{item.variant}</span><b>₹{item.price.toLocaleString("en-IN")}</b><div className="quantity-selector"><button type="button" onClick={() => updateQuantity(item.key,item.quantity-1)} aria-label={`Decrease quantity of ${item.name}`}><Minus size={12} aria-hidden="true" /></button><output aria-live="polite" aria-label={`${item.name} quantity`}>{item.quantity}</output><button type="button" onClick={() => updateQuantity(item.key,item.quantity+1)} aria-label={`Increase quantity of ${item.name}`}><Plus size={12} aria-hidden="true" /></button></div></div><button type="button" onClick={() => removeFromCart(item.key)} aria-label={`Remove ${item.name}`}><Trash2 size={15} aria-hidden="true" /></button></article>) : <div className="cart-drawer__empty"><ShoppingBag aria-hidden="true" /><p>Your cart is empty.</p></div>}
        </div>
        {cart.length ? <footer><div><span>Subtotal</span><strong>₹{subtotal.toLocaleString("en-IN")}</strong></div><Link to="/checkout" onClick={() => setCartOpen(false)}>Checkout securely</Link><Link to="/cart" onClick={() => setCartOpen(false)}>View full cart</Link></footer> : null}
      </aside>
    </div>
  );
}
