import {
  Activity, AlertTriangle, BarChart3, Boxes, CheckCircle2, ChevronDown, ClipboardList,
  FileSearch, FileText, Globe2, Home, Image, LayoutDashboard, LogOut, Menu, MessageSquare,
  Moon, Package, Plus, RefreshCw, Search, Settings, Tags, TicketPercent,
  Trash2, Users, X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { apiFetch } from "../services/api";
import ContentWorkspace from "../components/admin/ContentWorkspace";
import AdminProfileMenu from "../components/admin/AdminProfileMenu";
import CustomerActions from "../components/admin/CustomerActions";
import AdminAccessSkeleton from "../components/admin/AdminAccessSkeleton";
import MediaLibrary from "../components/admin/MediaLibrary";
import { JsonMediaTextarea, MediaField } from "../components/admin/MediaPicker";
import { formatRole, isAdminRole } from "../utils/roles";
import BrandMark from "../components/brand/BrandMark";

const navigation = [
  ["Overview", [["dashboard", LayoutDashboard, "Dashboard"], ["analytics", BarChart3, "Analytics"]]],
  ["Commerce", [["products", Package, "Products"], ["categories", Tags, "Categories"], ["inventory", Boxes, "Inventory"], ["orders", ClipboardList, "Orders"], ["customers", Users, "Customers"], ["coupons", TicketPercent, "Coupons"], ["reviews", MessageSquare, "Reviews"]]],
  ["Content", [["content", FileText, "Content CMS"], ["media", Image, "Media library"], ["banners", Image, "Banners"], ["homepage", Home, "Homepage"], ["digital", Globe2, "Digital platform"], ["seo", FileSearch, "SEO"]]],
  ["System", [["users", Users, "Users"], ["settings", Settings, "Site settings"], ["activity", Activity, "Activity logs"]]],
];
const allSections = navigation.flatMap(([, items]) => items);
const money = (paise = 0) => `₹${(Number(paise) / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const labelFor = formatRole;
const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const columns = {
  products: [["name", "Product"], ["category_name", "Category"], ["status", "Status"], ["variant_count", "Variants"], ["stock", "Stock"]],
  categories: [["name", "Category"], ["slug", "Slug"], ["sort_order", "Order"], ["active", "Active"]],
  inventory: [["sku", "SKU"], ["product_name", "Product"], ["name", "Variant"], ["stock", "Stock"], ["low_stock_threshold", "Low stock at"]],
  orders: [["order_number", "Order"], ["customer_name", "Customer"], ["status", "Status"], ["total_paise", "Total"], ["created_at", "Placed"]],
  customers: [["name", "Customer"], ["email", "Email"], ["role", "Role"], ["orders_count", "Orders"], ["lifetime_value_paise", "Lifetime value"]],
  users: [["name", "User"], ["email", "Email"], ["role", "Role"], ["orders_count", "Orders"], ["created_at", "Joined"]],
  coupons: [["code", "Code"], ["type", "Type"], ["value", "Value"], ["usage_count", "Uses"], ["enabled", "Enabled"]],
  reviews: [["product_name", "Product"], ["customer_name", "Customer"], ["rating", "Rating"], ["status", "Status"], ["featured", "Featured"]],
  banners: [["title", "Banner"], ["banner_type", "Placement"], ["device", "Device"], ["active", "Active"]],
  homepage: [["title", "Section"], ["section_type", "Type"], ["sort_order", "Order"], ["enabled", "Enabled"]],
  digital: [["title", "Content"], ["content_type", "Type"], ["status", "Status"], ["featured", "Featured"]],
  seo: [["route", "Route"], ["meta_title", "Meta title"], ["robots", "Robots"]],
  settings: [["key", "Setting"], ["value_json", "Value"], ["updated_at", "Updated"]],
  activity: [["created_at", "Time"], ["actor_name", "User"], ["action", "Action"], ["resource_type", "Resource"], ["resource_id", "Record"]],
  analytics: [["month", "Month"], ["orders", "Orders"], ["revenue_paise", "Revenue"]],
};

const editorFields = {
  categories: [
    ["name", "Category name", "text", true], ["slug", "Slug", "text", true], ["shortDescription", "Short description", "textarea"],
    ["longDescription", "Long description", "textarea"], ["seoTitle", "SEO title"], ["seoDescription", "SEO description", "textarea"],
    ["heroImageUrl", "Hero image", "media", false, [], "categories"], ["bannerImageUrl", "Banner image", "media", false, [], "categories"], ["thumbnailUrl", "Thumbnail", "media", false, [], "categories"],
    ["sortOrder", "Sort order", "number"], ["featured", "Featured category", "checkbox"], ["homepageVisible", "Show on homepage", "checkbox"],
    ["navigationVisible", "Show in navigation", "checkbox"], ["active", "Enabled", "checkbox"],
  ],
  coupons: [
    ["code", "Coupon code", "text", true], ["type", "Discount type", "select", true, ["percent", "flat"]],
    ["value", "Value", "number", true], ["minimumOrderPaise", "Minimum order (paise)", "number"],
    ["expiresAt", "Expiry", "datetime-local"], ["usageLimit", "Usage limit", "number"], ["enabled", "Enabled", "checkbox"],
  ],
  banners: [
    ["title", "Title", "text", true], ["subtitle", "Subtitle"], ["imageUrl", "Banner image", "media", true, [], "banners"], ["linkUrl", "Link URL", "url"],
    ["bannerType", "Placement", "select", true, ["homepage", "festival", "offer", "category"]],
    ["device", "Device", "select", true, ["both", "desktop", "mobile"]], ["startsAt", "Starts", "datetime-local"],
    ["endsAt", "Ends", "datetime-local"], ["sortOrder", "Sort order", "number"], ["active", "Enabled", "checkbox"],
  ],
  digital: [
    ["contentType", "Content type", "select", true, ["weather", "mandi", "scheme", "icar", "article"]],
    ["title", "Title", "text", true], ["slug", "Slug", "text", true], ["summary", "Summary", "textarea"], ["content", "Content", "textarea"],
    ["imageUrl", "Feature image", "media", false, [], "cms"], ["sourceUrl", "Source URL", "url"], ["status", "Status", "select", true, ["draft", "published"]],
    ["featured", "Featured", "checkbox"],
  ],
  seo: [
    ["route", "Route", "text", true], ["metaTitle", "Meta title"], ["metaDescription", "Meta description", "textarea"],
    ["canonicalUrl", "Canonical URL", "url"], ["openGraphImageUrl", "Social sharing image", "media", false, [], "seo"], ["robots", "Robots", "select", true, ["index,follow", "noindex,follow", "noindex,nofollow"]],
  ],
};
const defaults = {
  categories: { active: true, homepageVisible: true, navigationVisible: true, sortOrder: 0 },
  coupons: { type: "percent", enabled: true },
  banners: { bannerType: "homepage", device: "both", active: true, sortOrder: 0 },
  digital: { contentType: "article", status: "draft" },
  seo: { robots: "index,follow" },
};
const editable = new Set(["products", "categories", "coupons", "banners", "digital", "seo", "settings", "homepage"]);

export default function AdminPage({ initialModule = "dashboard" }) {
  const { user, loading } = useAuth();
  const [active, setActive] = useState(initialModule);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [dark, setDark] = useState(false);
  const [editor, setEditor] = useState(null);
  const [notice, setNotice] = useState("");
  const searchRef = useRef(null);
  useDocumentTitle("Commerce Admin");

  const load = async (module = active) => {
    if (module === "media") { setError(""); setData([]); setBusy(false); return; }
    setBusy(true); setError(""); setData(null);
    try { setData(await apiFetch(`/api/admin/${module}`)); }
    catch (reason) { setError(reason.message); setData(null); }
    finally { setBusy(false); }
  };
  // The active module is an external data source; changing it intentionally starts a new request.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (user && isAdminRole(user.role)) load(active); }, [active, user]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!notice) return undefined; const timer = setTimeout(() => setNotice(""), 3000); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape" && mobileNav) setMobileNav(false);
    };
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [mobileNav]);

  if (loading) return <AdminAccessSkeleton />;
  if (!user) return <Navigate replace to="/admin/login" />;
  if (!isAdminRole(user.role)) return <Navigate replace to="/account" />;

  const title = allSections.find(([id]) => id === active)?.[2] || "Admin";
  const rows = Array.isArray(data) ? data : [];
  const filtered = rows.filter((row) => !query || Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(query.toLowerCase())));
  const selectModule = (module) => { setActive(module); setQuery(""); setEditor(null); setMobileNav(false); };
  const openEditor = async (row = null) => {
    if (active === "products") {
      setBusy(true);
      try {
        const [product, categories] = await Promise.all([
          row?.id ? apiFetch(`/api/admin/products/${row.id}`) : Promise.resolve({ brand: "Kisan Gaurav", countryOfOrigin: "India", gstBasisPoints: 500, status: "draft", active: true, variants: [] }),
          apiFetch("/api/admin/categories"),
        ]);
        setEditor({ ...normalizeRow("products", product), _categories: categories });
      } catch (reason) { setError(reason.message); }
      finally { setBusy(false); }
    } else setEditor(row ? normalizeRow(active, row) : { ...(defaults[active] || {}) });
  };
  const remove = async (row) => {
    if (!window.confirm(`Remove ${row.name || row.title || row.code || "this record"}?`)) return;
    setBusy(true);
    try {
      await apiFetch(`/api/admin/${active}/${row.id}`, { method: "DELETE" });
      setNotice("Record removed"); await load();
    } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };

  return (
    <div className={`admin-app${dark ? " is-dark" : ""}`}>
      <a className="admin-skip-link" href="#admin-main">Skip to main content</a>
      <aside className={mobileNav ? "is-open" : ""}>
        <div className="admin-brand"><BrandMark className="admin-brand-mark admin-brand-mark--sidebar" priority sizes="34px" /><span><strong>Kisan Gaurav</strong><small>Commerce OS</small></span><button type="button" onClick={() => setMobileNav(false)} aria-label="Close menu"><X /></button></div>
        <nav aria-label="Admin navigation">
          {navigation.map(([group, items]) => <div className="admin-nav-group" key={group}><small>{group}</small>{items.map(([module, Icon, label]) => (
            <button type="button" key={module} title={label} aria-current={active === module ? "page" : undefined} className={active === module ? "is-active" : ""} onClick={() => selectModule(module)}><Icon aria-hidden="true" /> <span>{label}</span></button>
          ))}</div>)}
        </nav>
        <div className="admin-user"><span>{(user.name || user.email || "A")[0].toUpperCase()}</span><div><strong>{user.name || "Administrator"}</strong><small>{labelFor(user.role)}</small></div><Link to="/admin/logout" aria-label="Sign out"><LogOut /></Link></div>
      </aside>
      {mobileNav ? <button className="admin-scrim" type="button" aria-label="Close navigation" onClick={() => setMobileNav(false)} /> : null}
      <main id="admin-main">
        <header className="admin-topbar">
          <button type="button" className="admin-menu" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu /></button>
          <label className="admin-search"><Search aria-hidden="true" /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()}`} aria-label={`Search ${title}`} />{query ? <button type="button" onClick={() => { setQuery(""); searchRef.current?.focus(); }} aria-label="Clear search"><X /></button> : <kbd>Ctrl K</kbd>}</label>
          <span className="admin-context-label"><strong>{title}</strong><small>{filtered.length || rows.length || 0} visible records</small></span>
          <button type="button" className="admin-icon-button" onClick={() => setDark((value) => !value)} aria-label={dark ? "Use light theme" : "Use dark theme"} aria-pressed={dark}><Moon /></button>
          <AdminProfileMenu user={user} />
        </header>
        <div className="admin-content">
          <div className="admin-heading"><div><p>Commerce / {title}</p><h1>{title}</h1></div>{editable.has(active) && active !== "settings" && active !== "homepage" ? <button type="button" className="admin-primary" onClick={() => openEditor()}><Plus /> Add {active === "seo" ? "entry" : active.slice(0, -1)}</button> : null}</div>
          {notice ? <div className="admin-notice" role="status" aria-live="polite"><CheckCircle2 aria-hidden="true" /><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss success message"><X /></button></div> : null}
          {user.mustChangePassword ? <div className="admin-security-warning"><strong>Secure your Super Admin account.</strong><span>The initial password must be replaced before regular administration.</span><Link to="/admin/change-password">Change password now</Link></div> : null}
          {error && data !== null ? <div className="admin-error" role="alert"><AlertTriangle aria-hidden="true" /><span>{error}</span><button type="button" onClick={() => setError("")} aria-label="Dismiss error"><X /></button></div> : null}
          {busy && data === null ? <AdminWorkspaceSkeleton module={active} /> : null}
          {!busy && error && data === null ? <AdminErrorState message={error} onRetry={() => load(active)} /> : null}
          {active === "dashboard" && data ? <Dashboard data={data} onNavigate={selectModule} /> : null}
          {active === "media" ? <MediaLibrary setError={setError} setNotice={setNotice} /> : null}
          {active === "content" && Array.isArray(data) ? <ContentWorkspace rows={filtered} onReload={load} setError={setError} setNotice={setNotice} /> : null}
          {active !== "dashboard" && active !== "media" && active !== "content" && Array.isArray(data) ? <DataTable module={active} rows={filtered} filtered={Boolean(query)} currentUser={user} onEdit={openEditor} onDelete={remove} onReload={load} setError={setError} setNotice={setNotice} /> : null}
        </div>
      </main>
      {editor ? <Editor module={active} value={editor} onClose={() => setEditor(null)} onSaved={async () => { setEditor(null); setNotice("Changes saved"); await load(); }} setError={setError} setNotice={setNotice} /> : null}
    </div>
  );
}

function Dashboard({ data, onNavigate }) {
  const cards = [
    ["Revenue", money(data.revenuePaise), "analytics"], ["Orders", data.orders, "orders"], ["Pending orders", data.pendingOrders, "orders"],
    ["Products", data.products, "products"], ["Categories", data.categories, "categories"], ["Customers", data.customers, "customers"],
    ["Inventory units", data.inventory, "inventory"], ["Low stock", data.lowStock, "inventory"], ["Today's orders", data.todayOrders, "orders"],
  ];
  const maxRevenue = Math.max(1, ...(data.monthly || []).map((item) => Number(item.revenue_paise)));
  const maxTop = Math.max(1, ...(data.topProducts || []).map((item) => Number(item.units)));
  const monthly = data.monthly || [];
  const topProducts = data.topProducts || [];
  const recentOrders = data.recentOrders || [];
  return <div className="admin-dashboard">
    <div className="admin-kpis">{cards.map(([label, value, module], index) => <button type="button" onClick={() => onNavigate(module)} key={label}><span>{label}</span><strong>{value}</strong><small>{index === 0 ? "Lifetime gross sales" : "View details"} →</small></button>)}</div>
    <div className="admin-chart-grid">
      <section className="admin-panel admin-sales-chart">
        <header><div><p>Revenue trend</p><h2>Sales performance</h2></div><span>Last 12 months <ChevronDown aria-hidden="true" /></span></header>
        {monthly.length ? <div className="admin-bars" role="img" aria-label="Revenue by month">{monthly.map((item) => <div key={item.month} title={`${item.month}: ${money(item.revenue_paise)}`}><i style={{ height: `${Math.max(4, Number(item.revenue_paise) / maxRevenue * 100)}%` }} /><small>{item.month?.slice(5)}</small></div>)}</div> : <Empty compact title="No revenue history yet" message="Revenue trends will appear after completed orders." />}
      </section>
      <section className="admin-panel admin-top-products">
        <header><div><p>Top products</p><h2>Units sold</h2></div></header>
        {topProducts.length ? topProducts.map((item, index) => <div className="admin-ranked" key={item.product_name}><span>{index + 1}</span><div><strong>{item.product_name}</strong><i><b style={{ width: `${Number(item.units) / maxTop * 100}%` }} /></i></div><em>{item.units}</em></div>) : <Empty compact title="No product sales yet" message="Top performers will appear here." />}
      </section>
    </div>
    <section className="admin-panel admin-recent">
      <header><div><p>Live operations</p><h2>Recent orders</h2></div><button type="button" onClick={() => onNavigate("orders")}>View all</button></header>
      {recentOrders.length ? <div className="admin-table-scroll" tabIndex="0" aria-label="Recent orders"><table><thead><tr><th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Status</th><th scope="col">Total</th><th scope="col">Placed</th></tr></thead><tbody>{recentOrders.map((order) => <tr key={order.id}><td><strong>{order.order_number}</strong></td><td>{order.customer_name}</td><td><Status value={order.status} /></td><td>{money(order.total_paise)}</td><td>{formatDate(order.created_at)}</td></tr>)}</tbody></table></div> : <Empty compact title="No recent orders" message="New orders will appear here." />}
    </section>
  </div>;
}

function DataTable({ module, rows, filtered, currentUser, onEdit, onDelete, onReload, setError, setNotice }) {
  const config = columns[module] || []; const dragId = useRef(null);
  const request = async (path, options, message) => { try { await apiFetch(path, options); setNotice(message); await onReload(); } catch (reason) { setError(reason.message); } };
  const changeStatus = (row, status) => request(`/api/admin/orders/${row.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }, "Order status updated");
  const moderate = (row, patch) => request(`/api/admin/reviews/${row.id}`, { method: "PATCH", body: JSON.stringify(patch) }, "Review updated");
  const updateStock = (row, stock) => request("/api/admin/inventory/bulk", { method: "PATCH", body: JSON.stringify({ items: [{ variantId: row.id, stock: Number(stock), change: Number(stock) - Number(row.stock) }] }) }, "Stock updated");
  const duplicate = (row) => request(`/api/admin/products/${row.id}/duplicate`, { method: "POST" }, "Product duplicated as a draft");
  const saveRole = (row, role) => request(`/api/admin/permissions/${row.id}`, { method: "PUT", body: JSON.stringify({ role }) }, "Administrator role updated");
  const dropCategory = async (targetId) => {
    if (!dragId.current || dragId.current === targetId) return;
    const reordered = [...rows]; const from = reordered.findIndex((row) => row.id === dragId.current); const to = reordered.findIndex((row) => row.id === targetId);
    const [moved] = reordered.splice(from, 1); reordered.splice(to, 0, moved);
    await request("/api/admin/categories/reorder", { method: "PATCH", body: JSON.stringify({ items: reordered.map(({ id }) => ({ id })) }) }, "Category order updated");
  };
  const actions = (row) => {
    if (module === "orders") return <select className="admin-status-select" value={row.status} onChange={(event) => changeStatus(row, event.target.value)}>{["pending","confirmed","packed","shipped","delivered","cancelled","returned","refunded"].map((value)=><option key={value}>{value}</option>)}</select>;
    if (module === "inventory") return <StockEditor row={row} onSave={updateStock} />;
    if (module === "customers") return currentUser.role === "SUPER_ADMIN" ? <CustomerActions customer={row} onReload={onReload} setError={setError} setNotice={setNotice} /> : null;
    if (module === "users") return currentUser.role === "SUPER_ADMIN" ? <select className="admin-status-select" aria-label={`Administrator role for ${row.email}`} value={isAdminRole(row.role) ? row.role : ""} onChange={(event)=>event.target.value && saveRole(row,event.target.value)}><option value="">No admin access</option><option value="ADMIN">Admin</option><option value="SUPER_ADMIN">Super Admin</option></select> : null;
    if (module === "reviews") return <div className="admin-row-actions"><button type="button" onClick={()=>moderate(row,{status:row.status==="published"?"rejected":"published"})}>{row.status==="published"?"Reject":"Approve"}</button><button type="button" onClick={()=>moderate(row,{featured:!row.featured})}>{row.featured?"Unfeature":"Feature"}</button><button type="button" className="is-danger" onClick={()=>onDelete(row)}><Trash2 /></button></div>;
    if (!editable.has(module)) return null;
    return <div className="admin-row-actions"><button type="button" onClick={()=>onEdit(row)}>Edit</button>{module==="products"?<button type="button" onClick={()=>duplicate(row)}>Duplicate</button>:null}{["products","categories"].includes(module)?<button type="button" className="is-danger" onClick={()=>onDelete(row)}><Trash2 /></button>:null}</div>;
  };
  if (!rows.length) return <section className="admin-panel"><Empty title={filtered ? "No matching records" : `No ${labelFor(module)} yet`} message={filtered ? "Try a broader search or clear the search field." : "Create the first record to start this workspace."} /></section>;
  const hasActions=editable.has(module)||["orders","inventory","reviews"].includes(module)||(currentUser.role==="SUPER_ADMIN"&&["customers","users"].includes(module));
  return <section className="admin-panel admin-data"><div className="admin-table-meta"><span><strong>{rows.length}</strong> records</span><span>{module==="categories"?"Drag rows to reorder":"Live database view"}</span></div><div className="admin-table-scroll" tabIndex="0" aria-label={`${labelFor(module)} table`}><table><thead><tr>{config.map(([,label])=><th scope="col" key={label}>{label}</th>)}{hasActions?<th scope="col"><span className="sr-only">Actions</span></th>:null}</tr></thead><tbody>{rows.map((row)=><tr draggable={module==="categories"} onDragStart={()=>{dragId.current=row.id;}} onDragOver={(event)=>module==="categories"&&event.preventDefault()} onDrop={()=>dropCategory(row.id)} key={row.id||row.key||row.month}>{config.map(([key])=><td key={key}>{module==="customers"&&key==="name"?<span className="customer-name-cell"><strong>{row.name}</strong><Status value={String(row.status||"ACTIVE").toLowerCase()} /></span>:renderCell(key,row[key])}</td>)}{hasActions?<td>{actions(row)}</td>:null}</tr>)}</tbody></table></div></section>;
}
function StockEditor({ row, onSave }) { const [stock, setStock] = useState(row.stock); return <div className="admin-stock-edit"><input aria-label={`Stock for ${row.product_name} ${row.name}`} type="number" min="0" value={stock} onChange={(event) => setStock(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && Number(stock) !== Number(row.stock)) onSave(row, stock); }} /><button type="button" disabled={Number(stock) === Number(row.stock)} onClick={() => onSave(row, stock)}>Save</button></div>; }

function Editor({ module, value, onClose, onSaved, setError, setNotice }) {
  const [form, setForm] = useState(value); const [busy, setBusy] = useState(false);
  const formRef = useRef(null);
  const update = (key, next) => setForm((current) => ({ ...current, [key]: next }));
  useEffect(() => {
    formRef.current?.querySelector("input:not([disabled]), select, textarea")?.focus();
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  const save = async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      let path = `/api/admin/${module}`; let method = "POST"; let body = form;
      if (module === "banners" && !form.imageUrl) throw new Error("Select a banner image from the Media Library.");
      if (module === "settings") { path = `/api/admin/settings/${form.key}`; method = "PUT"; try { body = JSON.parse(form.value_json); } catch { throw new Error("Setting value must be valid JSON."); } }
      if (module === "homepage") { path = `/api/admin/homepage/${form.id}`; method = "PUT"; body = { title: form.title, content: JSON.parse(form.content_json || "{}"), enabled: Boolean(form.enabled), sortOrder: Number(form.sort_order) }; }
      await apiFetch(path, { method, body: JSON.stringify(body) }); await onSaved();
    } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };
  const headingId = `admin-editor-${module}`;
  return <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby={headingId}><button type="button" className="admin-modal__scrim" onClick={onClose} aria-label="Close editor" /><form ref={formRef} onSubmit={save}><header><div><p>{form.id ? "Edit record" : "New record"}</p><h2 id={headingId}>{module === "products" ? "Product workspace" : labelFor(module)}</h2></div><button type="button" onClick={onClose} aria-label="Close editor"><X /></button></header><div className="admin-editor-body">{module === "products" ? <ProductFields form={form} update={update} setError={setError} setNotice={setNotice} /> : module === "settings" ? <><Field field={["key", "Setting key"]} form={form} update={update} disabled={Boolean(form.key)} /><Field field={["value_json", "JSON value", "textarea", true]} form={form} update={update} /></> : module === "homepage" ? <><Field field={["title", "Section title"]} form={form} update={update} /><JsonMediaTextarea label="Content (JSON)" value={form.content_json || "{}"} onChange={(next) => update("content_json", next)} folder="homepage" help="Place the cursor at an image value, then insert an existing or newly uploaded asset." setError={setError} setNotice={setNotice} /><Field field={["enabled", "Enabled", "checkbox"]} form={form} update={update} /><Field field={["sort_order", "Sort order", "number"]} form={form} update={update} /></> : <div className="admin-form-grid">{(editorFields[module] || []).map((field) => <Field key={field[0]} field={field} form={form} update={update} setError={setError} setNotice={setNotice} />)}</div>}</div><footer><span>Esc to close</span><button type="button" onClick={onClose}>Cancel</button><button className="admin-primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button></footer></form></div>;
}

function ProductFields({ form, update, setError, setNotice }) {
  const variants = form.variants || [];
  const setVariant = (index, key, value) => update("variants", variants.map((variant, position) => position === index ? { ...variant, [key]: value } : variant));
  const addVariant = () => update("variants", [...variants, { name: "250 gm", sku: "", pricePaise: 0, mrpPaise: 0, stock: 0, lowStockThreshold: 5, active: true }]);
  const productFields = [
    ["name", "Product name", "text", true], ["slug", "Slug", "text", true], ["brand", "Brand"],
    ["subcategory", "Subcategory"], ["description", "Description", "textarea"], ["benefits", "Benefits", "textarea"], ["ingredients", "Ingredients", "textarea"],
    ["nutrition", "Nutrition", "textarea"], ["storage", "Storage"], ["shelfLife", "Shelf life"], ["countryOfOrigin", "Country of origin"],
    ["hsnCode", "HSN code"], ["gstBasisPoints", "GST (basis points)", "number"], ["barcode", "Barcode"], ["status", "Status", "select", true, ["draft", "published", "archived"]],
    ["seoTitle", "SEO title"], ["seoDescription", "SEO description", "textarea"],
    ["featured", "Featured", "checkbox"], ["bestSeller", "Best seller", "checkbox"], ["newArrival", "New arrival", "checkbox"], ["active", "Enabled", "checkbox"],
  ];
  const gallery = (form.media || []).filter((item) => (item.mediaType || item.media_type) === "gallery").map((item) => ({ ...item, id: item.mediaId || item.media_id, url: item.url, file_name: item.file_name }));
  return <><div className="admin-form-grid"><label>Category<select required value={form.categoryId || ""} onChange={(event) => update("categoryId", event.target.value)}><option value="">Select category</option>{(form._categories || []).map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>{productFields.map((field) => <Field key={field[0]} field={field} form={form} update={(key, value) => { update(key, value); if (key === "name" && !form.id) update("slug", slugify(value)); }} />)}<MediaField label="Hero image" value={form.imageUrl} onChange={(assetUrl) => update("imageUrl", assetUrl)} folder="products" required setError={setError} setNotice={setNotice} /><MediaField label="Detail image" value={form.detailImageUrl} onChange={(assetUrl) => update("detailImageUrl", assetUrl)} folder="products" setError={setError} setNotice={setNotice} /><MediaField label="Gallery images" value={gallery} multiple returnAsset onChange={(assets) => update("media", [...(form.media || []).filter((item) => (item.mediaType || item.media_type) !== "gallery"), ...assets.map((asset, index) => ({ mediaId: asset.id, mediaType: "gallery", sortOrder: index * 10, ...asset }))])} folder="products" setError={setError} setNotice={setNotice} /></div><div className="admin-variant-heading"><div><p>Pricing & inventory</p><h3>Variants</h3></div><button type="button" onClick={addVariant}><Plus /> Add variant</button></div>{variants.map((variant, index) => <div className="admin-variant" key={variant.id || index}>{[["name", "Variant"], ["sku", "SKU"], ["pricePaise", "Selling price"], ["mrpPaise", "MRP"], ["festivalPricePaise", "Festival"], ["bulkPricePaise", "Bulk"], ["wholesalePricePaise", "Wholesale"], ["stock", "Stock"], ["weightGrams", "Weight (g)"]].map(([key, label], position) => <label key={key}>{label}<input required={position < 2} type={position > 1 ? "number" : "text"} value={variant[key] ?? variant[toSnake(key)] ?? ""} onChange={(event) => setVariant(index, key, event.target.value)} /></label>)}<button type="button" className="is-danger" onClick={() => update("variants", variants.filter((_, position) => position !== index))}><Trash2 /></button></div>)}</>;
}

function Field({ field, form, update, disabled = false, setError, setNotice }) {
  const [key, label, type = "text", required = false, options = [], folder = "general"] = field; const value = form[key] ?? "";
  if (type === "checkbox") return <label className="admin-switch"><input type="checkbox" checked={Boolean(value)} onChange={(event) => update(key, event.target.checked)} /><span />{label}</label>;
  if (type === "media") return <MediaField label={label} value={value} required={required} folder={folder} onChange={(next) => update(key, next)} setError={setError} setNotice={setNotice} />;
  return <label className={type === "textarea" ? "is-wide" : ""}>{label}{type === "select" ? <select required={required} value={value} onChange={(event) => update(key, event.target.value)}>{options.map((option) => <option key={option} value={option}>{labelFor(option)}</option>)}</select> : type === "textarea" ? <textarea rows="4" required={required} value={value} onChange={(event) => update(key, event.target.value)} /> : <input disabled={disabled} type={type} required={required} value={value} onChange={(event) => update(key, event.target.value)} />}</label>;
}

function Status({ value }) { return <span className={`admin-status is-${value}`}>{labelFor(String(value))}</span>; }
function Empty({ title = "No records yet", message = "Your database is ready for its first entry.", compact = false }) { return <div className={`admin-empty${compact ? " is-compact" : ""}`}><Boxes aria-hidden="true" /><h3>{title}</h3><p>{message}</p></div>; }
function AdminWorkspaceSkeleton({ module }) {
  const dashboard = module === "dashboard";
  return <div className={`admin-workspace-skeleton${dashboard ? " is-dashboard" : ""}`} aria-busy="true" aria-label={`Loading ${labelFor(module)}`}><span className="sr-only">Loading {labelFor(module)}</span>{dashboard ? <><div className="admin-skeleton-kpis">{Array.from({ length: 5 }, (_, index) => <div className="admin-skeleton" key={index} />)}</div><div className="admin-skeleton-panels"><div className="admin-skeleton" /><div className="admin-skeleton" /></div></> : <div className="admin-skeleton-table"><div className="admin-skeleton" />{Array.from({ length: 7 }, (_, index) => <div className="admin-skeleton" key={index} />)}</div>}</div>;
}
function AdminErrorState({ message, onRetry }) { return <section className="admin-panel admin-state-card" role="alert"><span><AlertTriangle aria-hidden="true" /></span><h2>We couldn’t load this workspace</h2><p>{message}</p><button type="button" className="admin-primary" onClick={onRetry}><RefreshCw aria-hidden="true" /> Try again</button></section>; }
function formatDate(value) { if (!value) return "—"; const date = new Date(`${value}${String(value).includes("Z") ? "" : "Z"}`); return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date); }
function renderCell(key, value) {
  if (["total_paise", "revenue_paise", "lifetime_value_paise"].includes(key)) return money(value);
  if (["active", "enabled", "featured"].includes(key)) return <Status value={value ? "enabled" : "disabled"} />;
  if (key === "status") return <Status value={value} />;
  if (key.endsWith("_at")) return formatDate(value);
  if (key === "value_json") return <code>{String(value).slice(0, 80)}</code>;
  return value ?? "—";
}
function toCamel(value) { return value.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()); }
function toSnake(value) { return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`); }
function normalizeRow(module, row) {
  const result = { ...row };
  for (const [key, value] of Object.entries(row)) result[toCamel(key)] = ["active", "enabled", "featured", "best_seller", "new_arrival", "homepage_visible", "navigation_visible"].includes(key) ? Boolean(value) : value;
  if (module === "products" && row.variants) result.variants = row.variants.map((variant) => normalizeRow("variant", variant));
  if (module === "seo") {
    try { result.openGraphImageUrl = JSON.parse(row.open_graph_json || "{}").image || ""; } catch { result.openGraphImageUrl = ""; }
  }
  return result;
}
