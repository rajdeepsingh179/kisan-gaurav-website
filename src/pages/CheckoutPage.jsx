import { CreditCard, Lock } from "lucide-react";
import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCommerce } from "../contexts/CommerceContext";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { createRazorpayPayment, getCheckoutQuote, loadRazorpayCheckout, verifyRazorpayPayment } from "../services/orderService";

export default function CheckoutPage() {
  const { user } = useAuth();
  const { cart, clearCart } = useCommerce();
  const navigate = useNavigate();
  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState(null);
  const [serverQuote, setServerQuote] = useState(null);
  const [shippingMethod, setShippingMethod] = useState("standard");
  const [status, setStatus] = useState("");
  useDocumentTitle("Checkout");

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (serverQuote) {
      return {
        subtotal: Number(serverQuote.subtotalPaise) / 100,
        discount: Number(serverQuote.discountPaise) / 100,
        shipping: Number(serverQuote.shippingPaise) / 100,
        tax: Number(serverQuote.taxPaise) / 100,
        total: Number(serverQuote.totalPaise) / 100,
      };
    }
    const shipping = shippingMethod === "express" ? 149 : subtotal >= 999 ? 0 : 79;
    const tax = Math.round((subtotal + shipping) * 0.05);
    return { subtotal, discount: 0, shipping, tax, total: Math.round(subtotal + shipping + tax) };
  }, [cart, serverQuote, shippingMethod]);

  if (!user) return <Navigate replace to="/account?auth=signin&returnTo=%2Fcheckout" />;
  if (!cart.length) return <Navigate replace to="/cart" />;

  const quotePayload = (code = couponCode) => ({ items: cart, couponCode: code, shippingMethod });
  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setStatus("Validating coupon…");
    try {
      const quote = await getCheckoutQuote(quotePayload(code));
      setCouponCode(code);
      setServerQuote(quote);
      setStatus("Coupon applied.");
    } catch (error) {
      setCouponCode(null);
      setServerQuote(null);
      setStatus(error.message);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setStatus("Opening secure payment…");
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const payload = {
      customer: { name: user.name, email: user.email, phone: form.phone },
      address: { line1: form.line1, line2: form.line2, city: form.city, state: form.state, pincode: form.pincode },
      items: cart,
      couponCode,
      paymentMethod: "razorpay",
      shippingMethod,
      saveAddress: form.saveAddress === "on",
    };
    try {
      await loadRazorpayCheckout();
      const razorOrder = await createRazorpayPayment(payload);
      new window.Razorpay({
        key: razorOrder.keyId,
        amount: razorOrder.amount,
        currency: "INR",
        name: "Kisan Gaurav",
        order_id: razorOrder.id,
        prefill: { name: user.name, email: user.email, contact: form.phone },
        config: {
          display: {
            blocks: {
              online: {
                name: "Pay Online",
                instruments: [{ method: "upi" }, { method: "card" }, { method: "netbanking" }],
              },
            },
            sequence: ["block.online"],
            preferences: { show_default_blocks: false },
          },
        },
        modal: { ondismiss: () => setStatus("Payment was not completed. No order was created.") },
        handler: async (response) => {
          try {
            const verified = await verifyRazorpayPayment(response);
            clearCart();
            navigate(`/order-success/${verified.id}`);
          } catch (error) { setStatus(error.message); }
        },
      }).open();
      setStatus("");
    } catch (error) { setStatus(error.message); }
  };

  return (
    <div className="page-shell checkout-page">
      <div className="checkout-intro"><p className="eyebrow">Secure checkout</p><h1>Welcome back</h1><span><Lock size={13} /> Verified account · Online payment only</span></div>
      <form className="checkout-layout" onSubmit={submit}>
        <div className="checkout-form">
          <section><h2>Contact</h2><div className="form-grid"><label>Full name<input name="name" value={user.name || ""} readOnly /></label><label>Email<input name="email" type="email" value={user.email || ""} readOnly /></label><label>Phone<input name="phone" type="tel" required /></label></div></section>
          <section><h2>Shipping address</h2><div className="form-grid"><label className="form-wide">Address line 1<input name="line1" required /></label><label className="form-wide">Address line 2<input name="line2" /></label><label>City<input name="city" required /></label><label>State<input name="state" required /></label><label>PIN code<input name="pincode" pattern="[0-9]{6}" required /></label></div><label className="save-address"><input type="checkbox" name="saveAddress" /> Save this address to my account</label></section>
          <section><h2>Shipping method</h2><label className={`payment-option ${shippingMethod === "standard" ? "is-active" : ""}`}><input type="radio" checked={shippingMethod === "standard"} onChange={() => { setShippingMethod("standard"); setServerQuote(null); }} /> Standard · 3–6 business days <span>₹79 / Free over ₹999</span></label><label className={`payment-option ${shippingMethod === "express" ? "is-active" : ""}`}><input type="radio" checked={shippingMethod === "express"} onChange={() => { setShippingMethod("express"); setServerQuote(null); }} /> Express · 1–3 business days <span>₹149</span></label></section>
          <section><h2>Payment</h2><div className="payment-option is-active"><CreditCard size={17} /> Razorpay · UPI, credit/debit cards and net banking</div><p>Orders are created only after Razorpay confirms a successful online payment.</p></section>
        </div>
        <aside className="order-summary checkout-summary"><h2>Order summary</h2>{cart.map((item) => <div className="summary-item" key={item.key}><img src={item.image} alt="" /><span>{item.name}<small>{item.variant} × {item.quantity}</small></span><strong>₹{(item.price * item.quantity).toLocaleString("en-IN")}</strong></div>)}<div className="coupon-row"><input value={couponInput} onChange={(event) => setCouponInput(event.target.value)} placeholder="Coupon code" /><button type="button" onClick={applyCoupon}>Apply</button></div><div><span>Subtotal</span><strong>₹{totals.subtotal.toLocaleString("en-IN")}</strong></div>{totals.discount ? <div><span>Discount</span><strong>−₹{totals.discount.toLocaleString("en-IN")}</strong></div> : null}<div><span>Shipping</span><strong>{totals.shipping ? `₹${totals.shipping}` : "Free"}</strong></div><div><span>GST (5%)</span><strong>₹{totals.tax.toLocaleString("en-IN")}</strong></div><footer><span>Total</span><strong>₹{totals.total.toLocaleString("en-IN")}</strong></footer><button className="checkout-button" type="submit">Pay securely with Razorpay</button>{status ? <p className="checkout-status" role="status">{status}</p> : null}</aside>
      </form>
    </div>
  );
}
