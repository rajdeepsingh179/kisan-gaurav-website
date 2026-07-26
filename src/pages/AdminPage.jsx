import { BarChart3, Boxes, ClipboardList, Image, LayoutDashboard, MessageSquare, Package, Settings, ShoppingBasket, Tags, TicketPercent, Users } from "lucide-react";
import { useState } from "react";
import { categories, products } from "../data/catalog";
import { getLocalOrders } from "../services/orderService";
import useDocumentTitle from "../hooks/useDocumentTitle";

const sections = [
  ["dashboard", LayoutDashboard, "Dashboard"], ["products", Package, "Products"], ["categories", Tags, "Categories"], ["inventory", Boxes, "Inventory"], ["orders", ClipboardList, "Orders"], ["coupons", TicketPercent, "Coupons"], ["customers", Users, "Customers"], ["analytics", BarChart3, "Analytics"], ["banners", Image, "Banner Management"], ["reviews", MessageSquare, "Reviews"], ["settings", Settings, "Settings"],
];

export default function AdminPage() {
  const [active, setActive] = useState("dashboard");
  const orders = getLocalOrders();
  useDocumentTitle("Admin");
  return (
    <div className="admin-shell">
      <aside><div><ShoppingBasket /> <strong>Kisan Gaurav</strong><small>Commerce Admin</small></div>{sections.map(([id, Icon, label]) => <button className={active === id ? "is-active" : ""} key={id} onClick={() => setActive(id)}><Icon size={16} />{label}</button>)}</aside>
      <main><header><div><p className="eyebrow">Administration</p><h1>{sections.find(([id]) => id === active)?.[2]}</h1></div><span>Firebase-ready workspace</span></header>
        {active === "dashboard" && <><div className="admin-stats"><article><small>Products</small><strong>{products.length}</strong><span>Across {categories.length} categories</span></article><article><small>Orders</small><strong>{orders.length}</strong><span>Current workspace</span></article><article><small>Inventory alerts</small><strong>3</strong><span>Requires attention</span></article><article><small>Average rating</small><strong>4.7</strong><span>Customer reviews</span></article></div><div className="admin-chart"><h2>Commerce overview</h2><div>{[45,62,48,78,68,88,73,92,84,96,86,100].map((value, index) => <i key={index} style={{ height: `${value}%` }} />)}</div></div></>}
        {active === "products" && <AdminTable title="Product catalogue" headers={["Product","Category","Price","Rating"]} rows={products.map((item) => [item.name, item.category, `₹${item.price}`, item.rating])} />}
        {active === "categories" && <AdminTable title="Categories" headers={["Name","Products","Status"]} rows={categories.map((item) => [item.name, products.filter((product) => product.category === item.id).length, "Active"])} />}
        {active === "inventory" && <AdminTable title="Inventory" headers={["SKU","Product","Stock","Status"]} rows={products.slice(0,10).map((item,index) => [`KG-${String(index+1).padStart(3,"0")}`, item.name, 18 + index * 7, index < 3 ? "Low stock" : "In stock"])} />}
        {active === "orders" && <AdminTable title="Orders" headers={["Order","Customer","Total","Status"]} rows={orders.map((item) => [item.id, item.customer.name, `₹${item.totals.total}`, item.status])} />}
        {active === "coupons" && <AdminTable title="Coupons" headers={["Code","Discount","Usage","Status"]} rows={[["GAURAV10","10%","24","Active"],["WELCOME150","₹150","18","Active"]]} />}
        {active === "customers" && <AdminTable title="Customers" headers={["Customer","Email","Orders","Status"]} rows={orders.map((item) => [item.customer.name,item.customer.email,1,"Active"])} />}
        {active === "analytics" && <div className="admin-chart"><h2>Revenue analytics</h2><div>{[35,55,42,68,74,80,67,88,92,85,96,100].map((value,index)=><i key={index} style={{height:`${value}%`}} />)}</div></div>}
        {active === "banners" && <AdminPlaceholder title="Banner management" copy="Create, schedule and publish homepage campaign banners. Images are stored in Firebase Storage." />}
        {active === "reviews" && <AdminTable title="Review moderation" headers={["Product","Rating","Review","Status"]} rows={products.slice(0,5).map((item) => [item.name,item.rating,"Excellent quality and presentation","Published"])} />}
        {active === "settings" && <AdminPlaceholder title="Commerce settings" copy="Configure shipping zones, GST rules, Razorpay credentials, invoice details and notification preferences." />}
      </main>
    </div>
  );
}
function AdminTable({ title, headers, rows }) { return <section className="admin-table"><div><h2>{title}</h2><button>Add new</button></div><table><thead><tr>{headers.map((item)=><th key={item}>{item}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row,index)=><tr key={index}>{row.map((cell,i)=><td key={i}>{cell}</td>)}</tr>) : <tr><td colSpan={headers.length}>No records yet</td></tr>}</tbody></table></section>; }
function AdminPlaceholder({ title, copy }) { return <section className="admin-placeholder"><h2>{title}</h2><p>{copy}</p><button>Configure</button></section>; }
