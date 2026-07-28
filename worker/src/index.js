import { Hono } from "hono";
import { handleAuth, getSession, hashPassword } from "./auth";
import { calculateCheckout, id, json, persistOrder } from "./commerce";

const app = new Hono();

app.use("*", async (c, next) => {
  const origin = c.req.header("Origin");
  if (origin && (origin === c.env.FRONTEND_URL || origin === "https://www.kisangaurav.com" || origin.endsWith(".pages.dev"))) {
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Vary", "Origin");
  }
  c.header("Access-Control-Allow-Headers", "Content-Type, X-CSRF-Token");
  c.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  if (c.req.method === "OPTIONS") return c.body(null, 204);
  await next();
});

const sessionFor = (c) => getSession(c.req.raw, c.env);
const requireUser = async (c) => {
  const session = await sessionFor(c);
  if (!session) throw new HTTPError(401, "Authentication required.");
  return session.user;
};
const body = async (c) => {
  try { return await c.req.json(); } catch { throw new HTTPError(400, "Invalid JSON body."); }
};
class HTTPError extends Error { constructor(status, message) { super(message); this.status = status; } }

app.onError((error, c) => c.json({ error: error.message || "Unexpected error." }, error.status || 500));
app.get("/api/health", (c) => c.json({ ok: true, service: "kisan-gaurav-api", timestamp: new Date().toISOString() }));
app.get("/sitemap.xml", async (c) => {
  const [products,content]=await c.env.DB.batch([
    c.env.DB.prepare("SELECT slug,updated_at FROM products WHERE status='published' AND active=1 AND archived=0"),
    c.env.DB.prepare("SELECT entry_type,slug,updated_at FROM cms_entries WHERE status='published' AND visibility!='hidden'"),
  ]);
  const base=c.env.FRONTEND_URL.replace(/\/$/,""); const fixed=["","shop","categories","about","contact","kisan-digital","blog","faq"];
  const urls=[...fixed.map((path)=>({loc:`${base}/${path}`,lastmod:new Date().toISOString()})),...products.results.map((row)=>({loc:`${base}/shop/${row.slug}`,lastmod:row.updated_at})),...content.results.filter((row)=>["blog","legal"].includes(row.entry_type)).map((row)=>({loc:`${base}/${row.entry_type==="legal"?"policies":"blog"}/${row.slug}`,lastmod:row.updated_at}))];
  const xml=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((item)=>`<url><loc>${item.loc}</loc><lastmod>${item.lastmod}</lastmod></url>`).join("")}</urlset>`;
  return c.body(xml,200,{"Content-Type":"application/xml; charset=utf-8","Cache-Control":"public,max-age=3600"});
});
app.get("/robots.txt", async (c) => {
  const configured=await c.env.DB.prepare("SELECT content_json FROM cms_entries WHERE entry_type='seo' AND slug='robots' AND status='published'").first();
  const body=configured?JSON.parse(configured.content_json).body:null;
  return c.text(body||`User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${new URL(c.req.url).origin}/sitemap.xml\n`);
});
app.all("/api/auth/*", (c) => handleAuth(c.req.raw, c.env));

app.post("/api/account/signup", async (c) => {
  const data = await body(c);
  const email = String(data.email || "").trim().toLowerCase();
  if (!email.includes("@") || String(data.password || "").length < 8 || !data.name) throw new HTTPError(400, "Name, valid email and an 8-character password are required.");
  const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email=?1").bind(email).first();
  if (existing) throw new HTTPError(409, "An account already exists for this email.");
  const password = await hashPassword(String(data.password));
  const userId = id();
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO users(id,email,name,mobile,password_hash,password_salt) VALUES(?1,?2,?3,?4,?5,?6)").bind(userId, email, String(data.name).trim(), data.mobile || null, password.hash, password.salt),
    c.env.DB.prepare("INSERT INTO notifications(id,user_id,channel,event_type,recipient,payload_json) VALUES(?1,?2,'email','welcome',?3,?4)").bind(id(),userId,email,json({name:String(data.name).trim()})),
  ]);
  return c.json({ id: userId, email }, 201);
});

app.post("/api/account/forgot-password", async (c) => {
  const data = await body(c);
  const user = await c.env.DB.prepare("SELECT id,email FROM users WHERE email=?1").bind(String(data.email || "").toLowerCase()).first();
  if (user) {
    const rawToken = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const tokenHash = await sha256(rawToken);
    await c.env.DB.batch([
      c.env.DB.prepare("DELETE FROM password_reset_tokens WHERE user_id=?1 OR expires_at<CURRENT_TIMESTAMP").bind(user.id),
      c.env.DB.prepare("INSERT INTO password_reset_tokens(token_hash,user_id,expires_at) VALUES(?1,?2,datetime('now','+1 hour'))").bind(tokenHash, user.id),
      c.env.DB.prepare("INSERT INTO notifications(id,user_id,channel,event_type,recipient,payload_json) VALUES(?1,?2,'email','password_reset',?3,?4)").bind(id(), user.id, user.email, json({ resetUrl: `${c.env.FRONTEND_URL}/reset-password?token=${rawToken}` })),
    ]);
  }
  return c.json({ ok: true, message: "If the account exists, a reset link has been queued." });
});

app.post("/api/account/reset-password", async (c) => {
  const data = await body(c);
  if (String(data.password || "").length < 8) throw new HTTPError(400, "Password must contain at least 8 characters.");
  const tokenHash = await sha256(String(data.token || ""));
  const token = await c.env.DB.prepare("SELECT * FROM password_reset_tokens WHERE token_hash=?1 AND used_at IS NULL AND expires_at>CURRENT_TIMESTAMP").bind(tokenHash).first();
  if (!token) throw new HTTPError(400, "Reset link is invalid or expired.");
  const password = await hashPassword(String(data.password));
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE users SET password_hash=?1,password_salt=?2,updated_at=CURRENT_TIMESTAMP WHERE id=?3").bind(password.hash, password.salt, token.user_id),
    c.env.DB.prepare("UPDATE password_reset_tokens SET used_at=CURRENT_TIMESTAMP WHERE token_hash=?1").bind(tokenHash),
  ]);
  return c.json({ ok: true });
});

app.get("/api/account/profile", async (c) => {
  const user = await requireUser(c);
  const profile = await c.env.DB.prepare("SELECT id,email,name,mobile,profile_photo_url,role,created_at FROM users WHERE id=?1").bind(user.id).first();
  return c.json(profile);
});
app.patch("/api/account/profile", async (c) => {
  const user = await requireUser(c); const data = await body(c);
  await c.env.DB.prepare("UPDATE users SET name=?1,mobile=?2,updated_at=CURRENT_TIMESTAMP WHERE id=?3").bind(data.name, data.mobile || null, user.id).run();
  return c.json({ ok: true });
});
app.post("/api/account/profile-photo", async (c) => {
  const user = await requireUser(c);
  const form = await c.req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 5_000_000) throw new HTTPError(400, "Upload a profile image under 5 MB.");
  const key = `profiles/${user.id}/${crypto.randomUUID()}.${file.type.split("/")[1] || "webp"}`;
  await c.env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type, cacheControl: "public,max-age=31536000,immutable" } });
  const url = `${new URL(c.req.url).origin}/api/media/${key}`;
  await c.env.DB.prepare("UPDATE users SET profile_photo_url=?1,updated_at=CURRENT_TIMESTAMP WHERE id=?2").bind(url, user.id).run();
  return c.json({ url });
});
app.get("/api/account/addresses", async (c) => {
  const user = await requireUser(c);
  return c.json((await c.env.DB.prepare("SELECT * FROM addresses WHERE user_id=?1 ORDER BY is_default DESC,created_at DESC").bind(user.id).all()).results);
});
app.post("/api/account/addresses", async (c) => {
  const user = await requireUser(c); const data = await body(c); const addressId = id();
  await c.env.DB.prepare("INSERT INTO addresses(id,user_id,label,recipient_name,mobile,line1,line2,city,state,pincode,is_default) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)").bind(addressId, user.id, data.label || "Home", data.recipientName, data.mobile, data.line1, data.line2 || null, data.city, data.state, data.pincode, data.isDefault ? 1 : 0).run();
  return c.json({ id: addressId }, 201);
});
app.delete("/api/account/addresses/:id", async (c) => {
  const user = await requireUser(c);
  await c.env.DB.prepare("DELETE FROM addresses WHERE id=?1 AND user_id=?2").bind(c.req.param("id"), user.id).run();
  return c.json({ ok: true });
});

app.get("/api/customer-state/:key", async (c) => {
  const user = await requireUser(c); const key = c.req.param("key");
  if (!["cart","wishlist"].includes(key)) throw new HTTPError(400, "Invalid state key.");
  const row = await c.env.DB.prepare("SELECT value_json FROM customer_state WHERE user_id=?1 AND state_key=?2").bind(user.id, key).first();
  return c.json(row ? JSON.parse(row.value_json) : []);
});
app.put("/api/customer-state/:key", async (c) => {
  const user = await requireUser(c); const key = c.req.param("key"); const data = await body(c);
  if (!["cart","wishlist"].includes(key) || !Array.isArray(data)) throw new HTTPError(400, "Invalid state payload.");
  await c.env.DB.prepare("INSERT INTO customer_state(user_id,state_key,value_json) VALUES(?1,?2,?3) ON CONFLICT(user_id,state_key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP").bind(user.id, key, json(data)).run();
  return c.json({ ok: true });
});

app.post("/api/checkout/quote", async (c) => c.json(await calculateCheckout(c.env, await body(c))));
app.post("/api/orders", async (c) => {
  const data = await body(c); const session = await sessionFor(c);
  if (!data.customer?.email || !data.customer?.phone || !data.address?.pincode) throw new HTTPError(400, "Complete contact and shipping details are required.");
  const checkout = await calculateCheckout(c.env, data);
  if (data.paymentMethod !== "cod") throw new HTTPError(400, "Use the payment order endpoint for online payments.");
  const order = await persistOrder(c.env, data, checkout, session?.user?.id, { method: "cod", status: "pending" });
  if (session?.user?.id && data.saveAddress) await c.env.DB.prepare("INSERT INTO addresses(id,user_id,label,recipient_name,mobile,line1,line2,city,state,pincode) VALUES(?1,?2,'Order address',?3,?4,?5,?6,?7,?8,?9)").bind(id(), session.user.id, data.customer.name, data.customer.phone, data.address.line1, data.address.line2 || null, data.address.city, data.address.state, data.address.pincode).run();
  return c.json(order, 201);
});
app.post("/api/payments/razorpay/order", async (c) => {
  const data = await body(c); const session = await sessionFor(c); const checkout = await calculateCheckout(c.env, data);
  const response = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", headers: { Authorization: `Basic ${btoa(`${c.env.RAZORPAY_KEY_ID}:${c.env.RAZORPAY_KEY_SECRET}`)}`, "Content-Type": "application/json" }, body: json({ amount: checkout.totalPaise, currency: "INR", receipt: `kg_${Date.now()}` }) });
  if (!response.ok) throw new HTTPError(502, "Unable to create payment order.");
  const razorpay = await response.json();
  await c.env.DB.prepare("INSERT INTO settings(key,value_json) VALUES(?1,?2) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP").bind(`payment_intent:${razorpay.id}`, json({ payload: data, checkout, userId: session?.user?.id || null, expiresAt: Date.now() + 900000 })).run();
  return c.json({ id: razorpay.id, amount: razorpay.amount, currency: razorpay.currency, keyId: c.env.RAZORPAY_KEY_ID });
});
app.post("/api/payments/razorpay/verify", async (c) => {
  const data = await body(c);
  const expected = await hmac(c.env.RAZORPAY_KEY_SECRET, `${data.razorpay_order_id}|${data.razorpay_payment_id}`);
  if (!safeEqual(expected, data.razorpay_signature || "")) throw new HTTPError(403, "Payment verification failed.");
  const intent = await c.env.DB.prepare("SELECT value_json FROM settings WHERE key=?1").bind(`payment_intent:${data.razorpay_order_id}`).first();
  if (!intent) throw new HTTPError(404, "Payment intent not found.");
  const stored = JSON.parse(intent.value_json);
  if (stored.expiresAt < Date.now()) throw new HTTPError(400, "Payment intent expired.");
  const order = await persistOrder(c.env, stored.payload, stored.checkout, stored.userId, { method: "razorpay", status: "paid", orderId: data.razorpay_order_id, paymentId: data.razorpay_payment_id });
  await c.env.DB.prepare("DELETE FROM settings WHERE key=?1").bind(`payment_intent:${data.razorpay_order_id}`).run();
  return c.json(order);
});

app.get("/api/orders", async (c) => {
  const user = await requireUser(c);
  return c.json((await c.env.DB.prepare("SELECT * FROM orders WHERE user_id=?1 ORDER BY created_at DESC").bind(user.id).all()).results);
});
app.get("/api/orders/:id", async (c) => {
  const session = await sessionFor(c);
  const order = await c.env.DB.prepare("SELECT * FROM orders WHERE id=?1").bind(c.req.param("id")).first();
  if (!order || (order.user_id && order.user_id !== session?.user?.id && session?.user?.role !== "admin")) throw new HTTPError(404, "Order not found.");
  const history = (await c.env.DB.prepare("SELECT * FROM order_status_history WHERE order_id=?1 ORDER BY created_at").bind(order.id).all()).results;
  return c.json({ ...order, history });
});
app.post("/api/orders/:id/cancel", async (c) => {
  const user = await requireUser(c);
  const result = await c.env.DB.prepare("UPDATE orders SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND user_id=?2 AND status IN ('pending','confirmed')").bind(c.req.param("id"), user.id).run();
  if (!result.meta.changes) throw new HTTPError(409, "Order can no longer be cancelled.");
  await c.env.DB.prepare("INSERT INTO order_status_history(id,order_id,status,note) VALUES(?1,?2,'cancelled','Cancelled by customer')").bind(id(), c.req.param("id")).run();
  return c.json({ ok: true });
});
app.post("/api/orders/:id/return", async (c) => {
  const user = await requireUser(c); const data = await body(c);
  const order = await c.env.DB.prepare("SELECT id FROM orders WHERE id=?1 AND user_id=?2 AND status='delivered'").bind(c.req.param("id"), user.id).first();
  if (!order) throw new HTTPError(409, "Only delivered orders can be returned.");
  const returnId = id();
  await c.env.DB.prepare("INSERT INTO returns(id,order_id,user_id,reason) VALUES(?1,?2,?3,?4)").bind(returnId, order.id, user.id, data.reason).run();
  return c.json({ id: returnId, status: "pending" }, 201);
});
app.get("/api/orders/:id/invoice", async (c) => {
  const user = await requireUser(c);
  const order = await c.env.DB.prepare("SELECT invoice_key FROM orders WHERE id=?1 AND (user_id=?2 OR ?3='admin')").bind(c.req.param("id"), user.id, user.role).first();
  if (!order?.invoice_key) throw new HTTPError(404, "Invoice not found.");
  const object = await c.env.MEDIA.get(order.invoice_key);
  return new Response(object.body, { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${c.req.param("id")}-invoice.json"` } });
});

app.get("/api/media/*", async (c) => {
  const key = c.req.path.replace("/api/media/", "");
  const object = await c.env.MEDIA.get(key);
  if (!object) throw new HTTPError(404, "Media not found.");
  return new Response(object.body, { headers: { "Content-Type": object.httpMetadata?.contentType || "application/octet-stream", "Cache-Control": object.httpMetadata?.cacheControl || "public,max-age=3600", ETag: object.httpEtag } });
});
app.post("/api/analytics/events", async (c) => {
  const data = await body(c); const session = await sessionFor(c);
  await c.env.DB.prepare("INSERT INTO analytics_events(id,user_id,session_id,event_name,properties_json) VALUES(?1,?2,?3,?4,?5)").bind(id(), session?.user?.id || null, data.sessionId || null, data.eventName, json(data.properties || {})).run();
  return c.json({ ok: true }, 202);
});

app.get("/api/catalog", async (c) => {
  const [categories, products, variants] = await c.env.DB.batch([
    c.env.DB.prepare("SELECT * FROM categories WHERE active=1 ORDER BY sort_order,name"),
    c.env.DB.prepare("SELECT p.*,c.slug category_slug,(SELECT ROUND(AVG(r.rating),1) FROM reviews r WHERE r.product_id=p.id AND r.status='published') rating,(SELECT COUNT(*) FROM reviews r WHERE r.product_id=p.id AND r.status='published') review_count FROM products p JOIN categories c ON c.id=p.category_id WHERE p.active=1 AND p.archived=0 AND p.status='published' ORDER BY p.featured DESC,p.created_at DESC"),
    c.env.DB.prepare("SELECT * FROM product_variants WHERE active=1 ORDER BY is_default DESC,created_at"),
  ]);
  const variantsByProduct = Object.groupBy(variants.results, (variant) => variant.product_id);
  return c.json({ categories: categories.results, products: products.results.map((product) => ({ ...product, variants: variantsByProduct[product.id] || [] })) });
});
app.get("/api/content/homepage", async (c) => c.json((await c.env.DB.prepare("SELECT * FROM homepage_sections WHERE enabled=1 ORDER BY sort_order").all()).results));
app.get("/api/content/digital", async (c) => c.json((await c.env.DB.prepare("SELECT * FROM digital_content WHERE status='published' ORDER BY featured DESC,published_at DESC").all()).results));
app.get("/api/content/site", async (c) => {
  const [entries, menus] = await c.env.DB.batch([
    c.env.DB.prepare("SELECT id,entry_type,slug,title,excerpt,content_json,seo_json,visibility,parent_id,sort_order,updated_at FROM cms_entries WHERE status='published' AND (publish_at IS NULL OR publish_at<=CURRENT_TIMESTAMP) AND (expires_at IS NULL OR expires_at>CURRENT_TIMESTAMP) ORDER BY entry_type,sort_order"),
    c.env.DB.prepare("SELECT m.*,a.url media_url FROM menu_items m LEFT JOIN media_assets a ON a.id=m.media_id WHERE m.enabled=1 ORDER BY m.menu_location,m.sort_order"),
  ]);
  return c.json({ entries: entries.results, menus: menus.results });
});
app.get("/api/content/blog", async (c) => c.json((await c.env.DB.prepare("SELECT id,slug,title,excerpt,content_json,seo_json,publish_at,updated_at FROM cms_entries WHERE entry_type='blog' AND status='published' AND (publish_at IS NULL OR publish_at<=CURRENT_TIMESTAMP) ORDER BY COALESCE(publish_at,created_at) DESC").all()).results));
app.get("/api/content/blog/:slug", async (c) => {
  const entry = await c.env.DB.prepare("SELECT * FROM cms_entries WHERE entry_type='blog' AND slug=?1 AND status='published' AND (publish_at IS NULL OR publish_at<=CURRENT_TIMESTAMP)").bind(c.req.param("slug")).first();
  if (!entry) throw new HTTPError(404, "Article not found.");
  return c.json(entry);
});

const cmsUser = async (c) => {
  const user = await requireUser(c);
  if (user.role === "admin") return { ...user, role: "admin" };
  const assigned = await c.env.DB.prepare("SELECT role FROM user_permissions WHERE user_id=?1").bind(user.id).first();
  if (!assigned) throw new HTTPError(403, "CMS access required.");
  return { ...user, role: assigned.role };
};
const canAccess = (role, path, method) => {
  if (role === "admin") return true;
  if (role === "staff") return path.includes("/orders") || path.endsWith("/dashboard");
  if (role === "manager") return !path.includes("/settings") && !path.includes("/activity") && !path.includes("/permissions") && !(method === "DELETE" && path.includes("/customers"));
  return false;
};
const audit = (c, action, resourceType, resourceId, details = {}) => c.env.DB.prepare("INSERT INTO activity_logs(id,actor_user_id,action,resource_type,resource_id,details_json,ip_address) VALUES(?1,?2,?3,?4,?5,?6,?7)").bind(id(), c.get("admin").id, action, resourceType, resourceId || null, json(details), c.req.header("CF-Connecting-IP") || null).run();

app.use("/api/admin/*", async (c, next) => {
  const admin = await cmsUser(c);
  if (!canAccess(admin.role, c.req.path, c.req.method)) throw new HTTPError(403, "Your role cannot perform this action.");
  c.set("admin", admin);
  await next();
});
app.get("/api/admin/dashboard", async (c) => {
  const [revenue, orders, pending, products, categories, customers, inventory, lowStock, today, recent, monthly, topProducts, topCategories] = await c.env.DB.batch([
    c.env.DB.prepare("SELECT COALESCE(SUM(total_paise),0) value FROM orders WHERE payment_status='paid' OR payment_method='cod'"),
    c.env.DB.prepare("SELECT COUNT(*) value FROM orders"),
    c.env.DB.prepare("SELECT COUNT(*) value FROM orders WHERE status IN ('pending','confirmed')"),
    c.env.DB.prepare("SELECT COUNT(*) value FROM products WHERE archived=0"),
    c.env.DB.prepare("SELECT COUNT(*) value FROM categories WHERE active=1"),
    c.env.DB.prepare("SELECT COUNT(*) value FROM users WHERE role='customer'"),
    c.env.DB.prepare("SELECT COALESCE(SUM(stock),0) value FROM product_variants WHERE active=1"),
    c.env.DB.prepare("SELECT COUNT(*) value FROM product_variants WHERE stock<=low_stock_threshold"),
    c.env.DB.prepare("SELECT COUNT(*) value FROM orders WHERE date(created_at)=date('now')"),
    c.env.DB.prepare("SELECT id,order_number,customer_name,status,total_paise,created_at FROM orders ORDER BY created_at DESC LIMIT 6"),
    c.env.DB.prepare("SELECT strftime('%Y-%m',created_at) month,COUNT(*) orders,COALESCE(SUM(total_paise),0) revenue_paise FROM orders GROUP BY month ORDER BY month DESC LIMIT 12"),
    c.env.DB.prepare("SELECT oi.product_name,SUM(oi.quantity) units FROM order_items oi GROUP BY oi.product_id ORDER BY units DESC LIMIT 5"),
    c.env.DB.prepare("SELECT c.name,SUM(oi.quantity) units FROM order_items oi JOIN products p ON p.id=oi.product_id JOIN categories c ON c.id=p.category_id GROUP BY c.id ORDER BY units DESC LIMIT 5"),
  ]);
  return c.json({
    revenuePaise: revenue.results[0].value, orders: orders.results[0].value, pendingOrders: pending.results[0].value,
    products: products.results[0].value, categories: categories.results[0].value, customers: customers.results[0].value,
    inventory: inventory.results[0].value, lowStock: lowStock.results[0].value, todayOrders: today.results[0].value,
    recentOrders: recent.results, monthly: monthly.results.reverse(), topProducts: topProducts.results, topCategories: topCategories.results,
  });
});
app.get("/api/admin/analytics/overview", async (c) => {
  const [monthly, products, categories, sessions] = await c.env.DB.batch([
    c.env.DB.prepare("SELECT strftime('%Y-%m',created_at) month,COUNT(*) orders,SUM(total_paise) revenue_paise FROM orders GROUP BY month ORDER BY month DESC LIMIT 24"),
    c.env.DB.prepare("SELECT oi.product_name,SUM(oi.quantity) units,SUM(oi.unit_price_paise*oi.quantity) revenue_paise FROM order_items oi GROUP BY oi.product_id ORDER BY units DESC LIMIT 10"),
    c.env.DB.prepare("SELECT p.category_id,c.name,SUM(oi.quantity) units FROM order_items oi JOIN products p ON p.id=oi.product_id JOIN categories c ON c.id=p.category_id GROUP BY p.category_id ORDER BY units DESC LIMIT 10"),
    c.env.DB.prepare("SELECT COUNT(DISTINCT session_id) sessions,(SELECT COUNT(*) FROM orders) orders FROM analytics_events"),
  ]);
  const sessionRow = sessions.results[0] || { sessions: 0, orders: 0 };
  return c.json({ monthly: monthly.results, bestSellingProducts: products.results, topCategories: categories.results, conversionRate: sessionRow.sessions ? sessionRow.orders / sessionRow.sessions * 100 : 0 });
});
app.get("/api/admin/inventory/:id/history", async (c) => c.json((await c.env.DB.prepare("SELECT h.*,u.name actor_name FROM inventory_history h LEFT JOIN users u ON u.id=h.actor_user_id WHERE h.variant_id=?1 ORDER BY h.created_at DESC LIMIT 250").bind(c.req.param("id")).all()).results));
app.get("/api/admin/:resource", async (c) => {
  const resource = c.req.param("resource");
  const queries = {
    products: "SELECT p.*,c.name category_name,(SELECT COUNT(*) FROM product_variants v WHERE v.product_id=p.id) variant_count,(SELECT COALESCE(SUM(stock),0) FROM product_variants v WHERE v.product_id=p.id) stock FROM products p JOIN categories c ON c.id=p.category_id ORDER BY p.archived,p.updated_at DESC",
    categories: "SELECT * FROM categories ORDER BY sort_order,name",
    orders: "SELECT * FROM orders ORDER BY created_at DESC LIMIT 250",
    customers: "SELECT u.id,u.email,u.name,u.mobile,COALESCE(up.role,u.role) role,u.created_at,(SELECT COUNT(*) FROM orders o WHERE o.user_id=u.id) orders_count,(SELECT COALESCE(SUM(total_paise),0) FROM orders o WHERE o.user_id=u.id) lifetime_value_paise FROM users u LEFT JOIN user_permissions up ON up.user_id=u.id ORDER BY u.created_at DESC LIMIT 500",
    inventory: "SELECT v.*,p.name product_name FROM product_variants v JOIN products p ON p.id=v.product_id ORDER BY v.stock",
    coupons: "SELECT * FROM coupons ORDER BY created_at DESC",
    reviews: "SELECT r.*,p.name product_name,u.name customer_name FROM reviews r JOIN products p ON p.id=r.product_id JOIN users u ON u.id=r.user_id ORDER BY r.created_at DESC",
    banners: "SELECT * FROM banners ORDER BY sort_order,created_at DESC",
    settings: "SELECT * FROM settings WHERE key NOT LIKE 'payment_intent:%' ORDER BY key",
    analytics: "SELECT strftime('%Y-%m',created_at) month,COUNT(*) orders,SUM(total_paise) revenue_paise FROM orders GROUP BY month ORDER BY month DESC LIMIT 24",
    media: "SELECT m.*,u.name created_by_name FROM media_assets m LEFT JOIN users u ON u.id=m.created_by ORDER BY m.created_at DESC LIMIT 500",
    homepage: "SELECT * FROM homepage_sections ORDER BY sort_order",
    digital: "SELECT * FROM digital_content ORDER BY updated_at DESC",
    seo: "SELECT * FROM seo_entries ORDER BY route",
    activity: "SELECT l.*,u.name actor_name,u.email actor_email FROM activity_logs l LEFT JOIN users u ON u.id=l.actor_user_id ORDER BY l.created_at DESC LIMIT 500",
    content: "SELECT e.*,u.name updated_by_name FROM cms_entries e LEFT JOIN users u ON u.id=e.updated_by ORDER BY e.entry_type,e.sort_order,e.updated_at DESC",
  };
  if (!queries[resource]) throw new HTTPError(404, "Admin module not found.");
  return c.json((await c.env.DB.prepare(queries[resource]).all()).results);
});
app.get("/api/admin/content/:id/versions", async (c) => c.json((await c.env.DB.prepare("SELECT v.*,u.name created_by_name FROM cms_versions v LEFT JOIN users u ON u.id=v.created_by WHERE v.entry_id=?1 ORDER BY v.version DESC").bind(c.req.param("id")).all()).results));
app.get("/api/admin/content-system/:resource", async (c) => {
  const queries = {
    menus: "SELECT m.*,a.url media_url FROM menu_items m LEFT JOIN media_assets a ON a.id=m.media_id ORDER BY m.menu_location,m.sort_order",
    emails: "SELECT * FROM email_templates ORDER BY name",
    taxonomies: "SELECT * FROM cms_taxonomies ORDER BY taxonomy_type,sort_order,name",
  };
  const query = queries[c.req.param("resource")];
  if (!query) throw new HTTPError(404, "Content resource not found.");
  return c.json((await c.env.DB.prepare(query).all()).results);
});
app.post("/api/admin/content", async (c) => {
  const data = await body(c); const entryId = data.id || id(); const existing = data.id ? await c.env.DB.prepare("SELECT * FROM cms_entries WHERE id=?1").bind(data.id).first() : null;
  if (!data.entryType || !data.slug || !data.title) throw new HTTPError(400, "Content type, slug and title are required.");
  const version = Number(existing?.current_version || 0) + 1;
  const contentJson = typeof data.content === "string" ? data.content : json(data.content || {});
  const seoJson = typeof data.seo === "string" ? data.seo : json(data.seo || {});
  const snapshot = json({ entryType:data.entryType,slug:data.slug,title:data.title,excerpt:data.excerpt||null,content:JSON.parse(contentJson),seo:JSON.parse(seoJson),status:data.status||"draft",publishAt:data.publishAt||null,expiresAt:data.expiresAt||null,visibility:data.visibility||"sitewide",parentId:data.parentId||null,sortOrder:Number(data.sortOrder)||0 });
  await c.env.DB.batch([
    c.env.DB.prepare(`INSERT INTO cms_entries(id,entry_type,slug,title,excerpt,content_json,seo_json,status,publish_at,expires_at,visibility,parent_id,sort_order,current_version,created_by,updated_by)
      VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?15)
      ON CONFLICT(id) DO UPDATE SET entry_type=excluded.entry_type,slug=excluded.slug,title=excluded.title,excerpt=excluded.excerpt,content_json=excluded.content_json,seo_json=excluded.seo_json,status=excluded.status,publish_at=excluded.publish_at,expires_at=excluded.expires_at,visibility=excluded.visibility,parent_id=excluded.parent_id,sort_order=excluded.sort_order,current_version=excluded.current_version,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`)
      .bind(entryId,data.entryType,data.slug,data.title,data.excerpt||null,contentJson,seoJson,data.status||"draft",data.publishAt||null,data.expiresAt||null,data.visibility||"sitewide",data.parentId||null,Number(data.sortOrder)||0,version,c.get("admin").id),
    c.env.DB.prepare("INSERT INTO cms_versions(id,entry_id,version,snapshot_json,change_note,created_by) VALUES(?1,?2,?3,?4,?5,?6)").bind(id(),entryId,version,snapshot,data.changeNote||null,c.get("admin").id),
  ]);
  await audit(c, existing ? "updated" : "created", "content", entryId, { entryType:data.entryType,version });
  return c.json({id:entryId,version});
});
app.post("/api/admin/content/:id/rollback/:version", async (c) => {
  const record = await c.env.DB.prepare("SELECT snapshot_json FROM cms_versions WHERE entry_id=?1 AND version=?2").bind(c.req.param("id"),Number(c.req.param("version"))).first();
  if (!record) throw new HTTPError(404,"Version not found.");
  const snapshot = JSON.parse(record.snapshot_json); const current = await c.env.DB.prepare("SELECT current_version FROM cms_entries WHERE id=?1").bind(c.req.param("id")).first();
  const nextVersion = Number(current.current_version)+1;
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE cms_entries SET entry_type=?1,slug=?2,title=?3,excerpt=?4,content_json=?5,seo_json=?6,status=?7,publish_at=?8,expires_at=?9,visibility=?10,parent_id=?11,sort_order=?12,current_version=?13,updated_by=?14,updated_at=CURRENT_TIMESTAMP WHERE id=?15").bind(snapshot.entryType,snapshot.slug,snapshot.title,snapshot.excerpt||null,json(snapshot.content||{}),json(snapshot.seo||{}),snapshot.status||"draft",snapshot.publishAt||null,snapshot.expiresAt||null,snapshot.visibility||"sitewide",snapshot.parentId||null,Number(snapshot.sortOrder)||0,nextVersion,c.get("admin").id,c.req.param("id")),
    c.env.DB.prepare("INSERT INTO cms_versions(id,entry_id,version,snapshot_json,change_note,created_by) VALUES(?1,?2,?3,?4,?5,?6)").bind(id(),c.req.param("id"),nextVersion,record.snapshot_json,`Rollback to version ${c.req.param("version")}`,c.get("admin").id),
  ]);
  await audit(c,"rolled_back","content",c.req.param("id"),{fromVersion:c.req.param("version"),newVersion:nextVersion});
  return c.json({ok:true,version:nextVersion});
});
app.patch("/api/admin/content/reorder", async (c) => {
  const data=await body(c); const statements=(data.items||[]).map((item,index)=>c.env.DB.prepare("UPDATE cms_entries SET sort_order=?1,updated_at=CURRENT_TIMESTAMP WHERE id=?2").bind(index*10,item.id));
  if(statements.length)await c.env.DB.batch(statements);
  await audit(c,"reordered","content",null,{count:statements.length});
  return c.json({updated:statements.length});
});
app.delete("/api/admin/content/:id", async (c) => {
  await c.env.DB.prepare("DELETE FROM cms_entries WHERE id=?1").bind(c.req.param("id")).run();
  await audit(c,"deleted","content",c.req.param("id"));
  return c.json({ok:true});
});
app.post("/api/admin/content-system/menus", async (c) => {
  const data=await body(c); const menuId=data.id||id();
  await c.env.DB.prepare("INSERT INTO menu_items(id,menu_location,parent_id,label,url,description,media_id,mega_menu,enabled,sort_order) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10) ON CONFLICT(id) DO UPDATE SET menu_location=excluded.menu_location,parent_id=excluded.parent_id,label=excluded.label,url=excluded.url,description=excluded.description,media_id=excluded.media_id,mega_menu=excluded.mega_menu,enabled=excluded.enabled,sort_order=excluded.sort_order,updated_at=CURRENT_TIMESTAMP").bind(menuId,data.menuLocation||"main",data.parentId||null,data.label,data.url,data.description||null,data.mediaId||null,data.megaMenu?1:0,data.enabled===false?0:1,Number(data.sortOrder)||0).run();
  await audit(c,data.id?"updated":"created","menu",menuId,{label:data.label});
  return c.json({id:menuId});
});
app.delete("/api/admin/content-system/menus/:id", async (c) => {
  await c.env.DB.prepare("DELETE FROM menu_items WHERE id=?1").bind(c.req.param("id")).run();
  await audit(c,"deleted","menu",c.req.param("id"));
  return c.json({ok:true});
});
app.patch("/api/admin/content-system/menus/reorder", async (c) => {
  const data=await body(c);const statements=(data.items||[]).map((item,index)=>c.env.DB.prepare("UPDATE menu_items SET sort_order=?1,updated_at=CURRENT_TIMESTAMP WHERE id=?2").bind(index*10,item.id));
  if(statements.length)await c.env.DB.batch(statements);
  await audit(c,"reordered","menu",null,{count:statements.length});
  return c.json({updated:statements.length});
});
app.put("/api/admin/content-system/emails/:id", async (c) => {
  const data=await body(c);
  await c.env.DB.prepare("UPDATE email_templates SET name=?1,subject=?2,preheader=?3,html_content=?4,text_content=?5,enabled=?6,current_version=current_version+1,updated_by=?7,updated_at=CURRENT_TIMESTAMP WHERE id=?8").bind(data.name,data.subject,data.preheader||null,data.htmlContent,data.textContent||null,data.enabled===false?0:1,c.get("admin").id,c.req.param("id")).run();
  await audit(c,"updated","email_template",c.req.param("id"),{name:data.name});
  return c.json({ok:true});
});
app.get("/api/admin/products/:id", async (c) => {
  const [product, variants, media, packaging] = await c.env.DB.batch([
    c.env.DB.prepare("SELECT * FROM products WHERE id=?1").bind(c.req.param("id")),
    c.env.DB.prepare("SELECT * FROM product_variants WHERE product_id=?1 ORDER BY is_default DESC,created_at").bind(c.req.param("id")),
    c.env.DB.prepare("SELECT pm.*,m.url,m.file_name,m.alt_text FROM product_media pm JOIN media_assets m ON m.id=pm.media_id WHERE pm.product_id=?1 ORDER BY pm.sort_order").bind(c.req.param("id")),
    c.env.DB.prepare("SELECT pa.*,m.url,m.file_name FROM packaging_assets pa JOIN media_assets m ON m.id=pa.media_id WHERE pa.product_id=?1").bind(c.req.param("id")),
  ]);
  if (!product.results[0]) throw new HTTPError(404, "Product not found.");
  return c.json({ ...product.results[0], variants: variants.results, media: media.results, packaging: packaging.results });
});
app.post("/api/admin/products", async (c) => {
  const admin = c.get("admin"); const data = await body(c); const productId = data.id || id();
  if (!data.name || !data.slug || !data.categoryId) throw new HTTPError(400, "Name, slug and category are required.");
  await c.env.DB.prepare(`INSERT INTO products(id,category_id,name,slug,brand,subcategory,description,benefits,ingredients,nutrition,storage,shelf_life,country_of_origin,hsn_code,gst_basis_points,barcode,image_url,detail_image_url,seo_title,seo_description,featured,best_seller,new_arrival,active,status,archived)
    VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23,?24,?25,?26)
    ON CONFLICT(id) DO UPDATE SET category_id=excluded.category_id,name=excluded.name,slug=excluded.slug,brand=excluded.brand,subcategory=excluded.subcategory,description=excluded.description,benefits=excluded.benefits,ingredients=excluded.ingredients,nutrition=excluded.nutrition,storage=excluded.storage,shelf_life=excluded.shelf_life,country_of_origin=excluded.country_of_origin,hsn_code=excluded.hsn_code,gst_basis_points=excluded.gst_basis_points,barcode=excluded.barcode,image_url=excluded.image_url,detail_image_url=excluded.detail_image_url,seo_title=excluded.seo_title,seo_description=excluded.seo_description,featured=excluded.featured,best_seller=excluded.best_seller,new_arrival=excluded.new_arrival,active=excluded.active,status=excluded.status,archived=excluded.archived,updated_at=CURRENT_TIMESTAMP`)
    .bind(productId,data.categoryId,data.name,data.slug,data.brand||"Kisan Gaurav",data.subcategory||null,data.description||null,data.benefits||null,data.ingredients||null,data.nutrition||null,data.storage||null,data.shelfLife||null,data.countryOfOrigin||"India",data.hsnCode||null,Number(data.gstBasisPoints)||500,data.barcode||null,data.imageUrl||null,data.detailImageUrl||null,data.seoTitle||null,data.seoDescription||null,data.featured?1:0,data.bestSeller?1:0,data.newArrival?1:0,data.active===false?0:1,data.status||"draft",data.archived?1:0).run();
  if (Array.isArray(data.variants)) for (const variant of data.variants) await c.env.DB.prepare(`INSERT INTO product_variants(id,product_id,name,sku,price_paise,compare_at_price_paise,mrp_paise,discount_basis_points,festival_price_paise,bulk_price_paise,wholesale_price_paise,stock,low_stock_threshold,weight_grams,is_default,active)
    VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,sku=excluded.sku,price_paise=excluded.price_paise,compare_at_price_paise=excluded.compare_at_price_paise,mrp_paise=excluded.mrp_paise,discount_basis_points=excluded.discount_basis_points,festival_price_paise=excluded.festival_price_paise,bulk_price_paise=excluded.bulk_price_paise,wholesale_price_paise=excluded.wholesale_price_paise,stock=excluded.stock,low_stock_threshold=excluded.low_stock_threshold,weight_grams=excluded.weight_grams,is_default=excluded.is_default,active=excluded.active,updated_at=CURRENT_TIMESTAMP`)
    .bind(variant.id||id(),productId,variant.name,variant.sku,Number(variant.pricePaise)||0,variant.compareAtPricePaise||null,variant.mrpPaise||null,Number(variant.discountBasisPoints)||0,variant.festivalPricePaise||null,variant.bulkPricePaise||null,variant.wholesalePricePaise||null,Math.max(0,Number(variant.stock)||0),Math.max(0,Number(variant.lowStockThreshold)||5),variant.weightGrams||null,variant.isDefault?1:0,variant.active===false?0:1).run();
  await Promise.all([audit(c, data.id ? "updated" : "created", "product", productId, { name: data.name }), c.env.DB.prepare("INSERT INTO analytics_events(id,user_id,event_name,properties_json) VALUES(?1,?2,'admin_product_save',?3)").bind(id(), admin.id, json({ productId })).run()]);
  return c.json({ id: productId });
});
app.post("/api/admin/products/:id/duplicate", async (c) => {
  const source = await c.env.DB.prepare("SELECT * FROM products WHERE id=?1").bind(c.req.param("id")).first();
  if (!source) throw new HTTPError(404, "Product not found.");
  const productId = id(); const suffix = crypto.randomUUID().slice(0, 6);
  await c.env.DB.prepare("INSERT INTO products(id,category_id,name,slug,brand,subcategory,description,benefits,ingredients,nutrition,storage,shelf_life,country_of_origin,hsn_code,gst_basis_points,barcode,image_url,detail_image_url,seo_title,seo_description,status,active) SELECT ?1,category_id,name||' (Copy)',slug||'-copy-'||?2,brand,subcategory,description,benefits,ingredients,nutrition,storage,shelf_life,country_of_origin,hsn_code,gst_basis_points,NULL,image_url,detail_image_url,seo_title,seo_description,'draft',0 FROM products WHERE id=?3").bind(productId,suffix,source.id).run();
  const variants = (await c.env.DB.prepare("SELECT * FROM product_variants WHERE product_id=?1").bind(source.id).all()).results;
  for (const variant of variants) await c.env.DB.prepare("INSERT INTO product_variants(id,product_id,name,sku,price_paise,compare_at_price_paise,mrp_paise,stock,low_stock_threshold,weight_grams,active) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,0)").bind(id(),productId,variant.name,`${variant.sku}-COPY-${suffix}`,variant.price_paise,variant.compare_at_price_paise,variant.mrp_paise,variant.stock,variant.low_stock_threshold,variant.weight_grams).run();
  await audit(c, "duplicated", "product", productId, { sourceId: source.id });
  return c.json({ id: productId }, 201);
});
app.post("/api/admin/categories", async (c) => {
  const data = await body(c); const categoryId = data.id || id();
  await c.env.DB.prepare(`INSERT INTO categories(id,name,slug,description,short_description,long_description,seo_title,seo_description,image_url,hero_image_url,banner_image_url,thumbnail_url,featured,homepage_visible,navigation_visible,active,sort_order)
    VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,slug=excluded.slug,description=excluded.description,short_description=excluded.short_description,long_description=excluded.long_description,seo_title=excluded.seo_title,seo_description=excluded.seo_description,image_url=excluded.image_url,hero_image_url=excluded.hero_image_url,banner_image_url=excluded.banner_image_url,thumbnail_url=excluded.thumbnail_url,featured=excluded.featured,homepage_visible=excluded.homepage_visible,navigation_visible=excluded.navigation_visible,active=excluded.active,sort_order=excluded.sort_order,updated_at=CURRENT_TIMESTAMP`)
    .bind(categoryId,data.name,data.slug,data.shortDescription||null,data.shortDescription||null,data.longDescription||null,data.seoTitle||null,data.seoDescription||null,data.thumbnailUrl||null,data.heroImageUrl||null,data.bannerImageUrl||null,data.thumbnailUrl||null,data.featured?1:0,data.homepageVisible===false?0:1,data.navigationVisible===false?0:1,data.active===false?0:1,Number(data.sortOrder)||0).run();
  await audit(c, data.id ? "updated" : "created", "category", categoryId, { name: data.name });
  return c.json({ id: categoryId });
});
app.post("/api/admin/coupons", async (c) => {
  const data=await body(c);const couponId=data.id||id();
  if(!["percent","flat"].includes(data.type))throw new HTTPError(400,"Invalid coupon type.");
  await c.env.DB.prepare("INSERT INTO coupons(id,code,type,value,minimum_order_paise,expires_at,usage_limit,enabled) VALUES(?1,?2,?3,?4,?5,?6,?7,?8) ON CONFLICT(id) DO UPDATE SET code=excluded.code,type=excluded.type,value=excluded.value,minimum_order_paise=excluded.minimum_order_paise,expires_at=excluded.expires_at,usage_limit=excluded.usage_limit,enabled=excluded.enabled,updated_at=CURRENT_TIMESTAMP").bind(couponId,String(data.code).toUpperCase(),data.type,data.value,data.minimumOrderPaise||0,data.expiresAt||null,data.usageLimit||null,data.enabled===false?0:1).run();
  await audit(c, data.id ? "updated" : "created", "coupon", couponId, { code: data.code });
  return c.json({id:couponId});
});
app.post("/api/admin/banners", async (c) => {
  const data=await body(c);const bannerId=data.id||id();
  await c.env.DB.prepare("INSERT INTO banners(id,title,subtitle,image_url,link_url,starts_at,ends_at,active,sort_order,banner_type,device) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11) ON CONFLICT(id) DO UPDATE SET title=excluded.title,subtitle=excluded.subtitle,image_url=excluded.image_url,link_url=excluded.link_url,starts_at=excluded.starts_at,ends_at=excluded.ends_at,active=excluded.active,sort_order=excluded.sort_order,banner_type=excluded.banner_type,device=excluded.device,updated_at=CURRENT_TIMESTAMP").bind(bannerId,data.title,data.subtitle||null,data.imageUrl,data.linkUrl||null,data.startsAt||null,data.endsAt||null,data.active===false?0:1,data.sortOrder||0,data.bannerType||"homepage",data.device||"both").run();
  await audit(c, data.id ? "updated" : "created", "banner", bannerId, { title: data.title });
  return c.json({id:bannerId});
});
app.patch("/api/admin/reviews/:id", async (c) => {
  const data=await body(c);if(data.status && !["pending","published","rejected"].includes(data.status))throw new HTTPError(400,"Invalid review status.");
  await c.env.DB.prepare("UPDATE reviews SET status=COALESCE(?1,status),featured=COALESCE(?2,featured),updated_at=CURRENT_TIMESTAMP WHERE id=?3").bind(data.status||null,data.featured===undefined?null:(data.featured?1:0),c.req.param("id")).run();
  await audit(c, "moderated", "review", c.req.param("id"), data);
  return c.json({ok:true});
});
app.put("/api/admin/settings/:key", async (c) => {
  const data=await body(c);
  await c.env.DB.prepare("INSERT INTO settings(key,value_json) VALUES(?1,?2) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP").bind(c.req.param("key"),json(data)).run();
  await audit(c, "updated", "setting", c.req.param("key"));
  return c.json({ok:true});
});
app.delete("/api/admin/products/:id", async (c) => {
  await c.env.DB.prepare("UPDATE products SET archived=1,active=0,status='archived',updated_at=CURRENT_TIMESTAMP WHERE id=?1").bind(c.req.param("id")).run();
  await audit(c, "archived", "product", c.req.param("id"));
  return c.json({ ok: true });
});
app.delete("/api/admin/categories/:id", async (c) => {
  const used = await c.env.DB.prepare("SELECT COUNT(*) count FROM products WHERE category_id=?1 AND archived=0").bind(c.req.param("id")).first();
  if (used.count) throw new HTTPError(409, "Move or archive products in this category first.");
  await c.env.DB.prepare("DELETE FROM categories WHERE id=?1").bind(c.req.param("id")).run();
  await audit(c, "deleted", "category", c.req.param("id"));
  return c.json({ ok: true });
});
app.patch("/api/admin/categories/reorder", async (c) => {
  const data = await body(c);
  const statements = (data.items || []).map((item, index) => c.env.DB.prepare("UPDATE categories SET sort_order=?1,updated_at=CURRENT_TIMESTAMP WHERE id=?2").bind(index * 10, item.id));
  if (statements.length) await c.env.DB.batch(statements);
  await audit(c, "reordered", "category", null, { count: statements.length });
  return c.json({ updated: statements.length });
});
app.patch("/api/admin/orders/:id/status", async (c) => {
  const data = await body(c);
  if (!["pending","confirmed","packed","shipped","delivered","cancelled","returned","refunded"].includes(data.status)) throw new HTTPError(400, "Invalid order status.");
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE orders SET status=?1,tracking_number=COALESCE(?2,tracking_number),updated_at=CURRENT_TIMESTAMP WHERE id=?3").bind(data.status, data.trackingNumber || null, c.req.param("id")),
    c.env.DB.prepare("INSERT INTO order_status_history(id,order_id,status,note) VALUES(?1,?2,?3,?4)").bind(id(), c.req.param("id"), data.status, data.note || null),
  ]);
  await audit(c, "status_changed", "order", c.req.param("id"), { status: data.status });
  return c.json({ ok: true });
});
app.patch("/api/admin/inventory/bulk", async (c) => {
  const admin = c.get("admin"); const data = await body(c); const statements = [];
  for (const entry of data.items || []) {
    statements.push(c.env.DB.prepare("UPDATE product_variants SET stock=?1,updated_at=CURRENT_TIMESTAMP WHERE id=?2").bind(Math.max(0, entry.stock), entry.variantId));
    statements.push(c.env.DB.prepare("INSERT INTO inventory_history(id,variant_id,change_quantity,balance_after,reason,actor_user_id) VALUES(?1,?2,?3,?4,'bulk_update',?5)").bind(id(), entry.variantId, entry.change || 0, Math.max(0, entry.stock), admin.id));
  }
  if (statements.length) await c.env.DB.batch(statements);
  return c.json({ updated: (data.items || []).length });
});
app.post("/api/admin/uploads", async (c) => {
  const form = await c.req.formData(); const file = form.get("file");
  const allowed = file instanceof File && (file.type.startsWith("image/") || file.type.startsWith("video/") || file.type === "application/pdf" || file.type.startsWith("text/") || file.type.includes("document"));
  const maxSize = file instanceof File && file.type.startsWith("video/") ? 50_000_000 : 12_000_000;
  if (!allowed || file.size > maxSize) throw new HTTPError(400, "Upload an image, video or document within the allowed size.");
  const folder = String(form.get("folder") || "general").replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "general";
  const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || (file.type === "application/pdf" ? "pdf" : "webp");
  const key = `${folder}/${crypto.randomUUID()}.${extension}`;
  await c.env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type, cacheControl: "public,max-age=31536000,immutable" } });
  const mediaId = id(); const url = `${new URL(c.req.url).origin}/api/media/${key}`;
  await c.env.DB.prepare("INSERT INTO media_assets(id,key,url,file_name,folder,mime_type,size_bytes,alt_text,created_by) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)").bind(mediaId,key,url,file.name,folder,file.type,file.size,String(form.get("altText")||"")||null,c.get("admin").id).run();
  await audit(c, "uploaded", "media", mediaId, { fileName: file.name, key });
  return c.json({ id: mediaId, key, url, fileName: file.name }, 201);
});
app.put("/api/admin/media/:id/replace", async (c) => {
  const current=await c.env.DB.prepare("SELECT * FROM media_assets WHERE id=?1").bind(c.req.param("id")).first();
  if(!current)throw new HTTPError(404,"Media not found.");
  const form=await c.req.formData(); const file=form.get("file");
  if(!(file instanceof File)||file.size>50_000_000)throw new HTTPError(400,"Choose a replacement under 50 MB.");
  const extension=file.name.split(".").pop()?.replace(/[^a-z0-9]/gi,"")||"bin"; const key=`${current.folder}/${crypto.randomUUID()}.${extension}`;
  await c.env.MEDIA.put(key,file.stream(),{httpMetadata:{contentType:file.type,cacheControl:"public,max-age=31536000,immutable"}});
  const url=`${new URL(c.req.url).origin}/api/media/${key}`;
  await c.env.DB.prepare("UPDATE media_assets SET key=?1,url=?2,file_name=?3,mime_type=?4,size_bytes=?5,updated_at=CURRENT_TIMESTAMP WHERE id=?6").bind(key,url,file.name,file.type,file.size,current.id).run();
  await c.env.MEDIA.delete(current.key);
  await audit(c,"replaced","media",current.id,{oldKey:current.key,key});
  return c.json({id:current.id,key,url,fileName:file.name});
});
app.delete("/api/admin/media/:id", async (c) => {
  const media = await c.env.DB.prepare("SELECT key FROM media_assets WHERE id=?1").bind(c.req.param("id")).first();
  if (!media) throw new HTTPError(404, "Media not found.");
  await c.env.MEDIA.delete(media.key);
  await c.env.DB.prepare("DELETE FROM media_assets WHERE id=?1").bind(c.req.param("id")).run();
  await audit(c, "deleted", "media", c.req.param("id"), { key: media.key });
  return c.json({ ok: true });
});
app.delete("/api/admin/reviews/:id", async (c) => {
  await c.env.DB.prepare("DELETE FROM reviews WHERE id=?1").bind(c.req.param("id")).run();
  await audit(c, "deleted", "review", c.req.param("id"));
  return c.json({ ok: true });
});
app.put("/api/admin/homepage/:id", async (c) => {
  const data=await body(c);
  await c.env.DB.prepare("UPDATE homepage_sections SET title=?1,content_json=?2,enabled=?3,sort_order=?4,updated_at=CURRENT_TIMESTAMP WHERE id=?5").bind(data.title||null,json(data.content||{}),data.enabled===false?0:1,Number(data.sortOrder)||0,c.req.param("id")).run();
  await audit(c,"updated","homepage",c.req.param("id"));
  return c.json({ok:true});
});
app.post("/api/admin/digital", async (c) => {
  const data=await body(c); const contentId=data.id||id();
  await c.env.DB.prepare("INSERT INTO digital_content(id,content_type,title,slug,summary,content,image_url,source_url,featured,status,published_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11) ON CONFLICT(id) DO UPDATE SET content_type=excluded.content_type,title=excluded.title,slug=excluded.slug,summary=excluded.summary,content=excluded.content,image_url=excluded.image_url,source_url=excluded.source_url,featured=excluded.featured,status=excluded.status,published_at=excluded.published_at,updated_at=CURRENT_TIMESTAMP").bind(contentId,data.contentType,data.title,data.slug,data.summary||null,data.content||null,data.imageUrl||null,data.sourceUrl||null,data.featured?1:0,data.status||"draft",data.status==="published"?(data.publishedAt||new Date().toISOString()):null).run();
  await audit(c,data.id?"updated":"created","digital",contentId,{title:data.title});
  return c.json({id:contentId});
});
app.post("/api/admin/seo", async (c) => {
  const data=await body(c); const seoId=data.id||id();
  await c.env.DB.prepare("INSERT INTO seo_entries(id,route,meta_title,meta_description,canonical_url,open_graph_json,twitter_json,robots) VALUES(?1,?2,?3,?4,?5,?6,?7,?8) ON CONFLICT(id) DO UPDATE SET route=excluded.route,meta_title=excluded.meta_title,meta_description=excluded.meta_description,canonical_url=excluded.canonical_url,open_graph_json=excluded.open_graph_json,twitter_json=excluded.twitter_json,robots=excluded.robots,updated_at=CURRENT_TIMESTAMP").bind(seoId,data.route,data.metaTitle||null,data.metaDescription||null,data.canonicalUrl||null,json(data.openGraph||{}),json(data.twitter||{}),data.robots||"index,follow").run();
  await audit(c,data.id?"updated":"created","seo",seoId,{route:data.route});
  return c.json({id:seoId});
});
app.put("/api/admin/permissions/:userId", async (c) => {
  const data=await body(c);
  if(!["admin","manager","staff"].includes(data.role))throw new HTTPError(400,"Invalid CMS role.");
  await c.env.DB.prepare("INSERT INTO user_permissions(user_id,role) VALUES(?1,?2) ON CONFLICT(user_id) DO UPDATE SET role=excluded.role,updated_at=CURRENT_TIMESTAMP").bind(c.req.param("userId"),data.role).run();
  await audit(c,"role_changed","user",c.req.param("userId"),{role:data.role});
  return c.json({ok:true});
});

export default {
  fetch: app.fetch,
  async scheduled(event, env) {
    await env.DB.batch([
      env.DB.prepare("UPDATE cms_entries SET status='published',updated_at=CURRENT_TIMESTAMP WHERE status='scheduled' AND publish_at<=CURRENT_TIMESTAMP"),
      env.DB.prepare("UPDATE cms_entries SET status='archived',updated_at=CURRENT_TIMESTAMP WHERE status='published' AND expires_at IS NOT NULL AND expires_at<=CURRENT_TIMESTAMP"),
    ]);
    if (!env.NOTIFICATION_WEBHOOK) return;
    const queued = (await env.DB.prepare("SELECT * FROM notifications WHERE status='queued' ORDER BY created_at LIMIT 50").all()).results;
    for (const notification of queued) {
      try {
        const template = await env.DB.prepare("SELECT template_key,subject,preheader,html_content,text_content FROM email_templates WHERE template_key=?1 AND enabled=1").bind(notification.event_type).first();
        const response = await fetch(env.NOTIFICATION_WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.NOTIFICATION_WEBHOOK_SECRET || ""}` }, body: json({ ...JSON.parse(notification.payload_json), template }) });
        await env.DB.prepare("UPDATE notifications SET status=?1,sent_at=CASE WHEN ?1='sent' THEN CURRENT_TIMESTAMP ELSE sent_at END WHERE id=?2").bind(response.ok ? "sent" : "failed", notification.id).run();
      } catch {
        await env.DB.prepare("UPDATE notifications SET status='failed' WHERE id=?1").bind(notification.id).run();
      }
    }
  },
};

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function hmac(secret, value) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
function safeEqual(left, right) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}
