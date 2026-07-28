import {
  Activity, BarChart3, Boxes, ChevronDown, ClipboardList, FileSearch, FileText, Globe2, Home,
  Image, LayoutDashboard, LogOut, Menu, MessageSquare, Moon, Package, Plus, Search,
  Settings, ShoppingBasket, Tags, TicketPercent, Trash2, Upload, Users, X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { apiFetch } from "../services/api";
import ContentWorkspace from "../components/admin/ContentWorkspace";

const navigation = [
  ["Overview", [["dashboard", LayoutDashboard, "Dashboard"], ["analytics", BarChart3, "Analytics"]]],
  ["Commerce", [["products", Package, "Products"], ["categories", Tags, "Categories"], ["inventory", Boxes, "Inventory"], ["orders", ClipboardList, "Orders"], ["customers", Users, "Customers"], ["coupons", TicketPercent, "Coupons"], ["reviews", MessageSquare, "Reviews"]]],
  ["Content", [["content", FileText, "Content CMS"], ["media", Image, "Media library"], ["banners", Image, "Banners"], ["homepage", Home, "Homepage"], ["digital", Globe2, "Digital platform"], ["seo", FileSearch, "SEO"]]],
  ["System", [["settings", Settings, "Site settings"], ["activity", Activity, "Activity logs"]]],
];
const allSections = navigation.flatMap(([, items]) => items);
const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN"]);
const money = (paise = 0) => `₹${(Number(paise) / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const labelFor = (value) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const columns = {
  products: [["name", "Product"], ["category_name", "Category"], ["status", "Status"], ["variant_count", "Variants"], ["stock", "Stock"]],
  categories: [["name", "Category"], ["slug", "Slug"], ["sort_order", "Order"], ["active", "Active"]],
  inventory: [["sku", "SKU"], ["product_name", "Product"], ["name", "Variant"], ["stock", "Stock"], ["low_stock_threshold", "Low stock at"]],
  orders: [["order_number", "Order"], ["customer_name", "Customer"], ["status", "Status"], ["total_paise", "Total"], ["created_at", "Placed"]],
  customers: [["name", "Customer"], ["email", "Email"], ["role", "Role"], ["orders_count", "Orders"], ["lifetime_value_paise", "Lifetime value"]],
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
    ["heroImageUrl", "Hero image URL"], ["bannerImageUrl", "Banner image URL"], ["thumbnailUrl", "Thumbnail URL"],
    ["sortOrder", "Sort order", "number"], ["featured", "Featured category", "checkbox"], ["homepageVisible", "Show on homepage", "checkbox"],
    ["navigationVisible", "Show in navigation", "checkbox"], ["active", "Enabled", "checkbox"],
  ],
  coupons: [
    ["code", "Coupon code", "text", true], ["type", "Discount type", "select", true, ["percent", "flat"]],
    ["value", "Value", "number", true], ["minimumOrderPaise", "Minimum order (paise)", "number"],
    ["expiresAt", "Expiry", "datetime-local"], ["usageLimit", "Usage limit", "number"], ["enabled", "Enabled", "checkbox"],
  ],
  banners: [
    ["title", "Title", "text", true], ["subtitle", "Subtitle"], ["imageUrl", "Image URL", "url", true], ["linkUrl", "Link URL", "url"],
    ["bannerType", "Placement", "select", true, ["homepage", "festival", "offer", "category"]],
    ["device", "Device", "select", true, ["both", "desktop", "mobile"]], ["startsAt", "Starts", "datetime-local"],
    ["endsAt", "Ends", "datetime-local"], ["sortOrder", "Sort order", "number"], ["active", "Enabled", "checkbox"],
  ],
  digital: [
    ["contentType", "Content type", "select", true, ["weather", "mandi", "scheme", "icar", "article"]],
    ["title", "Title", "text", true], ["slug", "Slug", "text", true], ["summary", "Summary", "textarea"], ["content", "Content", "textarea"],
    ["imageUrl", "Image URL", "url"], ["sourceUrl", "Source URL", "url"], ["status", "Status", "select", true, ["draft", "published"]],
    ["featured", "Featured", "checkbox"],
  ],
  seo: [
    ["route", "Route", "text", true], ["metaTitle", "Meta title"], ["metaDescription", "Meta description", "textarea"],
    ["canonicalUrl", "Canonical URL", "url"], ["robots", "Robots", "select", true, ["index,follow", "noindex,follow", "noindex,nofollow"]],
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
  useDocumentTitle("Commerce Admin");

  const load = async (module = active) => {
    setBusy(true); setError("");
    try { setData(await apiFetch(`/api/admin/${module}`)); }
    catch (reason) { setError(reason.message); setData(null); }
    finally { setBusy(false); }
  };
  // The active module is an external data source; changing it intentionally starts a new request.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (user && ADMIN_ROLES.has(user.role)) load(active); }, [active, user]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!notice) return undefined; const timer = setTimeout(() => setNotice(""), 3000); return () => clearTimeout(timer); }, [notice]);

  if (loading) return <div className="admin-gate"><span className="admin-spinner" />Checking secure access…</div>;
  if (!user) return <Navigate replace to="/admin/login" />;
  if (!ADMIN_ROLES.has(user.role)) return <div className="admin-gate"><ShoppingBasket /><h1>Access denied</h1><p>You do not have administrator permissions.</p><Link to="/admin/logout">Sign out</Link></div>;

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
      <aside className={mobileNav ? "is-open" : ""}>
        <div className="admin-brand"><ShoppingBasket /><span><strong>Kisan Gaurav</strong><small>Commerce OS</small></span><button type="button" onClick={() => setMobileNav(false)} aria-label="Close menu"><X /></button></div>
        <nav aria-label="Admin navigation">
          {navigation.map(([group, items]) => <div className="admin-nav-group" key={group}><small>{group}</small>{items.map(([module, Icon, label]) => (
            <button type="button" key={module} className={active === module ? "is-active" : ""} onClick={() => selectModule(module)}><Icon /> <span>{label}</span></button>
          ))}</div>)}
        </nav>
        <div className="admin-user"><span>{(user.name || user.email || "A")[0].toUpperCase()}</span><div><strong>{user.name || "Administrator"}</strong><small>{labelFor(user.role)}</small></div><Link to="/admin/logout" aria-label="Sign out"><LogOut /></Link></div>
      </aside>
      {mobileNav ? <button className="admin-scrim" type="button" aria-label="Close navigation" onClick={() => setMobileNav(false)} /> : null}
      <main>
        <header className="admin-topbar">
          <button type="button" className="admin-menu" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu /></button>
          <div className="admin-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this workspace…" aria-label="Search" /><kbd>⌘ K</kbd></div>
          <button type="button" className="admin-icon-button" onClick={() => setDark((value) => !value)} aria-label="Toggle dark mode"><Moon /></button>
          <div className="admin-role">{labelFor(user.role)}</div>
        </header>
        <div className="admin-content">
          <div className="admin-heading"><div><p>Commerce / {title}</p><h1>{title}</h1></div>{editable.has(active) && active !== "settings" && active !== "homepage" ? <button type="button" className="admin-primary" onClick={() => openEditor()}><Plus /> Add {active === "seo" ? "entry" : active.slice(0, -1)}</button> : null}</div>
          {notice ? <div className="admin-notice" role="status">{notice}</div> : null}
          {user.mustChangePassword ? <div className="admin-security-warning"><strong>Secure your Super Admin account.</strong><span>The initial password must be replaced before regular administration.</span><Link to="/admin/change-password">Change password now</Link></div> : null}
          {error ? <div className="admin-error" role="alert">{error}<button type="button" onClick={() => setError("")}><X /></button></div> : null}
          {busy && data === null ? <div className="admin-loading"><span className="admin-spinner" /> Loading workspace…</div> : null}
          {active === "dashboard" && data ? <Dashboard data={data} onNavigate={selectModule} /> : null}
          {active === "media" ? <MediaLibrary rows={filtered} onReload={load} setError={setError} setNotice={setNotice} /> : null}
          {active === "content" && Array.isArray(data) ? <ContentWorkspace rows={filtered} onReload={load} setError={setError} setNotice={setNotice} /> : null}
          {active !== "dashboard" && active !== "media" && active !== "content" && Array.isArray(data) ? <DataTable module={active} rows={filtered} onEdit={openEditor} onDelete={remove} onReload={load} setError={setError} setNotice={setNotice} /> : null}
        </div>
      </main>
      {editor ? <Editor module={active} value={editor} onClose={() => setEditor(null)} onSaved={async () => { setEditor(null); setNotice("Changes saved"); await load(); }} setError={setError} /> : null}
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
  return <div className="admin-dashboard"><div className="admin-kpis">{cards.map(([label, value, module], index) => <button type="button" onClick={() => onNavigate(module)} key={label}><span>{label}</span><strong>{value}</strong><small>{index === 0 ? "Lifetime gross sales" : "View details"} →</small></button>)}</div><div className="admin-chart-grid"><section className="admin-panel admin-sales-chart"><header><div><p>Revenue trend</p><h2>Sales performance</h2></div><span>Last 12 months <ChevronDown /></span></header><div className="admin-bars" role="img" aria-label="Revenue by month">{(data.monthly || []).map((item) => <div key={item.month} title={`${item.month}: ${money(item.revenue_paise)}`}><i style={{ height: `${Math.max(4, Number(item.revenue_paise) / maxRevenue * 100)}%` }} /><small>{item.month?.slice(5)}</small></div>)}</div></section><section className="admin-panel admin-top-products"><header><div><p>Top products</p><h2>Units sold</h2></div></header>{(data.topProducts || []).length ? data.topProducts.map((item, index) => <div className="admin-ranked" key={item.product_name}><span>{index + 1}</span><div><strong>{item.product_name}</strong><i><b style={{ width: `${Number(item.units) / maxTop * 100}%` }} /></i></div><em>{item.units}</em></div>) : <Empty />}</section></div><section className="admin-panel admin-recent"><header><div><p>Live operations</p><h2>Recent orders</h2></div><button type="button" onClick={() => onNavigate("orders")}>View all</button></header><table><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th><th>Placed</th></tr></thead><tbody>{(data.recentOrders || []).map((order) => <tr key={order.id}><td><strong>{order.order_number}</strong></td><td>{order.customer_name}</td><td><Status value={order.status} /></td><td>{money(order.total_paise)}</td><td>{formatDate(order.created_at)}</td></tr>)}</tbody></table></section></div>;
}

function DataTable({ module, rows, onEdit, onDelete, onReload, setError, setNotice }) {
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
    if (module === "customers") return <select className="admin-status-select" value={ADMIN_ROLES.has(row.role) ? row.role : ""} onChange={(event)=>event.target.value && saveRole(row,event.target.value)}><option value="">No admin access</option><option value="ADMIN">Admin</option><option value="SUPER_ADMIN">Super Admin</option></select>;
    if (module === "reviews") return <div className="admin-row-actions"><button type="button" onClick={()=>moderate(row,{status:row.status==="published"?"rejected":"published"})}>{row.status==="published"?"Reject":"Approve"}</button><button type="button" onClick={()=>moderate(row,{featured:!row.featured})}>{row.featured?"Unfeature":"Feature"}</button><button type="button" className="is-danger" onClick={()=>onDelete(row)}><Trash2 /></button></div>;
    if (!editable.has(module)) return null;
    return <div className="admin-row-actions"><button type="button" onClick={()=>onEdit(row)}>Edit</button>{module==="products"?<button type="button" onClick={()=>duplicate(row)}>Duplicate</button>:null}{["products","categories"].includes(module)?<button type="button" className="is-danger" onClick={()=>onDelete(row)}><Trash2 /></button>:null}</div>;
  };
  if (!rows.length) return <section className="admin-panel"><Empty /></section>;
  const hasActions=editable.has(module)||["orders","inventory","reviews","customers"].includes(module);
  return <section className="admin-panel admin-data"><div className="admin-table-meta"><span>{rows.length} records</span><span>{module==="categories"?"Drag rows to reorder":"Database synced"}</span></div><div className="admin-table-scroll"><table><thead><tr>{config.map(([,label])=><th key={label}>{label}</th>)}{hasActions?<th><span className="sr-only">Actions</span></th>:null}</tr></thead><tbody>{rows.map((row)=><tr draggable={module==="categories"} onDragStart={()=>{dragId.current=row.id;}} onDragOver={(event)=>module==="categories"&&event.preventDefault()} onDrop={()=>dropCategory(row.id)} key={row.id||row.key||row.month}>{config.map(([key])=><td key={key}>{renderCell(key,row[key])}</td>)}{hasActions?<td>{actions(row)}</td>:null}</tr>)}</tbody></table></div></section>;
}
function StockEditor({ row, onSave }) { const [stock, setStock] = useState(row.stock); return <div className="admin-stock-edit"><input type="number" min="0" value={stock} onChange={(event) => setStock(event.target.value)} /><button type="button" disabled={Number(stock) === Number(row.stock)} onClick={() => onSave(row, stock)}>Save</button></div>; }

function Editor({ module, value, onClose, onSaved, setError }) {
  const [form, setForm] = useState(value); const [busy, setBusy] = useState(false);
  const update = (key, next) => setForm((current) => ({ ...current, [key]: next }));
  const save = async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      let path = `/api/admin/${module}`; let method = "POST"; let body = form;
      if (module === "settings") { path = `/api/admin/settings/${form.key}`; method = "PUT"; try { body = JSON.parse(form.value_json); } catch { throw new Error("Setting value must be valid JSON."); } }
      if (module === "homepage") { path = `/api/admin/homepage/${form.id}`; method = "PUT"; body = { title: form.title, content: JSON.parse(form.content_json || "{}"), enabled: Boolean(form.enabled), sortOrder: Number(form.sort_order) }; }
      await apiFetch(path, { method, body: JSON.stringify(body) }); await onSaved();
    } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };
  return <div className="admin-modal" role="dialog" aria-modal="true" aria-label={`Edit ${module}`}><button type="button" className="admin-modal__scrim" onClick={onClose} aria-label="Close" /><form onSubmit={save}><header><div><p>{form.id ? "Edit record" : "New record"}</p><h2>{module === "products" ? "Product workspace" : labelFor(module)}</h2></div><button type="button" onClick={onClose} aria-label="Close"><X /></button></header><div className="admin-editor-body">{module === "products" ? <ProductFields form={form} update={update} /> : module === "settings" ? <><Field field={["key", "Setting key"]} form={form} update={update} disabled={Boolean(form.key)} /><Field field={["value_json", "JSON value", "textarea", true]} form={form} update={update} /></> : module === "homepage" ? <><Field field={["title", "Section title"]} form={form} update={update} /><Field field={["content_json", "Content (JSON)", "textarea", true]} form={form} update={update} /><Field field={["enabled", "Enabled", "checkbox"]} form={form} update={update} /><Field field={["sort_order", "Sort order", "number"]} form={form} update={update} /></> : <div className="admin-form-grid">{(editorFields[module] || []).map((field) => <Field key={field[0]} field={field} form={form} update={update} />)}</div>}</div><footer><button type="button" onClick={onClose}>Cancel</button><button className="admin-primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button></footer></form></div>;
}

function ProductFields({ form, update }) {
  const variants = form.variants || [];
  const setVariant = (index, key, value) => update("variants", variants.map((variant, position) => position === index ? { ...variant, [key]: value } : variant));
  const addVariant = () => update("variants", [...variants, { name: "250 gm", sku: "", pricePaise: 0, mrpPaise: 0, stock: 0, lowStockThreshold: 5, active: true }]);
  const productFields = [
    ["name", "Product name", "text", true], ["slug", "Slug", "text", true], ["brand", "Brand"],
    ["subcategory", "Subcategory"], ["description", "Description", "textarea"], ["benefits", "Benefits", "textarea"], ["ingredients", "Ingredients", "textarea"],
    ["nutrition", "Nutrition", "textarea"], ["storage", "Storage"], ["shelfLife", "Shelf life"], ["countryOfOrigin", "Country of origin"],
    ["hsnCode", "HSN code"], ["gstBasisPoints", "GST (basis points)", "number"], ["barcode", "Barcode"], ["status", "Status", "select", true, ["draft", "published", "archived"]],
    ["imageUrl", "Hero image URL"], ["detailImageUrl", "Detail image URL"], ["seoTitle", "SEO title"], ["seoDescription", "SEO description", "textarea"],
    ["featured", "Featured", "checkbox"], ["bestSeller", "Best seller", "checkbox"], ["newArrival", "New arrival", "checkbox"], ["active", "Enabled", "checkbox"],
  ];
  return <><div className="admin-form-grid"><label>Category<select required value={form.categoryId || ""} onChange={(event) => update("categoryId", event.target.value)}><option value="">Select category</option>{(form._categories || []).map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>{productFields.map((field) => <Field key={field[0]} field={field} form={form} update={(key, value) => { update(key, value); if (key === "name" && !form.id) update("slug", slugify(value)); }} />)}</div><div className="admin-variant-heading"><div><p>Pricing & inventory</p><h3>Variants</h3></div><button type="button" onClick={addVariant}><Plus /> Add variant</button></div>{variants.map((variant, index) => <div className="admin-variant" key={variant.id || index}>{[["name", "Variant"], ["sku", "SKU"], ["pricePaise", "Selling price"], ["mrpPaise", "MRP"], ["festivalPricePaise", "Festival"], ["bulkPricePaise", "Bulk"], ["wholesalePricePaise", "Wholesale"], ["stock", "Stock"], ["weightGrams", "Weight (g)"]].map(([key, label], position) => <label key={key}>{label}<input required={position < 2} type={position > 1 ? "number" : "text"} value={variant[key] ?? variant[toSnake(key)] ?? ""} onChange={(event) => setVariant(index, key, event.target.value)} /></label>)}<button type="button" className="is-danger" onClick={() => update("variants", variants.filter((_, position) => position !== index))}><Trash2 /></button></div>)}</>;
}

function Field({ field, form, update, disabled = false }) {
  const [key, label, type = "text", required = false, options = []] = field; const value = form[key] ?? "";
  if (type === "checkbox") return <label className="admin-switch"><input type="checkbox" checked={Boolean(value)} onChange={(event) => update(key, event.target.checked)} /><span />{label}</label>;
  return <label className={type === "textarea" ? "is-wide" : ""}>{label}{type === "select" ? <select required={required} value={value} onChange={(event) => update(key, event.target.value)}>{options.map((option) => <option key={option} value={option}>{labelFor(option)}</option>)}</select> : type === "textarea" ? <textarea rows="4" required={required} value={value} onChange={(event) => update(key, event.target.value)} /> : <input disabled={disabled} type={type} required={required} value={value} onChange={(event) => update(key, event.target.value)} />}</label>;
}

function MediaLibrary({ rows, onReload, setError, setNotice }) {
  const inputRef = useRef(null); const [uploading, setUploading] = useState(false); const [folder, setFolder] = useState("general");
  const upload = async (event) => { const files = [...event.target.files]; if (!files.length) return; setUploading(true); try { for (const file of files) { const prepared = await optimizeImage(file); const body = new FormData(); body.append("file", prepared); body.append("folder", folder); await apiFetch("/api/admin/uploads", { method: "POST", body }); } setNotice(`${files.length} asset${files.length > 1 ? "s" : ""} uploaded and optimized`); await onReload(); } catch (reason) { setError(reason.message); } finally { setUploading(false); event.target.value = ""; } };
  const remove = async (asset) => { if (!window.confirm(`Delete ${asset.file_name}? This cannot be undone.`)) return; try { await apiFetch(`/api/admin/media/${asset.id}`, { method: "DELETE" }); setNotice("Asset deleted"); await onReload(); } catch (reason) { setError(reason.message); } };
  const putReplacement=async(asset,file,message)=>{setUploading(true);try{const prepared=await optimizeImage(file);const body=new FormData();body.append("file",prepared);await apiFetch(`/api/admin/media/${asset.id}/replace`,{method:"PUT",body});setNotice(message);await onReload();}catch(reason){setError(reason.message);}finally{setUploading(false);}};
  const replace = (asset) => { const picker=document.createElement("input"); picker.type="file"; picker.accept="image/*,video/*,.pdf,.doc,.docx,.txt"; picker.onchange=()=>{const file=picker.files?.[0];if(file)putReplacement(asset,file,"Asset replaced");};picker.click();};
  const crop=async(asset)=>{const ratio=window.prompt("Crop aspect ratio: 1:1, 4:3 or 16:9","1:1");if(!ratio)return;try{const file=await cropImage(asset.url,ratio,asset.file_name);await putReplacement(asset,file,"Image cropped and saved as WebP");}catch(reason){setError(reason.message);}};
  return <><div className="admin-media-toolbar"><label>Folder<select value={folder} onChange={(event) => setFolder(event.target.value)}><option>general</option><option>products</option><option>categories</option><option>banners</option><option>packaging</option><option>videos</option><option>documents</option></select></label><button type="button" className="admin-primary" disabled={uploading} onClick={() => inputRef.current?.click()}><Upload /> {uploading ? "Uploading…" : "Upload media"}</button><input ref={inputRef} type="file" hidden multiple accept="image/*,video/*,.pdf,.doc,.docx,.txt" onChange={upload} /></div>{rows.length ? <div className="admin-media-grid">{rows.map((asset) => <article key={asset.id}>{asset.mime_type.startsWith("image/") ? <img src={asset.url} alt={asset.alt_text || ""} loading="lazy" /> : asset.mime_type.startsWith("video/") ? <video src={asset.url} muted controls preload="metadata" /> : <div className="admin-pdf">{asset.mime_type==="application/pdf"?"PDF":"DOC"}</div>}<div><strong title={asset.file_name}>{asset.file_name}</strong><small>{asset.folder} · {(asset.size_bytes / 1024).toFixed(0)} KB</small><span><button type="button" onClick={()=>replace(asset)}>Replace</button>{asset.mime_type.startsWith("image/")?<button type="button" onClick={()=>crop(asset)}>Crop</button>:null}</span></div><button type="button" onClick={() => remove(asset)} aria-label="Delete asset"><Trash2 /></button></article>)}</div> : <section className="admin-panel"><Empty /></section>}</>;
}

function Status({ value }) { return <span className={`admin-status is-${value}`}>{labelFor(String(value))}</span>; }
function Empty() { return <div className="admin-empty"><Boxes /><h3>No records yet</h3><p>Your database is ready for its first entry.</p></div>; }
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
  return result;
}
async function optimizeImage(file) {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/webp") return file;
  const bitmap = await createImageBitmap(file); const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas"); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", .82));
  return blob ? new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" }) : file;
}
async function cropImage(url, ratioText, fileName) {
  const ratios={"1:1":1,"4:3":4/3,"16:9":16/9}; const ratio=ratios[ratioText];
  if(!ratio)throw new Error("Use one of these crop ratios: 1:1, 4:3 or 16:9.");
  const image=new window.Image(); image.crossOrigin="anonymous";
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error("The image could not be loaded for cropping."));image.src=url;});
  let width=image.naturalWidth;let height=Math.round(width/ratio);if(height>image.naturalHeight){height=image.naturalHeight;width=Math.round(height*ratio);}
  const sourceX=Math.round((image.naturalWidth-width)/2);const sourceY=Math.round((image.naturalHeight-height)/2);
  const scale=Math.min(1,2400/Math.max(width,height));const canvas=document.createElement("canvas");canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
  canvas.getContext("2d").drawImage(image,sourceX,sourceY,width,height,0,0,canvas.width,canvas.height);
  const blob=await new Promise((resolve)=>canvas.toBlob(resolve,"image/webp",.84));if(!blob)throw new Error("Image crop failed.");
  return new File([blob],`${fileName.replace(/\.[^.]+$/,"")}-${ratioText.replace(":","x")}.webp`,{type:"image/webp"});
}
