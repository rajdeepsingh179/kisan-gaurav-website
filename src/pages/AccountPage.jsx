import { Download, Heart, MapPin, Package, RotateCcw, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ProductCard from "../components/storefront/ProductCard";
import { useAuth } from "../contexts/AuthContext";
import { useCommerce } from "../contexts/CommerceContext";
import { useCatalog } from "../contexts/CatalogContext";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { API_BASE_URL, apiFetch } from "../services/api";
import { cancelOrder, getOrders, requestReturn } from "../services/orderService";

const tabs = [["profile", User, "Profile"], ["orders", Package, "Orders"], ["addresses", MapPin, "Addresses"], ["wishlist", Heart, "Wishlist"]];

export default function AccountPage() {
  const { productBySlug } = useCatalog();
  const { user, signOutUser } = useAuth();
  const { wishlist } = useCommerce();
  const [params] = useSearchParams();
  const [active, setActive] = useState(params.get("tab") || "orders");
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [profile, setProfile] = useState(user);
  const [message, setMessage] = useState("");
  useDocumentTitle("My Account");
  useEffect(() => {
    if (!user) return;
    Promise.all([getOrders(), apiFetch("/api/account/addresses"), apiFetch("/api/account/profile")]).then(([orderRows,addressRows,profileRow]) => { setOrders(orderRows); setAddresses(addressRows); setProfile(profileRow); }).catch((error) => setMessage(error.message));
  }, [user]);
  if (!user) return <div className="commerce-empty"><User size={36} /><h2>Sign in to your account</h2><p>Access saved addresses, wishlist and order history.</p><Link className="button button--cream" to="/shop">Continue shopping</Link></div>;
  const saveAddress = async (event) => {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const created = await apiFetch("/api/account/addresses", { method: "POST", body: JSON.stringify({ label: form.label, recipientName: form.recipientName, mobile: form.mobile, line1: form.line1, city: form.city, state: form.state, pincode: form.pincode }) });
    setAddresses((current) => [...current, { id: created.id, ...form }]); event.currentTarget.reset();
  };
  const uploadPhoto = async (event) => {
    const form = new FormData(); form.append("file", event.target.files[0]);
    const result = await apiFetch("/api/account/profile-photo", { method: "POST", body: form });
    setProfile((current) => ({ ...current, profile_photo_url: result.url }));
  };
  return (
    <div className="account-page">
      <aside aria-label="Account navigation"><p className="eyebrow">My account</p><h2>{profile?.name || user.name || "Kisan Gaurav customer"}</h2><span>{user.email}</span>{tabs.map(([tabId, Icon, label]) => <button type="button" aria-pressed={active === tabId} className={active === tabId ? "is-active" : ""} key={tabId} onClick={() => setActive(tabId)}><Icon size={16} aria-hidden="true" />{label}</button>)}<button type="button" onClick={signOutUser}>Logout</button></aside>
      <div className="account-page__content">
        {message ? <p className="account-message" role="status">{message}</p> : null}
        {active === "profile" && <section className="account-section"><h1>Profile</h1><div className="profile-card">{profile?.profile_photo_url ? <img src={profile.profile_photo_url} alt={`${profile?.name || user.name} profile`} /> : <User aria-hidden="true" />}<div><strong>{profile?.name || user.name}</strong><span>{user.email}</span><small>Auth.js account · {user.role}</small><label>Change profile photo<input type="file" accept="image/*" onChange={uploadPhoto} /></label></div></div><form className="address-form" onSubmit={async (event) => { event.preventDefault(); const data=Object.fromEntries(new FormData(event.currentTarget)); await apiFetch("/api/account/profile",{method:"PATCH",body:JSON.stringify(data)}); setProfile((current)=>({...current,...data})); }}><input aria-label="Name" autoComplete="name" name="name" defaultValue={profile?.name || ""} placeholder="Name" required /><input aria-label="Mobile number" autoComplete="tel" name="mobile" defaultValue={profile?.mobile || ""} placeholder="Mobile number" /><button type="submit">Save profile</button></form></section>}
        {active === "orders" && <section className="account-section"><h1>Order history</h1>{orders.length ? <div className="orders-list">{orders.map((order) => <article key={order.id}><header><div><small>Order</small><strong>#{order.order_number}</strong></div><div><small>Placed</small><span>{new Date(order.created_at).toLocaleDateString("en-IN")}</span></div><b>{order.status}</b></header><div className="tracking-line" aria-label={`Order status: ${order.status}`}><i className="is-done" /><i className={["packed","shipped","delivered"].includes(order.status) ? "is-done" : ""} /><i className={order.status==="delivered" ? "is-done" : ""} /><span>Confirmed</span><span>Packed & shipped</span><span>Delivered</span></div><footer><strong>₹{(order.total_paise/100).toLocaleString("en-IN")}</strong><a href={`${API_BASE_URL}/api/orders/${order.id}/invoice`}><Download size={14} aria-hidden="true" /> Invoice</a><button type="button" onClick={async()=>{await cancelOrder(order.id);setOrders((rows)=>rows.map((row)=>row.id===order.id?{...row,status:"cancelled"}:row));}}><Package size={14} aria-hidden="true" /> Cancel</button><button type="button" onClick={async()=>{const reason=window.prompt("Reason for return");if(reason)await requestReturn(order.id,reason);}}><RotateCcw size={14} aria-hidden="true" /> Return</button></footer></article>)}</div> : <p>No orders yet.</p>}</section>}
        {active === "addresses" && <section className="account-section"><h1>Saved addresses</h1><div className="address-grid">{addresses.map((address) => <article key={address.id}><MapPin aria-hidden="true" /><strong>{address.label}</strong><p>{address.line1}, {address.city}, {address.state} {address.pincode}</p><button type="button" onClick={async()=>{await apiFetch(`/api/account/addresses/${address.id}`,{method:"DELETE"});setAddresses((rows)=>rows.filter((row)=>row.id!==address.id));}}>Remove</button></article>)}</div><form aria-label="Add address" className="address-form" onSubmit={saveAddress}><input aria-label="Address label" name="label" placeholder="Label (Home, Work)" required /><input aria-label="Recipient name" autoComplete="name" name="recipientName" placeholder="Recipient name" required /><input aria-label="Mobile number" autoComplete="tel" name="mobile" placeholder="Mobile" required /><input aria-label="Street address" autoComplete="street-address" name="line1" placeholder="Address" required /><input aria-label="City" autoComplete="address-level2" name="city" placeholder="City" required /><input aria-label="State" autoComplete="address-level1" name="state" placeholder="State" required /><input aria-label="PIN code" autoComplete="postal-code" inputMode="numeric" name="pincode" placeholder="PIN code" required /><button type="submit">Add address</button></form></section>}
        {active === "wishlist" && <section className="account-section"><h1>Wishlist</h1><div className="product-grid">{wishlist.map((slug) => productBySlug[slug]).filter(Boolean).map((item) => <ProductCard item={item} key={item.slug} />)}</div></section>}
      </div>
    </div>
  );
}
