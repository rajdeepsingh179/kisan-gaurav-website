import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useCommerce } from "../../contexts/CommerceContext";

export default function CartDrawer() {
  const { cart, cartOpen, removeFromCart, setCartOpen, updateQuantity } = useCommerce();
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return (
    <div className={`cart-overlay ${cartOpen ? "is-open" : ""}`} onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}>
      <aside className="cart-drawer" aria-label="Shopping cart" aria-hidden={!cartOpen}>
        <header><div><ShoppingBag size={18} /><strong>Your cart</strong><span>{cart.length} items</span></div><button onClick={() => setCartOpen(false)} aria-label="Close cart"><X /></button></header>
        <div className="cart-drawer__items">
          {cart.length ? cart.map((item) => <article key={item.key}><img src={item.image} alt="" /><div><strong>{item.name}</strong><span>{item.variant}</span><b>₹{item.price.toLocaleString("en-IN")}</b><div className="quantity-selector"><button onClick={() => updateQuantity(item.key,item.quantity-1)}><Minus size={12} /></button><output>{item.quantity}</output><button onClick={() => updateQuantity(item.key,item.quantity+1)}><Plus size={12} /></button></div></div><button onClick={() => removeFromCart(item.key)} aria-label={`Remove ${item.name}`}><Trash2 size={15} /></button></article>) : <div className="cart-drawer__empty"><ShoppingBag /><p>Your cart is empty.</p></div>}
        </div>
        {cart.length ? <footer><div><span>Subtotal</span><strong>₹{subtotal.toLocaleString("en-IN")}</strong></div><Link to="/checkout" onClick={() => setCartOpen(false)}>Checkout securely</Link><Link to="/cart" onClick={() => setCartOpen(false)}>View full cart</Link></footer> : null}
      </aside>
    </div>
  );
}
