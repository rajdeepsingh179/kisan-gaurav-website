import { Download, Heart, MapPin, Package, RotateCcw, User } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ProductCard from "../components/storefront/ProductCard";
import { useAuth } from "../contexts/AuthContext";
import { useCommerce } from "../contexts/CommerceContext";
import { productBySlug } from "../data/catalog";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { getLocalOrders } from "../services/orderService";

const tabs = [["profile", User, "Profile"], ["orders", Package, "Orders"], ["addresses", MapPin, "Addresses"], ["wishlist", Heart, "Wishlist"]];

export default function AccountPage() {
  const { user, signOutUser } = useAuth();
  const { wishlist } = useCommerce();
  const [params] = useSearchParams();
  const [active, setActive] = useState(params.get("tab") || "orders");
  const [addresses, setAddresses] = useState(() => JSON.parse(localStorage.getItem("kg-addresses") || "[]"));
  const orders = getLocalOrders();
  useDocumentTitle("My Account");
  if (!user) return <div className="commerce-empty"><User size={36} /><h2>Sign in to your account</h2><p>Access saved addresses, wishlist and order history.</p><Link className="button button--cream" to="/shop">Continue shopping</Link></div>;
  const saveAddress = (event) => {
    event.preventDefault();
    const next = [...addresses, { id: Date.now(), ...Object.fromEntries(new FormData(event.currentTarget)) }];
    setAddresses(next); localStorage.setItem("kg-addresses", JSON.stringify(next)); event.currentTarget.reset();
  };
  return (
    <div className="account-page">
      <aside><p className="eyebrow">My account</p><h2>{user.displayName || "Kisan Gaurav customer"}</h2><span>{user.email}</span>{tabs.map(([id, Icon, label]) => <button className={active === id ? "is-active" : ""} key={id} onClick={() => setActive(id)}><Icon size={16} />{label}</button>)}<button onClick={signOutUser}>Sign out</button></aside>
      <main>
        {active === "profile" && <section className="account-section"><h1>Profile</h1><div className="profile-card"><User /><div><strong>{user.displayName || "Customer"}</strong><span>{user.email}</span><small>Firebase account · {user.providerData?.[0]?.providerId}</small></div></div></section>}
        {active === "orders" && <section className="account-section"><h1>Order history</h1>{orders.length ? <div className="orders-list">{orders.map((order) => <article key={order.id}><header><div><small>Order</small><strong>#{order.id}</strong></div><div><small>Placed</small><span>{new Date(order.createdAt).toLocaleDateString("en-IN")}</span></div><b>{order.status}</b></header><div className="tracking-line"><i className="is-done" /><i className="is-done" /><i /><span>Confirmed</span><span>Processing</span><span>Delivered</span></div><footer><strong>₹{order.totals.total.toLocaleString("en-IN")}</strong><button onClick={() => window.print()}><Download size={14} /> Invoice</button><button><Package size={14} /> Track</button><button><RotateCcw size={14} /> Request return</button></footer></article>)}</div> : <p>No orders yet. Orders placed in this browser will appear here.</p>}</section>}
        {active === "addresses" && <section className="account-section"><h1>Address management</h1><div className="address-grid">{addresses.map((address) => <article key={address.id}><MapPin /><strong>{address.name}</strong><p>{address.line1}, {address.city}, {address.state} {address.pincode}</p><button onClick={() => { const next = addresses.filter((item) => item.id !== address.id); setAddresses(next); localStorage.setItem("kg-addresses", JSON.stringify(next)); }}>Remove</button></article>)}</div><form className="address-form" onSubmit={saveAddress}><input name="name" placeholder="Label (Home, Work)" required /><input name="line1" placeholder="Address" required /><input name="city" placeholder="City" required /><input name="state" placeholder="State" required /><input name="pincode" placeholder="PIN code" required /><button>Add address</button></form></section>}
        {active === "wishlist" && <section className="account-section"><h1>Wishlist</h1><div className="product-grid">{wishlist.map((slug) => productBySlug[slug]).filter(Boolean).map((item) => <ProductCard item={item} key={item.slug} />)}</div></section>}
      </main>
    </div>
  );
}
