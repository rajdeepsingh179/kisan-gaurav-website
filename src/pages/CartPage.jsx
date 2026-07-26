import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useCommerce } from "../contexts/CommerceContext";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity } = useCommerce();
  useDocumentTitle("Shopping Cart");
  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  return (
    <div className="page-shell commerce-page">
      <section className="commerce-heading"><p className="eyebrow">Your selection</p><h1>Shopping cart</h1><span>{cart.length} {cart.length === 1 ? "item" : "items"}</span></section>
      {!cart.length ? <div className="commerce-empty"><ShoppingBag size={35} /><h2>Your cart is waiting</h2><p>Explore thoughtful pantry staples and gifts.</p><Link className="button button--cream" to="/shop">Continue shopping <ArrowRight size={16} /></Link></div> : (
        <div className="cart-layout">
          <div className="cart-list">{cart.map((item) => (
            <article key={item.key}><img src={item.image} alt="" /><div><Link to={`/shop/${item.slug}`}>{item.name}</Link><span>{item.variant}</span><strong>₹{item.price.toLocaleString("en-IN")}</strong></div><div className="quantity-selector"><button onClick={() => updateQuantity(item.key, item.quantity - 1)} type="button"><Minus size={14} /></button><output>{item.quantity}</output><button onClick={() => updateQuantity(item.key, item.quantity + 1)} type="button"><Plus size={14} /></button></div><button className="cart-remove" onClick={() => removeFromCart(item.key)} type="button" aria-label={`Remove ${item.name}`}><Trash2 size={17} /></button></article>
          ))}</div>
          <aside className="order-summary"><h2>Order summary</h2><div><span>Subtotal</span><strong>₹{subtotal.toLocaleString("en-IN")}</strong></div><div><span>Shipping</span><span>Calculated at checkout</span></div><div><span>Taxes</span><span>Calculated at checkout</span></div><footer><span>Estimated total</span><strong>₹{subtotal.toLocaleString("en-IN")}</strong></footer><Link className="checkout-button" to="/checkout">Proceed to checkout <ArrowRight size={16} /></Link><small>Guest and signed-in checkout available</small></aside>
        </div>
      )}
    </div>
  );
}
