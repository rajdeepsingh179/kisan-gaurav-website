import { BarChart3, Boxes, ClipboardList, Image, LayoutDashboard, MessageSquare, Package, Settings, ShoppingBasket, Tags, TicketPercent, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { apiFetch } from "../services/api";

const sections = [["dashboard",LayoutDashboard,"Dashboard"],["products",Package,"Products"],["categories",Tags,"Categories"],["inventory",Boxes,"Inventory"],["orders",ClipboardList,"Orders"],["coupons",TicketPercent,"Coupons"],["customers",Users,"Customers"],["analytics",BarChart3,"Analytics"],["banners",Image,"Banners"],["reviews",MessageSquare,"Reviews"],["settings",Settings,"Settings"]];
const headers = {
  products:["name","category_name","active"],categories:["name","slug","active"],inventory:["sku","product_name","stock"],orders:["order_number","customer_name","status","total_paise"],coupons:["code","type","usage_count","enabled"],customers:["name","email","role"],analytics:["month","orders","revenue_paise"],banners:["title","active","sort_order"],reviews:["product_name","customer_name","rating","status"],settings:["key","value_json"],
};
export default function AdminPage() {
  const { user, loading } = useAuth();
  const [active,setActive]=useState("dashboard");
  const [data,setData]=useState(null);
  const [error,setError]=useState("");
  useDocumentTitle("Admin");
  useEffect(()=>{if(user?.role!=="admin")return;apiFetch(active==="dashboard"?"/api/admin/dashboard":`/api/admin/${active}`).then(setData).catch((reason)=>setError(reason.message));},[active,user]);
  if(loading)return <div className="commerce-empty">Checking access…</div>;
  if(!user)return <div className="commerce-empty"><Users/><h2>Admin sign in required</h2><p>Sign in with an administrator account.</p><Link to="/">Return home</Link></div>;
  if(user.role!=="admin")return <div className="commerce-empty"><Users/><h2>Access denied</h2><p>This route is restricted to the Admin role.</p><Link to="/">Return home</Link></div>;
  const rows=Array.isArray(data)?data:[];
  return <div className="admin-shell"><aside aria-label="Admin navigation"><div><ShoppingBasket aria-hidden="true"/><strong>Kisan Gaurav</strong><small>Cloudflare Commerce Admin</small></div>{sections.map(([moduleId,Icon,label])=><button type="button" aria-pressed={active===moduleId} className={active===moduleId?"is-active":""} key={moduleId} onClick={()=>setActive(moduleId)}><Icon size={16} aria-hidden="true"/>{label}</button>)}</aside><div className="admin-shell__content"><header><div><p className="eyebrow">Administration</p><h1>{sections.find(([id])=>id===active)?.[2]}</h1></div><span>D1 + R2 production workspace</span></header>{error?<p role="alert">{error}</p>:null}{active==="dashboard"&&data?<><div className="admin-stats"><article><small>Revenue</small><strong>₹{((data.revenuePaise||0)/100).toLocaleString("en-IN")}</strong><span>Paid and COD orders</span></article><article><small>Orders</small><strong>{data.orders}</strong></article><article><small>Customers</small><strong>{data.customers}</strong></article><article><small>Low stock</small><strong>{data.lowStock}</strong></article></div><AdminChart/></>:null}{active!=="dashboard"?<AdminTable title={sections.find(([id])=>id===active)?.[2]} columns={headers[active]||[]} rows={rows} module={active}/>:null}</div></div>;
}
function AdminTable({title,columns,rows,module}){return <section className="admin-table"><div><h2>{title}</h2><button type="button" onClick={()=>window.alert(`${module} editor is connected to the Worker API.`)}>Add new</button></div><table><caption className="sr-only">{title} records</caption><thead><tr>{columns.map((column)=><th scope="col" key={column}>{column.replaceAll("_"," ")}</th>)}</tr></thead><tbody>{rows.length?rows.map((row,index)=><tr key={row.id||index}>{columns.map((column)=><td key={column}>{String(row[column]??"—")}</td>)}</tr>):<tr><td colSpan={columns.length}>No records yet</td></tr>}</tbody></table></section>}
function AdminChart(){return <div className="admin-chart"><h2>Commerce overview</h2><div role="img" aria-label="Monthly commerce activity trend">{[45,62,48,78,68,88,73,92,84,96,86,100].map((value,index)=><i key={index} style={{height:`${value}%`}}/>)}</div></div>}
