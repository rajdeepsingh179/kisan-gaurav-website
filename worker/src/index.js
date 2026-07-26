import { Hono } from "hono";
import { handleAuth, getSession, hashPassword } from "./auth";
import { calculateCheckout, id, json, persistOrder } from "./commerce";

const app = new Hono();

app.use("*", async (c, next) => {
  const origin = c.req.header("Origin");
  if (origin && (origin === c.env.FRONTEND_URL || origin.endsWith(".pages.dev"))) {
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
const requireAdmin = async (c) => {
  const user = await requireUser(c);
  if (user.role !== "admin") throw new HTTPError(403, "Admin access required.");
  return user;
};
const body = async (c) => {
  try { return await c.req.json(); } catch { throw new HTTPError(400, "Invalid JSON body."); }
};
class HTTPError extends Error { constructor(status, message) { super(message); this.status = status; } }

app.onError((error, c) => c.json({ error: error.message || "Unexpected error." }, error.status || 500));
app.get("/api/health", (c) => c.json({ ok: true, service: "kisan-gaurav-api", timestamp: new Date().toISOString() }));
app.all("/api/auth/*", (c) => handleAuth(c.req.raw, c.env));

app.post("/api/account/signup", async (c) => {
  const data = await body(c);
  const email = String(data.email || "").trim().toLowerCase();
  if (!email.includes("@") || String(data.password || "").length < 8 || !data.name) throw new HTTPError(400, "Name, valid email and an 8-character password are required.");
  const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email=?1").bind(email).first();
  if (existing) throw new HTTPError(409, "An account already exists for this email.");
  const password = await hashPassword(String(data.password));
  const userId = id();
  await c.env.DB.prepare("INSERT INTO users(id,email,name,mobile,password_hash,password_salt) VALUES(?1,?2,?3,?4,?5,?6)").bind(userId, email, String(data.name).trim(), data.mobile || null, password.hash, password.salt).run();
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
  const url = `${c.env.R2_PUBLIC_BASE_URL}/${key}`;
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

app.use("/api/admin/*", async (c, next) => { c.set("admin", await requireAdmin(c)); await next(); });
app.get("/api/admin/dashboard", async (c) => {
  const [revenue, orders, customers, lowStock] = await c.env.DB.batch([
    c.env.DB.prepare("SELECT COALESCE(SUM(total_paise),0) value FROM orders WHERE payment_status='paid' OR payment_method='cod'"),
    c.env.DB.prepare("SELECT COUNT(*) value FROM orders"),
    c.env.DB.prepare("SELECT COUNT(*) value FROM users WHERE role='customer'"),
    c.env.DB.prepare("SELECT COUNT(*) value FROM product_variants WHERE stock<=low_stock_threshold"),
  ]);
  return c.json({ revenuePaise: revenue.results[0].value, orders: orders.results[0].value, customers: customers.results[0].value, lowStock: lowStock.results[0].value });
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
app.get("/api/admin/inventory/:id/history", async (c) => c.json((await c.env.DB.prepare("SELECT * FROM inventory_history WHERE variant_id=?1 ORDER BY created_at DESC LIMIT 250").bind(c.req.param("id")).all()).results));
app.get("/api/admin/:resource", async (c) => {
  const resource = c.req.param("resource");
  const queries = {
    products: "SELECT p.*,c.name category_name FROM products p JOIN categories c ON c.id=p.category_id ORDER BY p.created_at DESC",
    categories: "SELECT * FROM categories ORDER BY sort_order,name",
    orders: "SELECT * FROM orders ORDER BY created_at DESC LIMIT 250",
    customers: "SELECT id,email,name,mobile,role,created_at FROM users ORDER BY created_at DESC LIMIT 500",
    inventory: "SELECT v.*,p.name product_name FROM product_variants v JOIN products p ON p.id=v.product_id ORDER BY v.stock",
    coupons: "SELECT * FROM coupons ORDER BY created_at DESC",
    reviews: "SELECT r.*,p.name product_name,u.name customer_name FROM reviews r JOIN products p ON p.id=r.product_id JOIN users u ON u.id=r.user_id ORDER BY r.created_at DESC",
    banners: "SELECT * FROM banners ORDER BY sort_order,created_at DESC",
    settings: "SELECT * FROM settings WHERE key NOT LIKE 'payment_intent:%' ORDER BY key",
    analytics: "SELECT strftime('%Y-%m',created_at) month,COUNT(*) orders,SUM(total_paise) revenue_paise FROM orders GROUP BY month ORDER BY month DESC LIMIT 24",
  };
  if (!queries[resource]) throw new HTTPError(404, "Admin module not found.");
  return c.json((await c.env.DB.prepare(queries[resource]).all()).results);
});
app.post("/api/admin/products", async (c) => {
  const admin = c.get("admin"); const data = await body(c); const productId = data.id || id();
  await c.env.DB.prepare("INSERT INTO products(id,category_id,name,slug,description,ingredients,image_url,detail_image_url,featured,best_seller,new_arrival,active) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12) ON CONFLICT(id) DO UPDATE SET category_id=excluded.category_id,name=excluded.name,description=excluded.description,ingredients=excluded.ingredients,image_url=excluded.image_url,detail_image_url=excluded.detail_image_url,featured=excluded.featured,best_seller=excluded.best_seller,new_arrival=excluded.new_arrival,active=excluded.active,updated_at=CURRENT_TIMESTAMP").bind(productId, data.categoryId, data.name, data.slug, data.description || null, data.ingredients || null, data.imageUrl || null, data.detailImageUrl || null, data.featured ? 1 : 0, data.bestSeller ? 1 : 0, data.newArrival ? 1 : 0, data.active === false ? 0 : 1).run();
  if (Array.isArray(data.variants)) for (const variant of data.variants) await c.env.DB.prepare("INSERT INTO product_variants(id,product_id,name,sku,price_paise,compare_at_price_paise,stock,low_stock_threshold,active) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9) ON CONFLICT(id) DO UPDATE SET name=excluded.name,sku=excluded.sku,price_paise=excluded.price_paise,compare_at_price_paise=excluded.compare_at_price_paise,stock=excluded.stock,low_stock_threshold=excluded.low_stock_threshold,active=excluded.active,updated_at=CURRENT_TIMESTAMP").bind(variant.id || id(), productId, variant.name, variant.sku, variant.pricePaise, variant.compareAtPricePaise || null, variant.stock || 0, variant.lowStockThreshold || 5, variant.active === false ? 0 : 1).run();
  await c.env.DB.prepare("INSERT INTO analytics_events(id,user_id,event_name,properties_json) VALUES(?1,?2,'admin_product_save',?3)").bind(id(), admin.id, json({ productId })).run();
  return c.json({ id: productId });
});
app.post("/api/admin/categories", async (c) => {
  const data = await body(c); const categoryId = data.id || id();
  await c.env.DB.prepare("INSERT INTO categories(id,name,slug,description,image_url,active,sort_order) VALUES(?1,?2,?3,?4,?5,?6,?7) ON CONFLICT(id) DO UPDATE SET name=excluded.name,slug=excluded.slug,description=excluded.description,image_url=excluded.image_url,active=excluded.active,sort_order=excluded.sort_order,updated_at=CURRENT_TIMESTAMP").bind(categoryId,data.name,data.slug,data.description||null,data.imageUrl||null,data.active===false?0:1,data.sortOrder||0).run();
  return c.json({ id: categoryId });
});
app.post("/api/admin/coupons", async (c) => {
  const data=await body(c);const couponId=data.id||id();
  if(!["percent","flat"].includes(data.type))throw new HTTPError(400,"Invalid coupon type.");
  await c.env.DB.prepare("INSERT INTO coupons(id,code,type,value,minimum_order_paise,expires_at,usage_limit,enabled) VALUES(?1,?2,?3,?4,?5,?6,?7,?8) ON CONFLICT(id) DO UPDATE SET code=excluded.code,type=excluded.type,value=excluded.value,minimum_order_paise=excluded.minimum_order_paise,expires_at=excluded.expires_at,usage_limit=excluded.usage_limit,enabled=excluded.enabled,updated_at=CURRENT_TIMESTAMP").bind(couponId,String(data.code).toUpperCase(),data.type,data.value,data.minimumOrderPaise||0,data.expiresAt||null,data.usageLimit||null,data.enabled===false?0:1).run();
  return c.json({id:couponId});
});
app.post("/api/admin/banners", async (c) => {
  const data=await body(c);const bannerId=data.id||id();
  await c.env.DB.prepare("INSERT INTO banners(id,title,subtitle,image_url,link_url,starts_at,ends_at,active,sort_order) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9) ON CONFLICT(id) DO UPDATE SET title=excluded.title,subtitle=excluded.subtitle,image_url=excluded.image_url,link_url=excluded.link_url,starts_at=excluded.starts_at,ends_at=excluded.ends_at,active=excluded.active,sort_order=excluded.sort_order,updated_at=CURRENT_TIMESTAMP").bind(bannerId,data.title,data.subtitle||null,data.imageUrl,data.linkUrl||null,data.startsAt||null,data.endsAt||null,data.active===false?0:1,data.sortOrder||0).run();
  return c.json({id:bannerId});
});
app.patch("/api/admin/reviews/:id", async (c) => {
  const data=await body(c);if(!["pending","published","rejected"].includes(data.status))throw new HTTPError(400,"Invalid review status.");
  await c.env.DB.prepare("UPDATE reviews SET status=?1,updated_at=CURRENT_TIMESTAMP WHERE id=?2").bind(data.status,c.req.param("id")).run();
  return c.json({ok:true});
});
app.put("/api/admin/settings/:key", async (c) => {
  const data=await body(c);
  await c.env.DB.prepare("INSERT INTO settings(key,value_json) VALUES(?1,?2) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP").bind(c.req.param("key"),json(data)).run();
  return c.json({ok:true});
});
app.delete("/api/admin/products/:id", async (c) => {
  await c.env.DB.prepare("UPDATE products SET active=0,updated_at=CURRENT_TIMESTAMP WHERE id=?1").bind(c.req.param("id")).run();
  return c.json({ ok: true });
});
app.patch("/api/admin/orders/:id/status", async (c) => {
  const data = await body(c);
  if (!["pending","confirmed","packed","shipped","delivered","cancelled","returned","refunded"].includes(data.status)) throw new HTTPError(400, "Invalid order status.");
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE orders SET status=?1,tracking_number=COALESCE(?2,tracking_number),updated_at=CURRENT_TIMESTAMP WHERE id=?3").bind(data.status, data.trackingNumber || null, c.req.param("id")),
    c.env.DB.prepare("INSERT INTO order_status_history(id,order_id,status,note) VALUES(?1,?2,?3,?4)").bind(id(), c.req.param("id"), data.status, data.note || null),
  ]);
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
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 8_000_000) throw new HTTPError(400, "Upload an image under 8 MB.");
  const key = `catalog/${crypto.randomUUID()}.${file.type.split("/")[1] || "webp"}`;
  await c.env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type, cacheControl: "public,max-age=31536000,immutable" } });
  return c.json({ key, url: `${c.env.R2_PUBLIC_BASE_URL}/${key}` }, 201);
});

export default {
  fetch: app.fetch,
  async scheduled(event, env) {
    if (!env.NOTIFICATION_WEBHOOK) return;
    const queued = (await env.DB.prepare("SELECT * FROM notifications WHERE status='queued' ORDER BY created_at LIMIT 50").all()).results;
    for (const notification of queued) {
      try {
        const response = await fetch(env.NOTIFICATION_WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.NOTIFICATION_WEBHOOK_SECRET || ""}` }, body: notification.payload_json });
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
