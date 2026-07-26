import { CheckCircle, CreditCard, Lock } from "lucide-react";
import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCommerce } from "../contexts/CommerceContext";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { createOrder, createRazorpayPayment, loadRazorpayCheckout, verifyRazorpayPayment } from "../services/orderService";

const coupons = { GAURAV10: { type: "percent", value: 10 }, WELCOME150: { type: "flat", value: 150 } };

export default function CheckoutPage() {
  const { user } = useAuth();
  const { cart, clearCart } = useCommerce();
  const navigate = useNavigate();
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState(null);
  const [payment, setPayment] = useState("cod");
  const [shippingMethod, setShippingMethod] = useState("standard");
  const [status, setStatus] = useState("");
  useDocumentTitle("Checkout");
  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discount = coupon ? Math.min(coupon.type === "percent" ? subtotal * coupon.value / 100 : coupon.value, subtotal) : 0;
    const shipping = shippingMethod === "express" ? 149 : subtotal - discount >= 999 ? 0 : 79;
    const tax = Math.round((subtotal - discount + shipping) * .05);
    return { subtotal, discount, shipping, tax, total: Math.round(subtotal - discount + shipping + tax) };
  }, [cart, coupon, shippingMethod]);
  if (!cart.length) return <Navigate replace to="/cart" />;

  const submit = async (event) => {
    event.preventDefault();
    setStatus("Processing your order…");
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const payload = { guest: !user, customer: { name: form.name, email: form.email, phone: form.phone }, address: { line1: form.line1, line2: form.line2, city: form.city, state: form.state, pincode: form.pincode }, items: cart, couponCode: coupon ? couponInput.toUpperCase() : null, paymentMethod: payment, shippingMethod, saveAddress: form.saveAddress === "on" };
    try {
      if (payment === "razorpay") {
        await loadRazorpayCheckout();
        const razorOrder = await createRazorpayPayment(payload);
        new window.Razorpay({ key: razorOrder.keyId, amount: razorOrder.amount, currency: "INR", name: "Kisan Gaurav", order_id: razorOrder.id, prefill: payload.customer, handler: async (response) => { const verified = await verifyRazorpayPayment(response); clearCart(); navigate(`/order-success/${verified.id}`); } }).open();
        setStatus("");
      } else {
        const order = await createOrder(payload);
        clearCart();
        navigate(`/order-success/${order.id}`);
      }
    } catch (error) { setStatus(error.message); }
  };
  return (
    <div className="page-shell checkout-page">
      <div className="checkout-intro"><p className="eyebrow">Secure checkout</p><h1>{user ? "Welcome back" : "Guest checkout"}</h1><span><Lock size={13} /> Secure Auth.js session and Worker-verified totals</span></div>
      <form className="checkout-layout" onSubmit={submit}>
        <div className="checkout-form">
          <section><h2>Contact</h2><div className="form-grid"><label>Full name<input name="name" defaultValue={user?.name || ""} required /></label><label>Email<input name="email" type="email" defaultValue={user?.email || ""} required /></label><label>Phone<input name="phone" type="tel" required /></label></div></section>
          <section><h2>Shipping address</h2><div className="form-grid"><label className="form-wide">Address line 1<input name="line1" required /></label><label className="form-wide">Address line 2<input name="line2" /></label><label>City<input name="city" required /></label><label>State<input name="state" required /></label><label>PIN code<input name="pincode" pattern="[0-9]{6}" required /></label></div>{user ? <label className="save-address"><input type="checkbox" name="saveAddress" /> Save this address to my account</label> : null}</section>
          <section><h2>Shipping method</h2><label className={`payment-option ${shippingMethod === "standard" ? "is-active" : ""}`}><input type="radio" checked={shippingMethod === "standard"} onChange={() => setShippingMethod("standard")} /> Standard · 3–6 business days <span>₹79 / Free over ₹999</span></label><label className={`payment-option ${shippingMethod === "express" ? "is-active" : ""}`}><input type="radio" checked={shippingMethod === "express"} onChange={() => setShippingMethod("express")} /> Express · 1–3 business days <span>₹149</span></label></section>
          <section><h2>Payment</h2><label className={`payment-option ${payment === "cod" ? "is-active" : ""}`}><input type="radio" checked={payment === "cod"} onChange={() => setPayment("cod")} /> Cash on delivery <CheckCircle size={17} /></label><label className={`payment-option ${payment === "razorpay" ? "is-active" : ""}`}><input type="radio" checked={payment === "razorpay"} onChange={() => setPayment("razorpay")} /> Razorpay · UPI, cards and net banking <CreditCard size={17} /></label></section>
        </div>
        <aside className="order-summary checkout-summary"><h2>Order summary</h2>{cart.map((item) => <div className="summary-item" key={item.key}><img src={item.image} alt="" /><span>{item.name}<small>{item.variant} × {item.quantity}</small></span><strong>₹{(item.price * item.quantity).toLocaleString("en-IN")}</strong></div>)}<div className="coupon-row"><input value={couponInput} onChange={(event) => setCouponInput(event.target.value)} placeholder="Coupon code" /><button type="button" onClick={() => setCoupon(coupons[couponInput.toUpperCase()] || null)}>Apply</button></div><div><span>Subtotal</span><strong>₹{totals.subtotal.toLocaleString("en-IN")}</strong></div>{totals.discount ? <div><span>Discount</span><strong>−₹{totals.discount.toLocaleString("en-IN")}</strong></div> : null}<div><span>Shipping</span><strong>{totals.shipping ? `₹${totals.shipping}` : "Free"}</strong></div><div><span>GST (5%)</span><strong>₹{totals.tax}</strong></div><footer><span>Total</span><strong>₹{totals.total.toLocaleString("en-IN")}</strong></footer><button className="checkout-button" type="submit">Place order securely</button>{status ? <p className="checkout-status" role="status">{status}</p> : null}</aside>
      </form>
    </div>
  );
}
