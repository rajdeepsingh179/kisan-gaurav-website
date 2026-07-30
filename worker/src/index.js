import { Hono } from "hono";
import { handleAuth, getSession, hashPassword, passwordValidationError, verifyPassword } from "./auth.js";
import { calculateCheckout, id, json, persistOrder } from "./commerce.js";
import { databaseHTTPError, HTTPError } from "./http.js";
import {
  assertRequestSize, contentHash, enforceRateLimit, rateProfile, sanitizeAuditDetails,
  securityHeaders, validateMediaUpload,
} from "./security.js";
import {
  assertSafeStructuredValue, validateCategory, validateCmsEntry,
  validateCoupon, validateOrderRequest, validateProduct, validateSetting,
} from "./validation.js";

const app = new Hono();
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const ACCOUNT_AUTH_PATHS = new Set([
  "/api/account/signup",
  "/api/account/verify-email",
  "/api/account/forgot-password",
  "/api/account/reset-password",
  "/api/admin/account/password",
]);
const hasControlCharacter = (value) => [...value].some((character) => {
  const code = character.charCodeAt(0);
  return code < 32 || code === 127;
});
const authFailureCategory = (path, code, status) => {
  if (path.includes("verify-email")) return "email_verification";
  if (path.includes("password")) return "password";
  if (path.includes("signup")) return "registration";
  if (path.startsWith("/api/auth/")) {
    if (/oauth|callback/i.test(code || "")) return "oauth";
    if (/jwt|session/i.test(code || "")) return "session";
    return "authjs";
  }
  return status >= 500 ? "database" : "authentication";
};
const trustedOrigins = (c) => new Set([
  c.env.FRONTEND_URL,
  "https://kisangaurav.com",
  "https://www.kisangaurav.com",
].filter(Boolean).map((value) => value.replace(/\/$/, "")));
const isTrustedOrigin = (c, origin) => {
  if (!origin) return false;
  try {
    const source = new URL(origin);
    const target = new URL(c.req.url);
    const localTarget = ["localhost", "127.0.0.1"].includes(target.hostname);
    const localSource = ["localhost", "127.0.0.1"].includes(source.hostname);
    return trustedOrigins(c).has(source.origin) || (localTarget && localSource);
  } catch {
    return false;
  }
};

app.use("*", async (c, next) => {
  const requestId = c.req.header("CF-Ray") || crypto.randomUUID();
  c.set("requestId", requestId);
  for (const [name, value] of Object.entries(securityHeaders())) c.header(name, value);
  c.header("X-Request-ID", requestId);
  const origin = c.req.header("Origin");
  if (origin && isTrustedOrigin(c, origin)) {
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Vary", "Origin");
  }
  c.header("Access-Control-Allow-Headers", "Content-Type, X-CSRF-Token");
  c.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  if (c.req.method === "OPTIONS") return c.body(null, 204);
  if (!SAFE_METHODS.has(c.req.method) && c.req.path.startsWith("/api/")) {
    const source = origin || c.req.header("Referer");
    if (!isTrustedOrigin(c, source)) {
      console.warn(json({ event: "request_origin_rejected", requestId, method: c.req.method, path: c.req.path, ip: c.req.header("CF-Connecting-IP") || null }));
      return c.json({ error: "Request origin is not allowed." }, 403);
    }
  }
  if (!SAFE_METHODS.has(c.req.method)) {
    assertRequestSize(c.req.raw, c.req.path === "/api/admin/uploads" || c.req.path.endsWith("/replace") ? 14_000_000 : 1_000_000);
    const profile = rateProfile(c.req.path, c.req.method);
    if (profile) await enforceRateLimit(c, profile);
  }
  await next();
  if (c.req.path.startsWith("/api/admin/") || c.req.path.startsWith("/api/auth/") || c.req.path.startsWith("/api/account/")) {
    c.header("Cache-Control", "private, no-store");
  }
});

const sessionFor = (c) => getSession(c.req.raw, c.env);
const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN"]);
const requireUser = async (c) => {
  const session = await sessionFor(c);
  if (!session) throw new HTTPError(401, "Authentication required.");
  return session.user;
};
const requireVerifiedCustomer = async (c) => {
  const sessionUser = await requireUser(c);
  const customer = await c.env.DB.prepare(
    "SELECT id,email,name,mobile FROM users WHERE id=?1 AND email_verified_at IS NOT NULL AND account_status='ACTIVE' AND blacklisted=0",
  ).bind(sessionUser.id).first();
  if (!customer) throw new HTTPError(403, "A valid verified customer account is required.", "verified_customer_required");
  return customer;
};
const body = async (c) => {
  if (!/^application\/(?:[\w.-]+\+)?json(?:;|$)/i.test(c.req.header("Content-Type") || "")) {
    throw new HTTPError(415, "Content-Type must be application/json.", "unsupported_content_type");
  }
  let raw;
  try { raw = await c.req.text(); } catch { throw new HTTPError(400, "Unable to read request body."); }
  if (new TextEncoder().encode(raw).byteLength > 1_000_000) throw new HTTPError(413, "Request body is too large.", "payload_too_large");
  try { return JSON.parse(raw); } catch { throw new HTTPError(400, "Invalid JSON body."); }
};

app.onError(async (error, c) => {
  const normalizedError = error instanceof HTTPError ? error : databaseHTTPError(error);
  const status = normalizedError?.status || 500;
  if (c.req.path.startsWith("/api/auth/") || ACCOUNT_AUTH_PATHS.has(c.req.path)) {
    console[status >= 500 ? "error" : "warn"](json({
      event: "authentication_request_failed",
      category: authFailureCategory(c.req.path, normalizedError?.code, status),
      requestId: c.get("requestId"),
      status,
      code: normalizedError?.code || "internal_error",
      method: c.req.method,
      path: c.req.path,
      ip: c.req.header("CF-Connecting-IP") || null,
    }));
  }
  if (normalizedError && [401, 403, 429].includes(normalizedError.status)) {
    console.warn(json({ event: "security_request_rejected", requestId: c.get("requestId"), status: normalizedError.status, code: normalizedError.code, method: c.req.method, path: c.req.path, ip: c.req.header("CF-Connecting-IP") || null }));
  }
  if (normalizedError && normalizedError.status >= 400 && c.get("admin")) {
    await audit(c, "request_rejected", "security", null, { code: normalizedError.code, status: normalizedError.status, reason: normalizedError.message }).catch((auditError) => console.error("Audit log failure", auditError));
  }
  if (normalizedError) return c.json({ error: normalizedError.message, code: normalizedError.code, requestId: c.get("requestId") }, normalizedError.status);
  console.error("Unhandled request error", { requestId: c.get("requestId"), error });
  return c.json({ error: "Unexpected server error.", code: "internal_error", requestId: c.get("requestId") }, 500);
});
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
  const firstName = String(data.firstName || "").trim();
  const lastName = String(data.lastName || "").trim();
  const name = `${firstName} ${lastName}`.trim();
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || email.length > 254
    || !firstName
    || !lastName
    || firstName.length > 80
    || lastName.length > 80
    || hasControlCharacter(name)
  ) {
    throw new HTTPError(400, "First name, last name, and a valid email are required.");
  }
  const passwordError = passwordValidationError(data.password);
  if (passwordError) throw new HTTPError(400, passwordError, "weak_password");
  let existing = await c.env.DB.prepare("SELECT id,password_hash,account_status,blacklisted FROM users WHERE email=?1").bind(email).first();
  if (existing?.blacklisted) {
    throw new HTTPError(403, "This account is restricted. Please contact Kisan Gaurav support.", "account_restricted");
  }
  if (existing?.password_hash) throw new HTTPError(409, "An account already exists for this email. Sign in or reset your password.", "account_exists");
  const password = await hashPassword(String(data.password));
  const proposedUserId = existing?.id || id();
  if (!existing) {
    await c.env.DB.prepare(
      "INSERT INTO users(id,email,name,first_name,last_name) VALUES(?1,?2,?3,?4,?5) ON CONFLICT(email) DO NOTHING",
    ).bind(proposedUserId, email, name, firstName, lastName).run();
    existing = await c.env.DB.prepare("SELECT id,password_hash,account_status,blacklisted FROM users WHERE email=?1").bind(email).first();
    if (existing?.blacklisted) {
      throw new HTTPError(403, "This account is restricted. Please contact Kisan Gaurav support.", "account_restricted");
    }
    if (existing?.password_hash) throw new HTTPError(409, "An account already exists for this email. Sign in or reset your password.", "account_exists");
  }
  const userId = existing?.id || proposedUserId;
  const rawToken = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const tokenHash = await sha256(rawToken);
  const verificationUrl = `${c.env.FRONTEND_URL.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(rawToken)}`;
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM email_verification_tokens WHERE user_id=?1 OR expires_at<CURRENT_TIMESTAMP").bind(userId),
    c.env.DB.prepare("INSERT INTO email_verification_tokens(token_hash,user_id,pending_password_hash,pending_password_salt,pending_password_iterations,expires_at) VALUES(?1,?2,?3,?4,?5,datetime('now','+24 hours'))").bind(tokenHash, userId, password.hash, password.salt, password.iterations),
    c.env.DB.prepare("INSERT INTO notifications(id,user_id,channel,event_type,recipient,payload_json) VALUES(?1,?2,'email','email_verification',?3,?4)").bind(id(), userId, email, json({ name, verificationUrl })),
  ]);
  return c.json({ id: userId, email, requiresVerification: true, message: "Check your email to verify your account before signing in." }, 202);
});

app.post("/api/account/verify-email", async (c) => {
  const data = await body(c);
  const tokenHash = await sha256(String(data.token || ""));
  const results = await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE users SET
      password_hash=(SELECT pending_password_hash FROM email_verification_tokens WHERE token_hash=?1 AND used_at IS NULL AND expires_at>CURRENT_TIMESTAMP),
      password_salt=(SELECT pending_password_salt FROM email_verification_tokens WHERE token_hash=?1 AND used_at IS NULL AND expires_at>CURRENT_TIMESTAMP),
      password_iterations=(SELECT pending_password_iterations FROM email_verification_tokens WHERE token_hash=?1 AND used_at IS NULL AND expires_at>CURRENT_TIMESTAMP),
      email_verified_at=COALESCE(email_verified_at,CURRENT_TIMESTAMP),failed_login_count=0,locked_until=NULL,updated_at=CURRENT_TIMESTAMP
      WHERE id=(SELECT user_id FROM email_verification_tokens WHERE token_hash=?1 AND used_at IS NULL AND expires_at>CURRENT_TIMESTAMP)`).bind(tokenHash),
    c.env.DB.prepare("UPDATE email_verification_tokens SET used_at=CURRENT_TIMESTAMP WHERE token_hash=?1 AND used_at IS NULL AND expires_at>CURRENT_TIMESTAMP").bind(tokenHash),
  ]);
  if (Number(results[0]?.meta?.changes || 0) !== 1 || Number(results[1]?.meta?.changes || 0) !== 1) {
    throw new HTTPError(400, "Verification link is invalid or expired.", "invalid_verification_token");
  }
  const user = await c.env.DB.prepare(
    "SELECT u.id,u.email,u.name FROM users u JOIN email_verification_tokens evt ON evt.user_id=u.id WHERE evt.token_hash=?1",
  ).bind(tokenHash).first();
  if (user) {
    await c.env.DB.batch([
      c.env.DB.prepare("DELETE FROM email_verification_tokens WHERE user_id=?1 AND token_hash<>?2").bind(user.id, tokenHash),
      c.env.DB.prepare("INSERT INTO notifications(id,user_id,channel,event_type,recipient,payload_json) VALUES(?1,?2,'email','welcome',?3,?4)").bind(id(), user.id, user.email, json({ name: user.name })),
    ]);
  }
  return c.json({ ok: true, message: "Email verified. You can now sign in." });
});

app.post("/api/account/forgot-password", async (c) => {
  const data = await body(c);
  const user = await c.env.DB.prepare("SELECT id,email FROM users WHERE email=?1 AND email_verified_at IS NOT NULL AND account_status='ACTIVE' AND blacklisted=0").bind(String(data.email || "").trim().toLowerCase()).first();
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
  const passwordError = passwordValidationError(data.password);
  if (passwordError) throw new HTTPError(400, passwordError, "weak_password");
  const tokenHash = await sha256(String(data.token || ""));
  const password = await hashPassword(String(data.password));
  const results = await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE users SET password_hash=?1,password_salt=?2,password_iterations=?3,
      must_change_password=0,failed_login_count=0,locked_until=NULL,session_version=session_version+1,updated_at=CURRENT_TIMESTAMP
      WHERE account_status='ACTIVE' AND blacklisted=0
        AND id=(SELECT user_id FROM password_reset_tokens WHERE token_hash=?4 AND used_at IS NULL AND expires_at>CURRENT_TIMESTAMP)`)
      .bind(password.hash, password.salt, password.iterations, tokenHash),
    c.env.DB.prepare("UPDATE password_reset_tokens SET used_at=CURRENT_TIMESTAMP WHERE token_hash=?1 AND used_at IS NULL AND expires_at>CURRENT_TIMESTAMP").bind(tokenHash),
  ]);
  if (Number(results[0]?.meta?.changes || 0) !== 1 || Number(results[1]?.meta?.changes || 0) !== 1) {
    throw new HTTPError(400, "Reset link is invalid or expired.", "invalid_reset_token");
  }
  return c.json({ ok: true, message: "Password reset successfully. Sign in with your new password." });
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
  const fileBytes = file instanceof File ? await file.arrayBuffer() : new ArrayBuffer(0);
  const validated = validateMediaUpload(file, fileBytes, { profile: true, maxBytes: 5_000_000 });
  const key = `profiles/${user.id}/${crypto.randomUUID()}.${validated.extension}`;
  await c.env.MEDIA.put(key, fileBytes, { httpMetadata: { contentType: file.type, cacheControl: "public,max-age=31536000,immutable" } });
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

app.post("/api/checkout/quote", async (c) => {
  await requireVerifiedCustomer(c);
  const data = await body(c);
  return c.json(await calculateCheckout(c.env, data));
});
app.post("/api/orders", async (c) => {
  await requireVerifiedCustomer(c);
  throw new HTTPError(405, "Orders require a completed online payment through Razorpay.", "online_payment_required");
});
app.post("/api/payments/razorpay/order", async (c) => {
  const customer = await requireVerifiedCustomer(c);
  const data = validateOrderRequest(await body(c));
  if (data.paymentMethod !== "razorpay") throw new HTTPError(400, "Only online Razorpay payments are supported.", "online_payment_required");
  if (data.customer.email !== customer.email.toLowerCase()) throw new HTTPError(403, "Checkout identity does not match the signed-in customer.", "customer_identity_mismatch");
  const checkout = await calculateCheckout(c.env, data);
  const response = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", headers: { Authorization: `Basic ${btoa(`${c.env.RAZORPAY_KEY_ID}:${c.env.RAZORPAY_KEY_SECRET}`)}`, "Content-Type": "application/json" }, body: json({ amount: checkout.totalPaise, currency: "INR", receipt: `kg_${Date.now()}` }) });
  if (!response.ok) throw new HTTPError(502, "Unable to create payment order.");
  const razorpay = await response.json();
  await c.env.DB.prepare("INSERT INTO settings(key,value_json) VALUES(?1,?2) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP").bind(`payment_intent:${razorpay.id}`, json({ payload: { ...data, customer: { ...data.customer, name: customer.name, email: customer.email } }, checkout, userId: customer.id, expiresAt: Date.now() + 900000 })).run();
  return c.json({ id: razorpay.id, amount: razorpay.amount, currency: razorpay.currency, keyId: c.env.RAZORPAY_KEY_ID });
});
app.post("/api/payments/razorpay/verify", async (c) => {
  const customer = await requireVerifiedCustomer(c);
  const data = await body(c);
  if (![data.razorpay_order_id,data.razorpay_payment_id,data.razorpay_signature].every((value) => typeof value === "string" && value.length >= 8 && value.length <= 200)) {
    throw new HTTPError(400, "Payment verification payload is invalid.", "invalid_payment_payload");
  }
  const expected = await hmac(c.env.RAZORPAY_KEY_SECRET, `${data.razorpay_order_id}|${data.razorpay_payment_id}`);
  if (!safeEqual(expected, data.razorpay_signature || "")) throw new HTTPError(403, "Payment verification failed.");
  const completed = await c.env.DB.prepare("SELECT o.id,o.order_number,o.status,o.total_paise FROM processed_payments p JOIN orders o ON o.id=p.order_id WHERE p.payment_order_id=?1 AND p.payment_id=?2 AND o.user_id=?3").bind(data.razorpay_order_id,data.razorpay_payment_id,customer.id).first();
  if (completed) return c.json({ id: completed.id, orderNumber: completed.order_number, status: completed.status, totalPaise: completed.total_paise, idempotent: true });
  const intent = await c.env.DB.prepare("SELECT value_json FROM settings WHERE key=?1").bind(`payment_intent:${data.razorpay_order_id}`).first();
  if (!intent) throw new HTTPError(404, "Payment intent not found.");
  const stored = JSON.parse(intent.value_json);
  if (stored.expiresAt < Date.now()) throw new HTTPError(400, "Payment intent expired.");
  if (!stored.userId || stored.userId !== customer.id) throw new HTTPError(403, "Payment intent belongs to another customer.", "payment_customer_mismatch");
  const order = await persistOrder(c.env, stored.payload, stored.checkout, customer.id, { method: "razorpay", status: "paid", orderId: data.razorpay_order_id, paymentId: data.razorpay_payment_id, intentKey: `payment_intent:${data.razorpay_order_id}` });
  return c.json(order);
});

app.get("/api/orders", async (c) => {
  const user = await requireUser(c);
  return c.json((await c.env.DB.prepare("SELECT * FROM orders WHERE user_id=?1 ORDER BY created_at DESC").bind(user.id).all()).results);
});
app.get("/api/orders/:id", async (c) => {
  const user = await requireUser(c);
  const order = await c.env.DB.prepare("SELECT * FROM orders WHERE id=?1").bind(c.req.param("id")).first();
  if (!order || order.user_id !== user.id && !ADMIN_ROLES.has(user.role)) throw new HTTPError(404, "Order not found.");
  const history = (await c.env.DB.prepare("SELECT * FROM order_status_history WHERE order_id=?1 ORDER BY created_at").bind(order.id).all()).results;
  return c.json({ ...order, history });
});
app.post("/api/orders/:id/cancel", async (c) => {
  const user = await requireUser(c);
  const [orderResult, itemResult] = await c.env.DB.batch([
    c.env.DB.prepare("SELECT id,status FROM orders WHERE id=?1 AND user_id=?2").bind(c.req.param("id"),user.id),
    c.env.DB.prepare("SELECT variant_id,quantity FROM order_items WHERE order_id=?1").bind(c.req.param("id")),
  ]);
  const order = orderResult.results[0];
  if (!order || !["pending","confirmed"].includes(order.status)) throw new HTTPError(409, "Order can no longer be cancelled.", "order_state_conflict");
  const statements = [
    c.env.DB.prepare("INSERT INTO order_transitions(id,order_id,from_status,to_status,note,actor_user_id) VALUES(?1,?2,?3,'cancelled','Cancelled by customer',?4)").bind(id(),order.id,order.status,user.id),
    ...itemResult.results.map((item) => c.env.DB.prepare("INSERT INTO inventory_mutations(id,variant_id,mutation_type,quantity,reason,reference_id,actor_user_id) VALUES(?1,?2,'delta',?3,'order_cancel',?4,?5)").bind(id(),item.variant_id,item.quantity,order.id,user.id)),
  ];
  await c.env.DB.batch(statements);
  return c.json({ ok: true });
});
app.post("/api/orders/:id/return", async (c) => {
  const user = await requireUser(c); const data = await body(c);
  const reason = String(data.reason || "").trim();
  if (reason.length < 10 || reason.length > 2000) throw new HTTPError(400, "Return reason must contain 10 to 2000 characters.", "invalid_return_reason");
  const order = await c.env.DB.prepare("SELECT id FROM orders WHERE id=?1 AND user_id=?2 AND status='delivered'").bind(c.req.param("id"), user.id).first();
  if (!order) throw new HTTPError(409, "Only delivered orders can be returned.");
  const returnId = id();
  await c.env.DB.prepare("INSERT INTO returns(id,order_id,user_id,reason) VALUES(?1,?2,?3,?4)").bind(returnId, order.id, user.id, reason).run();
  return c.json({ id: returnId, status: "pending" }, 201);
});
app.get("/api/orders/:id/invoice", async (c) => {
  const user = await requireUser(c);
  const order = await c.env.DB.prepare("SELECT invoice_key,user_id FROM orders WHERE id=?1").bind(c.req.param("id")).first();
  if (!order?.invoice_key || (order.user_id !== user.id && !ADMIN_ROLES.has(user.role))) throw new HTTPError(404, "Invoice not found.");
  const object = await c.env.MEDIA.get(order.invoice_key);
  if (!object?.body) throw new HTTPError(404, "Stored invoice not found.", "invoice_object_missing");
  return new Response(object.body, { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${c.req.param("id")}-invoice.json"` } });
});

app.get("/api/media/*", async (c) => {
  const key = c.req.path.replace("/api/media/", "");
  const object = await c.env.MEDIA.get(key, { onlyIf: c.req.raw.headers });
  if (!object) throw new HTTPError(404, "Media not found.");
  if (!object.body) return new Response(null, { status: 304, headers: { ETag: object.httpEtag } });
  const contentType = object.httpMetadata?.contentType || "application/octet-stream";
  const headers = { "Content-Type": contentType, "Cache-Control": object.httpMetadata?.cacheControl || "public,max-age=3600", ETag: object.httpEtag, "Cross-Origin-Resource-Policy": "same-site" };
  if (contentType === "image/svg+xml") headers["Content-Security-Policy"] = "sandbox; default-src 'none'; img-src 'none'; style-src 'none'";
  return new Response(object.body, { headers });
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
    c.env.DB.prepare("SELECT * FROM product_variants WHERE active=1 AND archived=0 ORDER BY is_default DESC,created_at"),
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
  if (ADMIN_ROLES.has(user.role)) return user;
  const assigned = await c.env.DB.prepare("SELECT role FROM user_permissions WHERE user_id=?1").bind(user.id).first();
  if (!assigned || !ADMIN_ROLES.has(assigned.role)) throw new HTTPError(403, "You do not have administrator permissions.");
  return { ...user, role: assigned.role };
};
export const canAccess = (role, path, method = "GET") => {
  if (!ADMIN_ROLES.has(role)) return false;
  if (role === "SUPER_ADMIN") return true;
  if (path.includes("/permissions")) return false;
  if (/^\/api\/admin\/customers\/[^/]+\/status$/.test(path)) return false;
  if (/^\/api\/admin\/customers\/[^/]+$/.test(path)) return ["GET","PATCH"].includes(method);
  if (/^\/api\/admin\/customers\/[^/]+\/orders$/.test(path)) return method === "GET";
  if (/^\/api\/admin\/customers\/[^/]+\/(?:password-reset|resend-verification)$/.test(path)) return method === "POST";
  if (/^\/api\/admin\/customers\/[^/]+\//.test(path)) return false;
  return true;
};
const auditStatement = (c, action, resourceType, resourceId, details = {}) => {
  const context = {
    ...sanitizeAuditDetails(details),
    requestId: c.get("requestId"),
    method: c.req.method,
    path: c.req.path,
    userAgent: String(c.req.header("User-Agent") || "").slice(0, 300),
  };
  return c.env.DB.prepare("INSERT INTO activity_logs(id,actor_user_id,action,resource_type,resource_id,details_json,ip_address) VALUES(?1,?2,?3,?4,?5,?6,?7)")
    .bind(id(), c.get("admin")?.id || null, action, resourceType, resourceId || null, json(context), c.req.header("CF-Connecting-IP") || null);
};
const audit = (c, action, resourceType, resourceId, details = {}) =>
  auditStatement(c, action, resourceType, resourceId, details).run();
const customerRecord = (c, customerId) => c.env.DB.prepare(
  `SELECT u.*,COALESCE(p.role,u.role) effective_role,
    CASE WHEN u.blacklisted=1 THEN 'BLACKLISTED' ELSE u.account_status END status
   FROM users u LEFT JOIN user_permissions p ON p.user_id=u.id WHERE u.id=?1`,
).bind(customerId).first();
const activeSuperAdminCount = async (c) => {
  const row = await c.env.DB.prepare(
    `SELECT COUNT(*) count FROM user_permissions p JOIN users u ON u.id=p.user_id
     WHERE p.role='SUPER_ADMIN' AND u.account_status='ACTIVE' AND u.blacklisted=0`,
  ).first();
  return Number(row?.count || 0);
};
const assertCustomerTargetSafe = async (c, target, restricting = false) => {
  if (!target) throw new HTTPError(404, "Customer not found.", "customer_not_found");
  const admin = c.get("admin");
  if (admin.role === "ADMIN" && ADMIN_ROLES.has(target.effective_role)) {
    throw new HTTPError(403, "Administrators cannot manage another administrator through customer actions.", "authorization_denied");
  }
  if (target.id === admin.id && restricting) {
    throw new HTTPError(409, "You cannot restrict or delete your own signed-in account.", "self_account_protected");
  }
  if (
    restricting
    && target.effective_role === "SUPER_ADMIN"
    && target.account_status === "ACTIVE"
    && !target.blacklisted
    && await activeSuperAdminCount(c) <= 1
  ) {
    throw new HTTPError(409, "The last active Super Admin cannot be restricted, deleted, or demoted.", "last_super_admin");
  }
};
const customerAuditDetails = (c, target, details = {}) => ({
  customerId: target.id,
  customerEmail: target.email,
  adminEmail: c.get("admin").email,
  ...details,
});
const MEDIA_FOLDERS = new Set(["products", "categories", "banners", "cms", "homepage", "blog", "seo", "general"]);
const mediaFolder = (value) => {
  const folder = String(value || "general").trim().toLowerCase();
  return MEDIA_FOLDERS.has(folder) ? folder : "general";
};
const isMediaLibraryUrl = (c, value) => {
  try {
    const mediaUrl = new URL(String(value || ""), c.req.url);
    return mediaUrl.origin === new URL(c.req.url).origin && mediaUrl.pathname.startsWith("/api/media/");
  } catch {
    return false;
  }
};
const usageExpression = `(SELECT COUNT(*) FROM product_media pm WHERE pm.media_id=m.id)
  +(SELECT COUNT(*) FROM packaging_assets pa WHERE pa.media_id=m.id)
  +(SELECT COUNT(*) FROM menu_items mi WHERE mi.media_id=m.id)
  +(SELECT COUNT(*) FROM products p WHERE p.image_url=m.url OR p.detail_image_url=m.url)
  +(SELECT COUNT(*) FROM categories c WHERE c.image_url=m.url OR c.hero_image_url=m.url OR c.banner_image_url=m.url OR c.thumbnail_url=m.url)
  +(SELECT COUNT(*) FROM banners b WHERE b.image_url=m.url)
  +(SELECT COUNT(*) FROM digital_content d WHERE d.image_url=m.url)
  +(SELECT COUNT(*) FROM cms_entries ce WHERE instr(ce.content_json,m.url)>0 OR instr(ce.seo_json,m.url)>0)
  +(SELECT COUNT(*) FROM cms_versions cv WHERE instr(cv.snapshot_json,m.url)>0)
  +(SELECT COUNT(*) FROM homepage_sections hs WHERE instr(hs.content_json,m.url)>0)
  +(SELECT COUNT(*) FROM seo_entries se WHERE instr(se.open_graph_json,m.url)>0 OR instr(se.twitter_json,m.url)>0)
  +(SELECT COUNT(*) FROM settings s WHERE instr(s.value_json,m.url)>0)`;
const mediaUsage = async (c, asset) => {
  const queries = [
    ["Products", "SELECT COUNT(*) count FROM products WHERE image_url=?1 OR detail_image_url=?1"],
    ["Product galleries", "SELECT COUNT(*) count FROM product_media WHERE media_id=?1", true],
    ["Packaging", "SELECT COUNT(*) count FROM packaging_assets WHERE media_id=?1", true],
    ["Categories", "SELECT COUNT(*) count FROM categories WHERE image_url=?1 OR hero_image_url=?1 OR banner_image_url=?1 OR thumbnail_url=?1"],
    ["Banners", "SELECT COUNT(*) count FROM banners WHERE image_url=?1"],
    ["Digital platform", "SELECT COUNT(*) count FROM digital_content WHERE image_url=?1"],
    ["CMS entries", "SELECT COUNT(*) count FROM cms_entries WHERE instr(content_json,?1)>0 OR instr(seo_json,?1)>0"],
    ["CMS version history", "SELECT COUNT(*) count FROM cms_versions WHERE instr(snapshot_json,?1)>0"],
    ["Homepage", "SELECT COUNT(*) count FROM homepage_sections WHERE instr(content_json,?1)>0"],
    ["SEO", "SELECT COUNT(*) count FROM seo_entries WHERE instr(open_graph_json,?1)>0 OR instr(twitter_json,?1)>0"],
    ["Settings", "SELECT COUNT(*) count FROM settings WHERE instr(value_json,?1)>0"],
    ["Menus", "SELECT COUNT(*) count FROM menu_items WHERE media_id=?1", true],
  ];
  const results = await c.env.DB.batch(queries.map(([, query, usesId]) => c.env.DB.prepare(query).bind(usesId ? asset.id : asset.url)));
  const locations = queries.map(([label], index) => ({ label, count: Number(results[index].results[0]?.count || 0) })).filter((item) => item.count);
  return { count: locations.reduce((sum, item) => sum + item.count, 0), locations };
};

app.use("/api/admin/*", async (c, next) => {
  await enforceRateLimit(c, { scope: "admin-ip", limit: 300, windowSeconds: 60 });
  const admin = await cmsUser(c);
  c.set("admin", admin);
  if (!SAFE_METHODS.has(c.req.method)) await enforceRateLimit(c, { scope: "admin-user-write", limit: 120, windowSeconds: 60, identity: admin.id });
  if (!canAccess(admin.role, c.req.path, c.req.method)) {
    await audit(c, "authorization_denied", "security", null, { role: admin.role });
    throw new HTTPError(403, "Your role cannot perform this action.", "authorization_denied");
  }
  if (admin.mustChangePassword && c.req.path !== "/api/admin/account/password") {
    await audit(c, "password_change_required", "security", admin.id);
    throw new HTTPError(403, "Password change required.", "password_change_required");
  }
  await next();
});
app.patch("/api/admin/account/password", async (c) => {
  const admin=c.get("admin");const data=await body(c);
  const validationError=passwordValidationError(data.newPassword);
  if(validationError)throw new HTTPError(400,validationError,"weak_password");
  const stored=await c.env.DB.prepare("SELECT password_hash,password_salt,password_iterations FROM users WHERE id=?1").bind(admin.id).first();
  if(!stored?.password_hash||!(await verifyPassword(String(data.currentPassword||""),stored.password_salt,stored.password_hash,Number(stored.password_iterations))))throw new HTTPError(400,"Current password is incorrect.","invalid_current_password");
  const password=await hashPassword(String(data.newPassword));
  await c.env.DB.prepare("UPDATE users SET password_hash=?1,password_salt=?2,password_iterations=?3,must_change_password=0,session_version=session_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?4").bind(password.hash,password.salt,password.iterations,admin.id).run();
  await audit(c,"password_changed","user",admin.id);
  return c.json({ok:true});
});
app.get("/api/admin/dashboard", async (c) => {
  const [revenue, orders, pending, products, categories, customers, inventory, lowStock, today, recent, monthly, topProducts, topCategories] = await c.env.DB.batch([
    c.env.DB.prepare("SELECT COALESCE(SUM(o.total_paise),0) value FROM orders o JOIN users u ON u.id=o.user_id AND u.email_verified_at IS NOT NULL WHERE o.payment_status='paid' AND o.payment_method='razorpay'"),
    c.env.DB.prepare("SELECT COUNT(*) value FROM orders o JOIN users u ON u.id=o.user_id AND u.email_verified_at IS NOT NULL"),
    c.env.DB.prepare("SELECT COUNT(*) value FROM orders o JOIN users u ON u.id=o.user_id AND u.email_verified_at IS NOT NULL WHERE o.status IN ('pending','confirmed')"),
    c.env.DB.prepare("SELECT COUNT(*) value FROM products WHERE archived=0"),
    c.env.DB.prepare("SELECT COUNT(*) value FROM categories WHERE active=1"),
    c.env.DB.prepare("SELECT COUNT(*) value FROM users WHERE role='customer'"),
    c.env.DB.prepare("SELECT COALESCE(SUM(stock),0) value FROM product_variants WHERE active=1 AND archived=0"),
    c.env.DB.prepare("SELECT COUNT(*) value FROM product_variants WHERE archived=0 AND stock<=low_stock_threshold"),
    c.env.DB.prepare("SELECT COUNT(*) value FROM orders o JOIN users u ON u.id=o.user_id AND u.email_verified_at IS NOT NULL WHERE date(o.created_at)=date('now')"),
    c.env.DB.prepare("SELECT o.id,o.order_number,o.user_id,o.customer_name,o.status,o.total_paise,o.created_at FROM orders o JOIN users u ON u.id=o.user_id AND u.email_verified_at IS NOT NULL ORDER BY o.created_at DESC LIMIT 6"),
    c.env.DB.prepare("SELECT strftime('%Y-%m',o.created_at) month,COUNT(*) orders,COALESCE(SUM(o.total_paise),0) revenue_paise FROM orders o JOIN users u ON u.id=o.user_id AND u.email_verified_at IS NOT NULL GROUP BY month ORDER BY month DESC LIMIT 12"),
    c.env.DB.prepare("SELECT oi.product_name,SUM(oi.quantity) units FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN users u ON u.id=o.user_id AND u.email_verified_at IS NOT NULL GROUP BY oi.product_id ORDER BY units DESC LIMIT 5"),
    c.env.DB.prepare("SELECT c.name,SUM(oi.quantity) units FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN users u ON u.id=o.user_id AND u.email_verified_at IS NOT NULL JOIN products p ON p.id=oi.product_id JOIN categories c ON c.id=p.category_id GROUP BY c.id ORDER BY units DESC LIMIT 5"),
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
    c.env.DB.prepare("SELECT strftime('%Y-%m',o.created_at) month,COUNT(*) orders,SUM(o.total_paise) revenue_paise FROM orders o JOIN users u ON u.id=o.user_id AND u.email_verified_at IS NOT NULL GROUP BY month ORDER BY month DESC LIMIT 24"),
    c.env.DB.prepare("SELECT oi.product_name,SUM(oi.quantity) units,SUM(oi.unit_price_paise*oi.quantity) revenue_paise FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN users u ON u.id=o.user_id AND u.email_verified_at IS NOT NULL GROUP BY oi.product_id ORDER BY units DESC LIMIT 10"),
    c.env.DB.prepare("SELECT p.category_id,c.name,SUM(oi.quantity) units FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN users u ON u.id=o.user_id AND u.email_verified_at IS NOT NULL JOIN products p ON p.id=oi.product_id JOIN categories c ON c.id=p.category_id GROUP BY p.category_id ORDER BY units DESC LIMIT 10"),
    c.env.DB.prepare("SELECT COUNT(DISTINCT session_id) sessions,(SELECT COUNT(*) FROM orders o JOIN users u ON u.id=o.user_id AND u.email_verified_at IS NOT NULL) orders FROM analytics_events"),
  ]);
  const sessionRow = sessions.results[0] || { sessions: 0, orders: 0 };
  return c.json({ monthly: monthly.results, bestSellingProducts: products.results, topCategories: categories.results, conversionRate: sessionRow.sessions ? sessionRow.orders / sessionRow.sessions * 100 : 0 });
});
app.get("/api/admin/inventory/:id/history", async (c) => c.json((await c.env.DB.prepare("SELECT h.*,u.name actor_name FROM inventory_history h LEFT JOIN users u ON u.id=h.actor_user_id WHERE h.variant_id=?1 ORDER BY h.created_at DESC LIMIT 250").bind(c.req.param("id")).all()).results));
app.get("/api/admin/media-library", async (c) => {
  const search = String(c.req.query("search") || "").trim().slice(0, 100);
  const folder = String(c.req.query("folder") || "").trim().toLowerCase();
  const type = String(c.req.query("type") || "").trim().toLowerCase();
  const sort = String(c.req.query("sort") || "newest");
  const offset = Math.max(0, Number.parseInt(c.req.query("cursor") || "0", 10) || 0);
  const limit = Math.min(60, Math.max(12, Number.parseInt(c.req.query("limit") || "30", 10) || 30));
  const clauses = []; const params = [];
  if (search) { clauses.push("(m.file_name LIKE ? OR m.alt_text LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }
  if (folder && MEDIA_FOLDERS.has(folder)) { clauses.push("m.folder=?"); params.push(folder); }
  if (type === "images") clauses.push("m.mime_type LIKE 'image/%'");
  if (type === "documents") clauses.push("m.mime_type='application/pdf'");
  const order = {
    newest: "m.created_at DESC", oldest: "m.created_at ASC", name: "m.file_name COLLATE NOCASE ASC",
    largest: "m.size_bytes DESC", smallest: "m.size_bytes ASC",
  }[sort] || "m.created_at DESC";
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const [assets, count] = await c.env.DB.batch([
    c.env.DB.prepare(`SELECT m.*,u.name uploaded_by_name,(${usageExpression}) usage_count
      FROM media_assets m LEFT JOIN users u ON u.id=m.created_by ${where}
      ORDER BY ${order} LIMIT ? OFFSET ?`).bind(...params, limit + 1, offset),
    c.env.DB.prepare(`SELECT COUNT(*) total FROM media_assets m ${where}`).bind(...params),
  ]);
  const rows = assets.results.slice(0, limit);
  return c.json({
    assets: rows,
    nextCursor: assets.results.length > limit ? String(offset + limit) : null,
    total: Number(count.results[0]?.total || 0),
  });
});
app.get("/api/admin/media/:id/usage", async (c) => {
  const asset = await c.env.DB.prepare("SELECT id,url FROM media_assets WHERE id=?1").bind(c.req.param("id")).first();
  if (!asset) throw new HTTPError(404, "Media not found.");
  return c.json(await mediaUsage(c, asset));
});
app.get("/api/admin/media/:id/download", async (c) => {
  const asset = await c.env.DB.prepare("SELECT key,file_name,mime_type FROM media_assets WHERE id=?1").bind(c.req.param("id")).first();
  if (!asset) throw new HTTPError(404, "Media not found.");
  const object = await c.env.MEDIA.get(asset.key);
  if (!object?.body) throw new HTTPError(404, "Stored media object not found.");
  const safeName = asset.file_name.replace(/[^\x20-\x7e]|[\r\n"]/g, "_");
  const encodedName = encodeURIComponent(asset.file_name.replace(/[\r\n]/g, "_"));
  return new Response(object.body, { headers: { "Content-Type": asset.mime_type, "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`, ETag: object.httpEtag } });
});
app.patch("/api/admin/media/:id", async (c) => {
  const data = await body(c);
  const current = await c.env.DB.prepare("SELECT * FROM media_assets WHERE id=?1").bind(c.req.param("id")).first();
  if (!current) throw new HTTPError(404, "Media not found.");
  const folder = data.folder === undefined ? current.folder : mediaFolder(data.folder);
  const altText = data.altText === undefined ? current.alt_text : String(data.altText || "").trim().slice(0, 300) || null;
  await c.env.DB.prepare("UPDATE media_assets SET folder=?1,alt_text=?2,updated_at=CURRENT_TIMESTAMP WHERE id=?3").bind(folder, altText, current.id).run();
  await audit(c, "organized", "media", current.id, { folder, altText });
  return c.json({ ...current, folder, alt_text: altText });
});
app.get("/api/admin/customers/:id", async (c) => {
  const target = await customerRecord(c, c.req.param("id"));
  await assertCustomerTargetSafe(c, target);
  const [addresses, accounts, summary, lastLogin] = await c.env.DB.batch([
    c.env.DB.prepare("SELECT * FROM addresses WHERE user_id=?1 ORDER BY is_default DESC,created_at DESC").bind(target.id),
    c.env.DB.prepare("SELECT provider,created_at FROM auth_accounts WHERE user_id=?1 ORDER BY created_at").bind(target.id),
    c.env.DB.prepare("SELECT COUNT(*) orders_count,COALESCE(SUM(total_paise),0) lifetime_value_paise,MAX(created_at) last_order_at FROM orders WHERE user_id=?1").bind(target.id),
    c.env.DB.prepare("SELECT MAX(created_at) last_login_at FROM activity_logs WHERE actor_user_id=?1 AND action='login_succeeded'").bind(target.id),
  ]);
  await audit(c, "customer_profile_viewed", "customer", target.id, customerAuditDetails(c, target));
  return c.json({
    customer: target,
    addresses: addresses.results,
    providers: accounts.results,
    orderSummary: summary.results[0] || {},
    lastLoginAt: lastLogin.results[0]?.last_login_at || null,
    sessions: { mode: "stateless_jwt", individuallyTrackable: false, sessionVersion: Number(target.session_version || 0) },
  });
});

app.get("/api/admin/customers/:id/orders", async (c) => {
  const target = await customerRecord(c, c.req.param("id"));
  await assertCustomerTargetSafe(c, target);
  const orders = (await c.env.DB.prepare(
    "SELECT id,order_number,status,payment_status,total_paise,created_at FROM orders WHERE user_id=?1 ORDER BY created_at DESC LIMIT 250",
  ).bind(target.id).all()).results;
  await audit(c, "customer_orders_viewed", "customer", target.id, customerAuditDetails(c, target, { orderCount: orders.length }));
  return c.json(orders);
});

app.patch("/api/admin/customers/:id", async (c) => {
  const target = await customerRecord(c, c.req.param("id"));
  await assertCustomerTargetSafe(c, target);
  const data = await body(c);
  const firstName = String(data.firstName ?? target.first_name ?? "").trim();
  const lastName = String(data.lastName ?? target.last_name ?? "").trim();
  const name = String(data.name || `${firstName} ${lastName}`.trim()).trim();
  const mobile = String(data.mobile || "").trim();
  const notes = String(data.notes ?? target.customer_notes ?? "").trim();
  const requestedStatus = data.status ? String(data.status).toUpperCase() : target.account_status;
  if (!name || name.length > 160 || firstName.length > 80 || lastName.length > 80 || hasControlCharacter(name)) {
    throw new HTTPError(400, "Customer name is invalid.", "invalid_customer");
  }
  if (mobile && !/^[+0-9 ()-]{7,24}$/.test(mobile)) throw new HTTPError(400, "Mobile number is invalid.", "invalid_customer");
  const notesContainUnsafeControl = [...notes].some((character) => {
    const code = character.charCodeAt(0);
    return (code < 32 && ![9, 10, 13].includes(code)) || code === 127;
  });
  if (notes.length > 4000 || notesContainUnsafeControl) {
    throw new HTTPError(400, "Customer notes are invalid.", "invalid_customer");
  }
  if (!["ACTIVE","SUSPENDED","DELETED"].includes(requestedStatus)) throw new HTTPError(400, "Customer status is invalid.", "invalid_status_action");
  const statusChanged = requestedStatus !== target.account_status;
  if (statusChanged && c.get("admin").role !== "SUPER_ADMIN") {
    throw new HTTPError(403, "Only a Super Admin can change customer status.", "authorization_denied");
  }
  if (statusChanged) await assertCustomerTargetSafe(c, target, requestedStatus !== "ACTIVE");
  const statusAssignment = {
    ACTIVE: "account_status='ACTIVE',suspended_at=NULL,deleted_at=NULL,failed_login_count=0,locked_until=NULL",
    SUSPENDED: "account_status='SUSPENDED',suspended_at=CURRENT_TIMESTAMP,deleted_at=NULL",
    DELETED: "account_status='DELETED',deleted_at=CURRENT_TIMESTAMP,suspended_at=NULL",
  }[requestedStatus];
  const statements = [
    c.env.DB.prepare("UPDATE users SET name=?1,first_name=?2,last_name=?3,mobile=?4,customer_notes=?5,updated_at=CURRENT_TIMESTAMP WHERE id=?6")
      .bind(name, firstName || null, lastName || null, mobile || null, notes || null, target.id),
  ];
  if (statusChanged) {
    statements.push(
      c.env.DB.prepare(`UPDATE users SET ${statusAssignment},status_changed_at=CURRENT_TIMESTAMP,status_changed_by=?1,session_version=session_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?2`).bind(c.get("admin").id,target.id),
      ...(requestedStatus !== "ACTIVE" ? [
        c.env.DB.prepare("DELETE FROM password_reset_tokens WHERE user_id=?1").bind(target.id),
        c.env.DB.prepare("DELETE FROM email_verification_tokens WHERE user_id=?1").bind(target.id),
      ] : []),
    );
  }
  statements.push(auditStatement(c, "customer_updated", "customer", target.id, customerAuditDetails(c, target, { fields: ["name","firstName","lastName","mobile","notes",...(statusChanged?["status"]:[])], previousStatus: target.account_status, newStatus: requestedStatus, sessionsRevoked: statusChanged })));
  await c.env.DB.batch(statements);
  return c.json({ ok: true });
});

app.get("/api/admin/orders/:id", async (c) => {
  const order = await c.env.DB.prepare(
    "SELECT o.* FROM orders o JOIN users u ON u.id=o.user_id AND u.email_verified_at IS NOT NULL WHERE o.id=?1",
  ).bind(c.req.param("id")).first();
  if (!order) throw new HTTPError(404, "Order not found.", "order_not_found");
  const [items, history] = await c.env.DB.batch([
    c.env.DB.prepare("SELECT product_name,variant_name,sku,unit_price_paise,quantity FROM order_items WHERE order_id=?1").bind(order.id),
    c.env.DB.prepare("SELECT status,note,created_at FROM order_status_history WHERE order_id=?1 ORDER BY created_at").bind(order.id),
  ]);
  await audit(c, "order_viewed", "order", order.id, { customerId: order.user_id, customerEmail: order.customer_email, adminEmail: c.get("admin").email });
  return c.json({ order, items: items.results, history: history.results });
});

app.post("/api/admin/customers/:id/password-reset", async (c) => {
  const target = await customerRecord(c, c.req.param("id"));
  await assertCustomerTargetSafe(c, target);
  if (target.account_status !== "ACTIVE" || target.blacklisted || !target.email_verified_at) {
    throw new HTTPError(409, "A reset email cannot be sent while this account is restricted or unverified.", "customer_restricted");
  }
  const rawToken = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const tokenHash = await sha256(rawToken);
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM password_reset_tokens WHERE user_id=?1 OR expires_at<CURRENT_TIMESTAMP").bind(target.id),
    c.env.DB.prepare("INSERT INTO password_reset_tokens(token_hash,user_id,expires_at) VALUES(?1,?2,datetime('now','+1 hour'))").bind(tokenHash,target.id),
    c.env.DB.prepare("INSERT INTO notifications(id,user_id,channel,event_type,recipient,payload_json) VALUES(?1,?2,'email','password_reset',?3,?4)")
      .bind(id(),target.id,target.email,json({ resetUrl: `${c.env.FRONTEND_URL.replace(/\/$/, "")}/reset-password?token=${rawToken}` })),
    auditStatement(c, "password_reset_sent", "customer", target.id, customerAuditDetails(c, target)),
  ]);
  return c.json({ ok: true, message: "Password reset email queued." });
});

app.post("/api/admin/customers/:id/resend-verification", async (c) => {
  const target = await customerRecord(c, c.req.param("id"));
  await assertCustomerTargetSafe(c, target);
  if (target.email_verified_at) throw new HTTPError(409, "This email is already verified.", "already_verified");
  if (target.account_status !== "ACTIVE" || target.blacklisted) throw new HTTPError(409, "Verification cannot be sent to a restricted account.", "customer_restricted");
  const pending = await c.env.DB.prepare(
    "SELECT pending_password_hash,pending_password_salt,pending_password_iterations FROM email_verification_tokens WHERE user_id=?1 AND used_at IS NULL ORDER BY created_at DESC LIMIT 1",
  ).bind(target.id).first();
  if (!pending?.pending_password_hash) throw new HTTPError(409, "No pending email registration was found.", "verification_not_pending");
  const rawToken = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const tokenHash = await sha256(rawToken);
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM email_verification_tokens WHERE user_id=?1 OR expires_at<CURRENT_TIMESTAMP").bind(target.id),
    c.env.DB.prepare("INSERT INTO email_verification_tokens(token_hash,user_id,pending_password_hash,pending_password_salt,pending_password_iterations,expires_at) VALUES(?1,?2,?3,?4,?5,datetime('now','+24 hours'))")
      .bind(tokenHash,target.id,pending.pending_password_hash,pending.pending_password_salt,pending.pending_password_iterations),
    c.env.DB.prepare("INSERT INTO notifications(id,user_id,channel,event_type,recipient,payload_json) VALUES(?1,?2,'email','email_verification',?3,?4)")
      .bind(id(),target.id,target.email,json({ name: target.name, verificationUrl: `${c.env.FRONTEND_URL.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(rawToken)}` })),
    auditStatement(c, "verification_email_resent", "customer", target.id, customerAuditDetails(c, target)),
  ]);
  return c.json({ ok: true, message: "Verification email queued." });
});

app.patch("/api/admin/customers/:id/status", async (c) => {
  const target = await customerRecord(c, c.req.param("id"));
  const data = await body(c);
  const action = String(data.action || "").toLowerCase();
  if (!["suspend","activate","blacklist","unblacklist","delete"].includes(action)) {
    throw new HTTPError(400, "Invalid customer status action.", "invalid_status_action");
  }
  const restricting = ["suspend","blacklist","delete"].includes(action);
  await assertCustomerTargetSafe(c, target, restricting);
  const reason = String(data.reason || "").trim().slice(0, 500) || null;
  const updates = {
    suspend: ["account_status='SUSPENDED',suspended_at=CURRENT_TIMESTAMP,deleted_at=NULL", "customer_suspended"],
    activate: ["account_status='ACTIVE',suspended_at=NULL,deleted_at=NULL,failed_login_count=0,locked_until=NULL", "customer_activated"],
    blacklist: ["blacklisted=1,blacklisted_at=CURRENT_TIMESTAMP", "customer_blacklisted"],
    unblacklist: ["blacklisted=0,blacklisted_at=NULL,failed_login_count=0,locked_until=NULL", "customer_blacklist_removed"],
    delete: ["account_status='DELETED',deleted_at=CURRENT_TIMESTAMP,suspended_at=NULL", "customer_soft_deleted"],
  };
  const [assignment, auditAction] = updates[action];
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE users SET ${assignment},status_reason=?1,status_changed_at=CURRENT_TIMESTAMP,status_changed_by=?2,session_version=session_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?3`)
      .bind(reason,c.get("admin").id,target.id),
    ...(restricting ? [
      c.env.DB.prepare("DELETE FROM password_reset_tokens WHERE user_id=?1").bind(target.id),
      c.env.DB.prepare("DELETE FROM email_verification_tokens WHERE user_id=?1").bind(target.id),
    ] : []),
    auditStatement(c, auditAction, "customer", target.id, customerAuditDetails(c, target, { reason, sessionsRevoked: true })),
  ]);
  return c.json({ ok: true });
});

app.delete("/api/admin/customers/:id", async (c) => {
  const target = await customerRecord(c, c.req.param("id"));
  const data = await body(c);
  if (data.confirmation !== "DELETE") throw new HTTPError(400, "Type DELETE to confirm permanent deletion.", "confirmation_required");
  await assertCustomerTargetSafe(c, target, true);
  const linkedOrders = await c.env.DB.prepare("SELECT COUNT(*) count FROM orders WHERE user_id=?1").bind(target.id).first();
  const statements = [
    auditStatement(c, "customer_permanently_deleted", "customer", target.id, customerAuditDetails(c, target, {
      irreversible: true,
      deletedOrderCount: Number(linkedOrders?.count || 0),
    })),
  ];
  if (target.profile_photo_url) {
    try {
      const pathname = new URL(target.profile_photo_url, c.req.url).pathname;
      const marker = "/api/media/";
      const objectKey = pathname.includes(marker) ? decodeURIComponent(pathname.slice(pathname.indexOf(marker) + marker.length)) : null;
      if (objectKey?.startsWith(`profiles/${target.id}/`)) {
        statements.push(c.env.DB.prepare("INSERT INTO media_deletion_queue(asset_id,object_key) VALUES(?1,?2)").bind(`customer-profile:${target.id}`,objectKey));
      }
    } catch { /* A malformed legacy URL is not an R2 deletion target. */ }
  }
  statements.push(
    c.env.DB.prepare("INSERT INTO media_deletion_queue(asset_id,object_key) SELECT 'customer-invoice:'||id,invoice_key FROM orders WHERE user_id=?1 AND invoice_key IS NOT NULL").bind(target.id),
    c.env.DB.prepare("DELETE FROM processed_payments WHERE order_id IN (SELECT id FROM orders WHERE user_id=?1)").bind(target.id),
    c.env.DB.prepare("DELETE FROM returns WHERE user_id=?1").bind(target.id),
    c.env.DB.prepare("DELETE FROM coupon_redemptions WHERE order_id IN (SELECT id FROM orders WHERE user_id=?1)").bind(target.id),
    c.env.DB.prepare("DELETE FROM notifications WHERE user_id=?1 OR order_id IN (SELECT id FROM orders WHERE user_id=?1)").bind(target.id),
    c.env.DB.prepare("DELETE FROM order_transitions WHERE order_id IN (SELECT id FROM orders WHERE user_id=?1)").bind(target.id),
    c.env.DB.prepare("DELETE FROM order_status_history WHERE order_id IN (SELECT id FROM orders WHERE user_id=?1)").bind(target.id),
    c.env.DB.prepare("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id=?1)").bind(target.id),
    c.env.DB.prepare("DELETE FROM orders WHERE user_id=?1").bind(target.id),
    c.env.DB.prepare("DELETE FROM reviews WHERE user_id=?1").bind(target.id),
    c.env.DB.prepare("DELETE FROM analytics_events WHERE user_id=?1").bind(target.id),
    c.env.DB.prepare("DELETE FROM customer_state WHERE user_id=?1").bind(target.id),
    c.env.DB.prepare("DELETE FROM addresses WHERE user_id=?1").bind(target.id),
    c.env.DB.prepare("DELETE FROM wishlist_items WHERE user_id=?1").bind(target.id),
    c.env.DB.prepare("DELETE FROM carts WHERE user_id=?1").bind(target.id),
    c.env.DB.prepare("DELETE FROM password_reset_tokens WHERE user_id=?1").bind(target.id),
    c.env.DB.prepare("DELETE FROM email_verification_tokens WHERE user_id=?1").bind(target.id),
    c.env.DB.prepare("DELETE FROM auth_accounts WHERE user_id=?1").bind(target.id),
    c.env.DB.prepare("DELETE FROM admin_login_attempts WHERE email=?1").bind(target.email),
    c.env.DB.prepare("DELETE FROM settings WHERE key LIKE 'payment_intent:%' AND (instr(value_json,?1)>0 OR instr(value_json,?2)>0)").bind(target.id,target.email),
    c.env.DB.prepare("UPDATE coupon_redemptions SET user_id=NULL WHERE user_id=?1").bind(target.id),
    c.env.DB.prepare("UPDATE inventory_history SET actor_user_id=NULL WHERE actor_user_id=?1").bind(target.id),
    c.env.DB.prepare("UPDATE inventory_mutations SET actor_user_id=NULL WHERE actor_user_id=?1").bind(target.id),
    c.env.DB.prepare("UPDATE order_transitions SET actor_user_id=NULL WHERE actor_user_id=?1").bind(target.id),
    c.env.DB.prepare("UPDATE cms_entries SET created_by=NULL WHERE created_by=?1").bind(target.id),
    c.env.DB.prepare("UPDATE cms_entries SET updated_by=NULL WHERE updated_by=?1").bind(target.id),
    c.env.DB.prepare("UPDATE cms_versions SET created_by=NULL WHERE created_by=?1").bind(target.id),
    c.env.DB.prepare("UPDATE email_templates SET updated_by=NULL WHERE updated_by=?1").bind(target.id),
    c.env.DB.prepare("UPDATE media_assets SET created_by=NULL WHERE created_by=?1").bind(target.id),
    c.env.DB.prepare("UPDATE activity_logs SET actor_user_id=NULL WHERE actor_user_id=?1").bind(target.id),
    c.env.DB.prepare("DELETE FROM user_permissions WHERE user_id=?1").bind(target.id),
    c.env.DB.prepare("DELETE FROM users WHERE id=?1").bind(target.id),
  );
  await c.env.DB.batch(statements);
  return c.json({ ok: true });
});

app.get("/api/admin/:resource", async (c) => {
  const resource = c.req.param("resource");
  const queries = {
    products: "SELECT p.*,c.name category_name,(SELECT COUNT(*) FROM product_variants v WHERE v.product_id=p.id AND v.archived=0) variant_count,(SELECT COALESCE(SUM(stock),0) FROM product_variants v WHERE v.product_id=p.id AND v.archived=0) stock FROM products p JOIN categories c ON c.id=p.category_id ORDER BY p.archived,p.updated_at DESC",
    categories: "SELECT * FROM categories ORDER BY sort_order,name",
    orders: "SELECT o.* FROM orders o JOIN users u ON u.id=o.user_id AND u.email_verified_at IS NOT NULL ORDER BY o.created_at DESC LIMIT 250",
    customers: "SELECT u.id,u.email,u.name,u.first_name,u.last_name,u.mobile,u.customer_notes,u.email_verified_at,u.account_status,u.blacklisted,CASE WHEN u.blacklisted=1 THEN 'BLACKLISTED' ELSE u.account_status END status,COALESCE(up.role,u.role) role,u.created_at,(SELECT COUNT(*) FROM orders o WHERE o.user_id=u.id) orders_count,(SELECT COALESCE(SUM(total_paise),0) FROM orders o WHERE o.user_id=u.id) lifetime_value_paise FROM users u LEFT JOIN user_permissions up ON up.user_id=u.id WHERE UPPER(COALESCE(up.role,u.role)) NOT IN ('ADMIN','SUPER_ADMIN') ORDER BY u.created_at DESC LIMIT 500",
    users: "SELECT u.id,u.email,u.name,u.mobile,u.account_status,u.blacklisted,COALESCE(up.role,u.role) role,u.created_at,(SELECT COUNT(*) FROM orders o WHERE o.user_id=u.id) orders_count,(SELECT COALESCE(SUM(total_paise),0) FROM orders o WHERE o.user_id=u.id) lifetime_value_paise FROM users u LEFT JOIN user_permissions up ON up.user_id=u.id ORDER BY u.created_at DESC LIMIT 500",
    inventory: "SELECT v.*,p.name product_name FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.archived=0 AND p.archived=0 ORDER BY v.stock",
    coupons: "SELECT * FROM coupons ORDER BY created_at DESC",
    reviews: "SELECT r.*,p.name product_name,u.name customer_name FROM reviews r JOIN products p ON p.id=r.product_id JOIN users u ON u.id=r.user_id ORDER BY r.created_at DESC",
    banners: "SELECT * FROM banners ORDER BY sort_order,created_at DESC",
    settings: "SELECT * FROM settings WHERE key NOT LIKE 'payment_intent:%' ORDER BY key",
    analytics: "SELECT strftime('%Y-%m',o.created_at) month,COUNT(*) orders,SUM(o.total_paise) revenue_paise FROM orders o JOIN users u ON u.id=o.user_id AND u.email_verified_at IS NOT NULL GROUP BY month ORDER BY month DESC LIMIT 24",
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
  const data = validateCmsEntry(await body(c)); const entryId = data.id || id(); const existing = data.id ? await c.env.DB.prepare("SELECT * FROM cms_entries WHERE id=?1").bind(data.id).first() : null;
  if (data.id && !existing) throw new HTTPError(404, "Content entry not found.", "content_not_found");
  const version = Number(existing?.current_version || 0) + 1;
  const contentJson = json(data.content);
  const seoJson = json(data.seo);
  const snapshot = json({ entryType:data.entryType,slug:data.slug,title:data.title,excerpt:data.excerpt,content:data.content,seo:data.seo,status:data.status,publishAt:data.publishAt,expiresAt:data.expiresAt,visibility:data.visibility,parentId:data.parentId,sortOrder:data.sortOrder });
  await c.env.DB.batch([
    c.env.DB.prepare(`INSERT INTO cms_entries(id,entry_type,slug,title,excerpt,content_json,seo_json,status,publish_at,expires_at,visibility,parent_id,sort_order,current_version,created_by,updated_by)
      VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?15)
      ON CONFLICT(id) DO UPDATE SET entry_type=excluded.entry_type,slug=excluded.slug,title=excluded.title,excerpt=excluded.excerpt,content_json=excluded.content_json,seo_json=excluded.seo_json,status=excluded.status,publish_at=excluded.publish_at,expires_at=excluded.expires_at,visibility=excluded.visibility,parent_id=excluded.parent_id,sort_order=excluded.sort_order,current_version=excluded.current_version,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`)
      .bind(entryId,data.entryType,data.slug,data.title,data.excerpt,contentJson,seoJson,data.status,data.publishAt,data.expiresAt,data.visibility,data.parentId,data.sortOrder,version,c.get("admin").id),
    c.env.DB.prepare("INSERT INTO cms_versions(id,entry_id,version,snapshot_json,change_note,created_by) VALUES(?1,?2,?3,?4,?5,?6)").bind(id(),entryId,version,snapshot,data.changeNote,c.get("admin").id),
    auditStatement(c, existing ? "updated" : "created", "content", entryId, { entryType:data.entryType,version }),
  ]);
  return c.json({id:entryId,version});
});
app.post("/api/admin/content/:id/rollback/:version", async (c) => {
  const record = await c.env.DB.prepare("SELECT snapshot_json FROM cms_versions WHERE entry_id=?1 AND version=?2").bind(c.req.param("id"),Number(c.req.param("version"))).first();
  if (!record) throw new HTTPError(404,"Version not found.");
  const snapshot = validateCmsEntry(JSON.parse(record.snapshot_json)); const current = await c.env.DB.prepare("SELECT current_version FROM cms_entries WHERE id=?1").bind(c.req.param("id")).first();
  const nextVersion = Number(current.current_version)+1;
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE cms_entries SET entry_type=?1,slug=?2,title=?3,excerpt=?4,content_json=?5,seo_json=?6,status=?7,publish_at=?8,expires_at=?9,visibility=?10,parent_id=?11,sort_order=?12,current_version=?13,updated_by=?14,updated_at=CURRENT_TIMESTAMP WHERE id=?15").bind(snapshot.entryType,snapshot.slug,snapshot.title,snapshot.excerpt||null,json(snapshot.content||{}),json(snapshot.seo||{}),snapshot.status||"draft",snapshot.publishAt||null,snapshot.expiresAt||null,snapshot.visibility||"sitewide",snapshot.parentId||null,Number(snapshot.sortOrder)||0,nextVersion,c.get("admin").id,c.req.param("id")),
    c.env.DB.prepare("INSERT INTO cms_versions(id,entry_id,version,snapshot_json,change_note,created_by) VALUES(?1,?2,?3,?4,?5,?6)").bind(id(),c.req.param("id"),nextVersion,record.snapshot_json,`Rollback to version ${c.req.param("version")}`,c.get("admin").id),
    auditStatement(c,"rolled_back","content",c.req.param("id"),{fromVersion:c.req.param("version"),newVersion:nextVersion}),
  ]);
  return c.json({ok:true,version:nextVersion});
});
app.patch("/api/admin/content/reorder", async (c) => {
  const data=await body(c); const statements=(data.items||[]).map((item,index)=>c.env.DB.prepare("UPDATE cms_entries SET sort_order=?1,updated_at=CURRENT_TIMESTAMP WHERE id=?2").bind(index*10,item.id));
  if(statements.length)await c.env.DB.batch(statements);
  await audit(c,"reordered","content",null,{count:statements.length});
  return c.json({updated:statements.length});
});
app.delete("/api/admin/content/:id", async (c) => {
  const entry = await c.env.DB.prepare("SELECT id FROM cms_entries WHERE id=?1").bind(c.req.param("id")).first();
  if (!entry) throw new HTTPError(404, "Content entry not found.", "content_not_found");
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM cms_entries WHERE id=?1").bind(entry.id),
    auditStatement(c,"deleted","content",entry.id),
  ]);
  return c.json({ok:true});
});
app.post("/api/admin/content-system/menus", async (c) => {
  const data=await body(c); const menuId=data.id||id();
  assertSafeStructuredValue(data, "Menu item", 25_000);
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
  assertSafeStructuredValue({ name: data.name, subject: data.subject, preheader: data.preheader, htmlContent: data.htmlContent, textContent: data.textContent }, "Email template", 250_000);
  await c.env.DB.prepare("UPDATE email_templates SET name=?1,subject=?2,preheader=?3,html_content=?4,text_content=?5,enabled=?6,current_version=current_version+1,updated_by=?7,updated_at=CURRENT_TIMESTAMP WHERE id=?8").bind(data.name,data.subject,data.preheader||null,data.htmlContent,data.textContent||null,data.enabled===false?0:1,c.get("admin").id,c.req.param("id")).run();
  await audit(c,"updated","email_template",c.req.param("id"),{name:data.name});
  return c.json({ok:true});
});
app.get("/api/admin/products/:id", async (c) => {
  const [product, variants, media, packaging] = await c.env.DB.batch([
    c.env.DB.prepare("SELECT * FROM products WHERE id=?1").bind(c.req.param("id")),
    c.env.DB.prepare("SELECT * FROM product_variants WHERE product_id=?1 AND archived=0 ORDER BY is_default DESC,created_at").bind(c.req.param("id")),
    c.env.DB.prepare("SELECT pm.*,m.url,m.file_name,m.alt_text FROM product_media pm JOIN media_assets m ON m.id=pm.media_id WHERE pm.product_id=?1 ORDER BY pm.sort_order").bind(c.req.param("id")),
    c.env.DB.prepare("SELECT pa.*,m.url,m.file_name FROM packaging_assets pa JOIN media_assets m ON m.id=pa.media_id WHERE pa.product_id=?1").bind(c.req.param("id")),
  ]);
  if (!product.results[0]) throw new HTTPError(404, "Product not found.");
  return c.json({ ...product.results[0], variants: variants.results, media: media.results, packaging: packaging.results });
});
app.post("/api/admin/products", async (c) => {
  const admin = c.get("admin"); const data = validateProduct(await body(c)); const productId = data.id || id();
  if (data.id) {
    const existingProduct = await c.env.DB.prepare("SELECT id FROM products WHERE id=?1").bind(productId).first();
    if (!existingProduct) throw new HTTPError(404, "Product not found.", "product_not_found");
  }
  const category = await c.env.DB.prepare("SELECT id FROM categories WHERE id=?1").bind(data.categoryId).first();
  if (!category) throw new HTTPError(400, "Selected category does not exist.", "invalid_category");
  const existingVariants = (await c.env.DB.prepare("SELECT id,sku,stock,archived FROM product_variants WHERE product_id=?1").bind(productId).all()).results;
  const variantsById = new Map(existingVariants.map((variant) => [variant.id, variant]));
  const archivedBySku = new Map(existingVariants.filter((variant) => variant.archived).map((variant) => [variant.sku.toLowerCase(), variant]));
  const normalizedVariants = data.variants.map((variant) => {
    if (variant.id) {
      const current = variantsById.get(variant.id);
      if (!current) throw new HTTPError(409, "A variant is missing or belongs to another product.", "variant_ownership_conflict");
      return { ...variant, id: current.id, previousStock: Number(current.stock), existing: true };
    }
    const archived = archivedBySku.get(variant.sku.toLowerCase());
    return archived
      ? { ...variant, id: archived.id, previousStock: Number(archived.stock), existing: true }
      : { ...variant, id: id(), previousStock: null, existing: false };
  });
  if (new Set(normalizedVariants.map((variant) => variant.id)).size !== normalizedVariants.length) {
    throw new HTTPError(400, "A product variant may only appear once.", "duplicate_variant");
  }
  if (data.media.length) {
    const media = await c.env.DB.batch(data.media.map((item) => c.env.DB.prepare("SELECT id FROM media_assets WHERE id=?1").bind(item.mediaId)));
    if (media.some((result) => !result.results[0])) throw new HTTPError(400, "One or more selected media assets do not exist.", "invalid_media_reference");
  }
  const statements = [c.env.DB.prepare(`INSERT INTO products(id,category_id,name,slug,brand,subcategory,description,benefits,ingredients,nutrition,storage,shelf_life,country_of_origin,hsn_code,gst_basis_points,barcode,image_url,detail_image_url,seo_title,seo_description,featured,best_seller,new_arrival,active,status,archived)
    VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23,?24,?25,?26)
    ON CONFLICT(id) DO UPDATE SET category_id=excluded.category_id,name=excluded.name,slug=excluded.slug,brand=excluded.brand,subcategory=excluded.subcategory,description=excluded.description,benefits=excluded.benefits,ingredients=excluded.ingredients,nutrition=excluded.nutrition,storage=excluded.storage,shelf_life=excluded.shelf_life,country_of_origin=excluded.country_of_origin,hsn_code=excluded.hsn_code,gst_basis_points=excluded.gst_basis_points,barcode=excluded.barcode,image_url=excluded.image_url,detail_image_url=excluded.detail_image_url,seo_title=excluded.seo_title,seo_description=excluded.seo_description,featured=excluded.featured,best_seller=excluded.best_seller,new_arrival=excluded.new_arrival,active=excluded.active,status=excluded.status,archived=excluded.archived,updated_at=CURRENT_TIMESTAMP`)
    .bind(productId,data.categoryId,data.name,data.slug,data.brand,data.subcategory,data.description,data.benefits,data.ingredients,data.nutrition,data.storage,data.shelfLife,data.countryOfOrigin,data.hsnCode,data.gstBasisPoints,data.barcode,data.imageUrl,data.detailImageUrl,data.seoTitle,data.seoDescription,data.featured?1:0,data.bestSeller?1:0,data.newArrival?1:0,data.active===false?0:1,data.status,data.archived?1:0)];
  const retainedIds = normalizedVariants.map((variant) => variant.id);
  statements.push(retainedIds.length
    ? c.env.DB.prepare(`UPDATE product_variants SET archived=1,active=0,is_default=0,updated_at=CURRENT_TIMESTAMP WHERE product_id=? AND id NOT IN (${retainedIds.map(() => "?").join(",")})`).bind(productId, ...retainedIds)
    : c.env.DB.prepare("UPDATE product_variants SET archived=1,active=0,is_default=0,updated_at=CURRENT_TIMESTAMP WHERE product_id=?1").bind(productId));
  for (const variant of normalizedVariants) {
    statements.push(c.env.DB.prepare(`INSERT INTO product_variants(id,product_id,name,sku,price_paise,compare_at_price_paise,mrp_paise,discount_basis_points,festival_price_paise,bulk_price_paise,wholesale_price_paise,stock,low_stock_threshold,weight_grams,is_default,active,archived)
      VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,0)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,sku=excluded.sku,price_paise=excluded.price_paise,compare_at_price_paise=excluded.compare_at_price_paise,mrp_paise=excluded.mrp_paise,discount_basis_points=excluded.discount_basis_points,festival_price_paise=excluded.festival_price_paise,bulk_price_paise=excluded.bulk_price_paise,wholesale_price_paise=excluded.wholesale_price_paise,low_stock_threshold=excluded.low_stock_threshold,weight_grams=excluded.weight_grams,is_default=excluded.is_default,active=excluded.active,archived=0,updated_at=CURRENT_TIMESTAMP`)
      .bind(variant.id,productId,variant.name,variant.sku,variant.pricePaise,variant.compareAtPricePaise,variant.mrpPaise,variant.discountBasisPoints,variant.festivalPricePaise,variant.bulkPricePaise,variant.wholesalePricePaise,variant.stock,variant.lowStockThreshold,variant.weightGrams,variant.isDefault?1:0,variant.active===false?0:1));
    if (variant.existing && variant.stock !== variant.previousStock) {
      statements.push(c.env.DB.prepare("INSERT INTO inventory_mutations(id,variant_id,mutation_type,expected_stock,quantity,reason,reference_id,actor_user_id) VALUES(?1,?2,'set',?3,?4,'product_save',?5,?6)")
        .bind(id(),variant.id,variant.previousStock,variant.stock,productId,admin.id));
    }
  }
  statements.push(c.env.DB.prepare("DELETE FROM product_media WHERE product_id=?1").bind(productId));
  statements.push(...data.media.map((item) => c.env.DB.prepare("INSERT INTO product_media(id,product_id,media_id,media_type,sort_order) VALUES(?1,?2,?3,?4,?5)").bind(id(),productId,item.mediaId,item.mediaType,item.sortOrder)));
  statements.push(
    auditStatement(c, data.id ? "updated" : "created", "product", productId, { name: data.name, variants: normalizedVariants.length, media: data.media.length }),
    c.env.DB.prepare("INSERT INTO analytics_events(id,user_id,event_name,properties_json) VALUES(?1,?2,'admin_product_save',?3)").bind(id(), admin.id, json({ productId })),
  );
  await c.env.DB.batch(statements);
  return c.json({ id: productId, variantIds: normalizedVariants.map((variant) => variant.id) }, data.id ? 200 : 201);
});
app.post("/api/admin/products/:id/duplicate", async (c) => {
  const [productResult, variantResult, mediaResult] = await c.env.DB.batch([
    c.env.DB.prepare("SELECT * FROM products WHERE id=?1").bind(c.req.param("id")),
    c.env.DB.prepare("SELECT * FROM product_variants WHERE product_id=?1 AND archived=0").bind(c.req.param("id")),
    c.env.DB.prepare("SELECT media_id,media_type,sort_order FROM product_media WHERE product_id=?1").bind(c.req.param("id")),
  ]);
  const source = productResult.results[0];
  if (!source) throw new HTTPError(404, "Product not found.");
  const productId = id(); const suffix = crypto.randomUUID().slice(0, 6);
  const statements = [
    c.env.DB.prepare("INSERT INTO products(id,category_id,name,slug,brand,subcategory,description,benefits,ingredients,nutrition,storage,shelf_life,country_of_origin,hsn_code,gst_basis_points,barcode,image_url,detail_image_url,seo_title,seo_description,status,active) SELECT ?1,category_id,name||' (Copy)',slug||'-copy-'||?2,brand,subcategory,description,benefits,ingredients,nutrition,storage,shelf_life,country_of_origin,hsn_code,gst_basis_points,NULL,image_url,detail_image_url,seo_title,seo_description,'draft',0 FROM products WHERE id=?3").bind(productId,suffix,source.id),
    ...variantResult.results.map((variant) => c.env.DB.prepare("INSERT INTO product_variants(id,product_id,name,sku,price_paise,compare_at_price_paise,mrp_paise,discount_basis_points,festival_price_paise,bulk_price_paise,wholesale_price_paise,stock,low_stock_threshold,weight_grams,is_default,active,archived) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,0,0)").bind(id(),productId,variant.name,`${variant.sku}-COPY-${suffix}`,variant.price_paise,variant.compare_at_price_paise,variant.mrp_paise,variant.discount_basis_points,variant.festival_price_paise,variant.bulk_price_paise,variant.wholesale_price_paise,variant.stock,variant.low_stock_threshold,variant.weight_grams,variant.is_default)),
    ...mediaResult.results.map((media) => c.env.DB.prepare("INSERT INTO product_media(id,product_id,media_id,media_type,sort_order) VALUES(?1,?2,?3,?4,?5)").bind(id(),productId,media.media_id,media.media_type,media.sort_order)),
    auditStatement(c, "duplicated", "product", productId, { sourceId: source.id }),
  ];
  await c.env.DB.batch(statements);
  return c.json({ id: productId }, 201);
});
app.post("/api/admin/categories", async (c) => {
  const data = validateCategory(await body(c)); const categoryId = data.id || id();
  if (data.id && !(await c.env.DB.prepare("SELECT id FROM categories WHERE id=?1").bind(categoryId).first())) throw new HTTPError(404, "Category not found.", "category_not_found");
  await c.env.DB.batch([c.env.DB.prepare(`INSERT INTO categories(id,name,slug,description,short_description,long_description,seo_title,seo_description,image_url,hero_image_url,banner_image_url,thumbnail_url,featured,homepage_visible,navigation_visible,active,sort_order)
    VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,slug=excluded.slug,description=excluded.description,short_description=excluded.short_description,long_description=excluded.long_description,seo_title=excluded.seo_title,seo_description=excluded.seo_description,image_url=excluded.image_url,hero_image_url=excluded.hero_image_url,banner_image_url=excluded.banner_image_url,thumbnail_url=excluded.thumbnail_url,featured=excluded.featured,homepage_visible=excluded.homepage_visible,navigation_visible=excluded.navigation_visible,active=excluded.active,sort_order=excluded.sort_order,updated_at=CURRENT_TIMESTAMP`)
    .bind(categoryId,data.name,data.slug,data.description,data.shortDescription,data.longDescription,data.seoTitle,data.seoDescription,data.imageUrl||data.thumbnailUrl,data.heroImageUrl,data.bannerImageUrl,data.thumbnailUrl,data.featured?1:0,data.homepageVisible===false?0:1,data.navigationVisible===false?0:1,data.active===false?0:1,data.sortOrder),
    auditStatement(c, data.id ? "updated" : "created", "category", categoryId, { name: data.name }),
  ]);
  return c.json({ id: categoryId });
});
app.post("/api/admin/coupons", async (c) => {
  const data=validateCoupon(await body(c));const couponId=data.id||id();
  if (data.id && !(await c.env.DB.prepare("SELECT id FROM coupons WHERE id=?1").bind(couponId).first())) throw new HTTPError(404, "Coupon not found.", "coupon_not_found");
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO coupons(id,code,type,value,minimum_order_paise,expires_at,usage_limit,enabled) VALUES(?1,?2,?3,?4,?5,?6,?7,?8) ON CONFLICT(id) DO UPDATE SET code=excluded.code,type=excluded.type,value=excluded.value,minimum_order_paise=excluded.minimum_order_paise,expires_at=excluded.expires_at,usage_limit=excluded.usage_limit,enabled=excluded.enabled,updated_at=CURRENT_TIMESTAMP").bind(couponId,data.code,data.type,data.value,data.minimumOrderPaise,data.expiresAt,data.usageLimit,data.enabled===false?0:1),
    auditStatement(c, data.id ? "updated" : "created", "coupon", couponId, { code: data.code }),
  ]);
  return c.json({id:couponId});
});
app.post("/api/admin/banners", async (c) => {
  const data=await body(c);const bannerId=data.id||id();
  assertSafeStructuredValue(data, "Banner", 50_000);
  if (!String(data.title || "").trim() || !isMediaLibraryUrl(c, data.imageUrl)) throw new HTTPError(400, "Banner title and a Media Library image are required.", "invalid_banner");
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO banners(id,title,subtitle,image_url,link_url,starts_at,ends_at,active,sort_order,banner_type,device) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11) ON CONFLICT(id) DO UPDATE SET title=excluded.title,subtitle=excluded.subtitle,image_url=excluded.image_url,link_url=excluded.link_url,starts_at=excluded.starts_at,ends_at=excluded.ends_at,active=excluded.active,sort_order=excluded.sort_order,banner_type=excluded.banner_type,device=excluded.device,updated_at=CURRENT_TIMESTAMP").bind(bannerId,String(data.title).trim().slice(0,240),data.subtitle||null,data.imageUrl,data.linkUrl||null,data.startsAt||null,data.endsAt||null,data.active===false?0:1,Number(data.sortOrder)||0,data.bannerType||"homepage",data.device||"both"),
    auditStatement(c, data.id ? "updated" : "created", "banner", bannerId, { title: data.title }),
  ]);
  return c.json({id:bannerId});
});
app.patch("/api/admin/reviews/:id", async (c) => {
  const data=await body(c);if(data.status && !["pending","published","rejected"].includes(data.status))throw new HTTPError(400,"Invalid review status.");
  await c.env.DB.prepare("UPDATE reviews SET status=COALESCE(?1,status),featured=COALESCE(?2,featured),updated_at=CURRENT_TIMESTAMP WHERE id=?3").bind(data.status||null,data.featured===undefined?null:(data.featured?1:0),c.req.param("id")).run();
  await audit(c, "moderated", "review", c.req.param("id"), data);
  return c.json({ok:true});
});
app.put("/api/admin/settings/:key", async (c) => {
  const data=validateSetting(c.req.param("key"),await body(c));
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO settings(key,value_json) VALUES(?1,?2) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP").bind(data.key,json(data.value)),
    auditStatement(c, "updated", "setting", data.key),
  ]);
  return c.json({ok:true});
});
app.delete("/api/admin/products/:id", async (c) => {
  const product = await c.env.DB.prepare("SELECT id FROM products WHERE id=?1").bind(c.req.param("id")).first();
  if (!product) throw new HTTPError(404, "Product not found.", "product_not_found");
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE products SET archived=1,active=0,status='archived',updated_at=CURRENT_TIMESTAMP WHERE id=?1").bind(product.id),
    auditStatement(c, "archived", "product", product.id),
  ]);
  return c.json({ ok: true });
});
app.delete("/api/admin/categories/:id", async (c) => {
  const category = await c.env.DB.prepare("SELECT id FROM categories WHERE id=?1").bind(c.req.param("id")).first();
  if (!category) throw new HTTPError(404, "Category not found.", "category_not_found");
  const used = await c.env.DB.prepare("SELECT COUNT(*) count FROM products WHERE category_id=?1 AND archived=0").bind(c.req.param("id")).first();
  if (used.count) throw new HTTPError(409, "Move or archive products in this category first.");
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM categories WHERE id=?1").bind(category.id),
    auditStatement(c, "deleted", "category", category.id),
  ]);
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
  const note = data.note == null ? null : String(data.note).trim().slice(0, 1000);
  const trackingNumber = data.trackingNumber == null ? null : String(data.trackingNumber).trim().slice(0, 120);
  const [orderResult, itemResult] = await c.env.DB.batch([
    c.env.DB.prepare("SELECT id,status FROM orders WHERE id=?1").bind(c.req.param("id")),
    c.env.DB.prepare("SELECT variant_id,quantity FROM order_items WHERE order_id=?1").bind(c.req.param("id")),
  ]);
  const order = orderResult.results[0];
  if (!order) throw new HTTPError(404, "Order not found.", "order_not_found");
  if (order.status === data.status) {
    if (trackingNumber) await c.env.DB.batch([
      c.env.DB.prepare("UPDATE orders SET tracking_number=?1,updated_at=CURRENT_TIMESTAMP WHERE id=?2").bind(trackingNumber,order.id),
      auditStatement(c, "tracking_updated", "order", order.id, { trackingNumber }),
    ]);
    return c.json({ ok: true, unchanged: true });
  }
  const transitionId = id();
  const statements = [
    c.env.DB.prepare("INSERT INTO order_transitions(id,order_id,from_status,to_status,note,tracking_number,actor_user_id) VALUES(?1,?2,?3,?4,?5,?6,?7)").bind(transitionId,order.id,order.status,data.status,note,trackingNumber,c.get("admin").id),
  ];
  if (data.status === "cancelled") {
    statements.push(...itemResult.results.map((item) => c.env.DB.prepare("INSERT INTO inventory_mutations(id,variant_id,mutation_type,quantity,reason,reference_id,actor_user_id) VALUES(?1,?2,'delta',?3,'order_cancel',?4,?5)").bind(id(),item.variant_id,item.quantity,order.id,c.get("admin").id)));
  }
  statements.push(auditStatement(c, "status_changed", "order", order.id, { fromStatus: order.status, status: data.status }));
  await c.env.DB.batch(statements);
  return c.json({ ok: true });
});
app.patch("/api/admin/inventory/bulk", async (c) => {
  const admin = c.get("admin"); const data = await body(c);
  if (!Array.isArray(data.items) || data.items.length < 1 || data.items.length > 500) throw new HTTPError(400, "Inventory update must contain between 1 and 500 items.");
  const normalized = [];
  const seen = new Set();
  for (const entry of data.items) {
    const stock = Number(entry.stock);
    const variantId = String(entry.variantId || "");
    if (!variantId || seen.has(variantId) || !Number.isSafeInteger(stock) || stock < 0 || stock > 10_000_000) throw new HTTPError(400, "Inventory entry is invalid or duplicated.");
    seen.add(variantId);
    normalized.push({ variantId, stock });
  }
  const currentResults = await c.env.DB.batch(normalized.map((entry) => c.env.DB.prepare("SELECT id,stock FROM product_variants WHERE id=?1 AND archived=0").bind(entry.variantId)));
  if (currentResults.some((result) => !result.results[0])) throw new HTTPError(404, "One or more product variants no longer exist.", "variant_not_available");
  const statements = normalized.map((entry, index) => c.env.DB.prepare("INSERT INTO inventory_mutations(id,variant_id,mutation_type,expected_stock,quantity,reason,actor_user_id) VALUES(?1,?2,'set',?3,?4,'bulk_update',?5)")
    .bind(id(),entry.variantId,Number(currentResults[index].results[0].stock),entry.stock,admin.id));
  statements.push(auditStatement(c, "bulk_updated", "inventory", null, { count: normalized.length }));
  await c.env.DB.batch(statements);
  return c.json({ updated: normalized.length });
});
app.post("/api/admin/uploads", async (c) => {
  const form = await c.req.formData(); const file = form.get("file");
  const folder = mediaFolder(form.get("folder"));
  const fileBytes = file instanceof File ? await file.arrayBuffer() : new ArrayBuffer(0);
  const validated = validateMediaUpload(file, fileBytes);
  const hash = await contentHash(fileBytes);
  const duplicate = await c.env.DB.prepare("SELECT m.*,u.name uploaded_by_name FROM media_assets m LEFT JOIN users u ON u.id=m.created_by WHERE m.content_hash=?1").bind(hash).first();
  if (duplicate) return c.json({ ...duplicate, duplicate: true, usage_count: (await mediaUsage(c, duplicate)).count });
  const key = `${folder}/${crypto.randomUUID()}.${validated.extension}`;
  const thumbnail = form.get("thumbnail");
  let thumbnailKey = null; let thumbnailUrl = null; let thumbnailBytes = null;
  if (thumbnail instanceof File) {
    thumbnailBytes = await thumbnail.arrayBuffer();
    validateMediaUpload(thumbnail, thumbnailBytes, { profile: true, maxBytes: 1_000_000 });
    if (thumbnail.type !== "image/webp") throw new HTTPError(400, "Generated thumbnail must be WEBP.", "invalid_thumbnail");
    thumbnailKey = `${folder}/thumbnails/${crypto.randomUUID()}.webp`;
    thumbnailUrl = `${new URL(c.req.url).origin}/api/media/${thumbnailKey}`;
  }
  const mediaId = id(); const url = `${new URL(c.req.url).origin}/api/media/${key}`;
  const width = Math.max(0, Number.parseInt(String(form.get("width") || "0"), 10) || 0) || null;
  const height = Math.max(0, Number.parseInt(String(form.get("height") || "0"), 10) || 0) || null;
  const altText = String(form.get("altText")||"").trim().slice(0, 300)||null;
  try {
    await c.env.MEDIA.put(key, fileBytes, { httpMetadata: { contentType: file.type, cacheControl: "public,max-age=300,must-revalidate" } });
    if (thumbnailBytes) await c.env.MEDIA.put(thumbnailKey, thumbnailBytes, { httpMetadata: { contentType: "image/webp", cacheControl: "public,max-age=300,must-revalidate" } });
    await c.env.DB.batch([
      c.env.DB.prepare("INSERT INTO media_assets(id,key,url,file_name,folder,mime_type,size_bytes,width,height,alt_text,thumbnail_key,thumbnail_url,content_hash,created_by) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)").bind(mediaId,key,url,validated.fileName,folder,file.type,file.size,width,height,altText,thumbnailKey,thumbnailUrl,hash,c.get("admin").id),
      auditStatement(c, "uploaded", "media", mediaId, { fileName: validated.fileName, key, mimeType: file.type, size: file.size, contentHash: hash }),
    ]);
  } catch (error) {
    await c.env.MEDIA.delete([key, thumbnailKey].filter(Boolean)).catch(() => {});
    if (String(error?.message || "").includes("media_assets.content_hash")) {
      const racedDuplicate = await c.env.DB.prepare("SELECT * FROM media_assets WHERE content_hash=?1").bind(hash).first();
      if (racedDuplicate) return c.json({ ...racedDuplicate, duplicate: true, usage_count: (await mediaUsage(c, racedDuplicate)).count });
    }
    throw error;
  }
  return c.json({ id: mediaId, key, url, fileName: validated.fileName, file_name: validated.fileName, folder, mime_type: file.type, size_bytes: file.size, width, height, alt_text: altText, thumbnail_key: thumbnailKey, thumbnail_url: thumbnailUrl, content_hash: hash, duplicate: false, usage_count: 0 }, 201);
});
app.put("/api/admin/media/:id/replace", async (c) => {
  const current=await c.env.DB.prepare("SELECT * FROM media_assets WHERE id=?1").bind(c.req.param("id")).first();
  if(!current)throw new HTTPError(404,"Media not found.");
  const form=await c.req.formData(); const file=form.get("file");
  const fileBytes = file instanceof File ? await file.arrayBuffer() : new ArrayBuffer(0);
  const validated = validateMediaUpload(file, fileBytes);
  const hash = await contentHash(fileBytes);
  const duplicate = await c.env.DB.prepare("SELECT id,file_name FROM media_assets WHERE content_hash=?1 AND id<>?2").bind(hash,current.id).first();
  if (duplicate) throw new HTTPError(409, `This file already exists as "${duplicate.file_name}".`, "duplicate_media");
  const thumbnail = form.get("thumbnail");
  let thumbnailKey = current.thumbnail_key; let thumbnailUrl = current.thumbnail_url; let thumbnailBytes = null;
  if (thumbnail instanceof File) {
    thumbnailBytes = await thumbnail.arrayBuffer();
    validateMediaUpload(thumbnail, thumbnailBytes, { profile: true, maxBytes: 1_000_000 });
    if (thumbnail.type !== "image/webp") throw new HTTPError(400, "Generated thumbnail must be WEBP.", "invalid_thumbnail");
    thumbnailKey ||= `${current.folder}/thumbnails/${crypto.randomUUID()}.webp`;
    thumbnailUrl = `${new URL(c.req.url).origin}/api/media/${thumbnailKey}`;
  } else if (!file.type.startsWith("image/")) {
    thumbnailKey = null; thumbnailUrl = null;
  }
  const width = Math.max(0, Number.parseInt(String(form.get("width") || "0"), 10) || 0) || null;
  const height = Math.max(0, Number.parseInt(String(form.get("height") || "0"), 10) || 0) || null;
  const previousObject = await c.env.MEDIA.get(current.key);
  const previousBytes = previousObject ? await previousObject.arrayBuffer() : null;
  const previousThumbnail = thumbnailBytes && current.thumbnail_key ? await c.env.MEDIA.get(current.thumbnail_key) : null;
  const previousThumbnailBytes = previousThumbnail ? await previousThumbnail.arrayBuffer() : null;
  try {
    await c.env.MEDIA.put(current.key,fileBytes,{httpMetadata:{contentType:file.type,cacheControl:"public,max-age=300,must-revalidate"}});
    if (thumbnailBytes) await c.env.MEDIA.put(thumbnailKey,thumbnailBytes,{httpMetadata:{contentType:"image/webp",cacheControl:"public,max-age=300,must-revalidate"}});
    const statements = [
      c.env.DB.prepare("UPDATE media_assets SET file_name=?1,mime_type=?2,size_bytes=?3,width=?4,height=?5,thumbnail_key=?6,thumbnail_url=?7,content_hash=?8,updated_at=CURRENT_TIMESTAMP WHERE id=?9").bind(validated.fileName,file.type,file.size,width,height,thumbnailKey,thumbnailUrl,hash,current.id),
      auditStatement(c,"replaced","media",current.id,{key:current.key,fileName:validated.fileName,mimeType:file.type,size:file.size,contentHash:hash}),
    ];
    if (current.thumbnail_key && !thumbnailKey) {
      statements.push(c.env.DB.prepare("INSERT INTO media_deletion_queue(asset_id,object_key) VALUES(?1,?2)").bind(`${current.id}:thumbnail:${id()}`,current.thumbnail_key));
    }
    await c.env.DB.batch(statements);
  } catch (error) {
    if (previousBytes) {
      await c.env.MEDIA.put(current.key,previousBytes,{httpMetadata:{contentType:current.mime_type,cacheControl:"public,max-age=300,must-revalidate"}}).catch(() => {});
    } else {
      await c.env.MEDIA.delete(current.key).catch(() => {});
    }
    if (thumbnailBytes) {
      if (previousThumbnailBytes) {
        await c.env.MEDIA.put(current.thumbnail_key,previousThumbnailBytes,{httpMetadata:{contentType:"image/webp",cacheControl:"public,max-age=300,must-revalidate"}}).catch(() => {});
      } else {
        await c.env.MEDIA.delete(thumbnailKey).catch(() => {});
      }
    }
    throw error;
  }
  if (current.thumbnail_key && !thumbnailKey) {
    try {
      await c.env.MEDIA.delete(current.thumbnail_key);
      await c.env.DB.prepare("DELETE FROM media_deletion_queue WHERE object_key=?1").bind(current.thumbnail_key).run();
    } catch (error) {
      console.error("Deferred media thumbnail cleanup", { assetId: current.id, error: String(error?.message || error) });
    }
  }
  return c.json({...current,file_name:validated.fileName,mime_type:file.type,size_bytes:file.size,width,height,thumbnail_key:thumbnailKey,thumbnail_url:thumbnailUrl,content_hash:hash});
});
app.delete("/api/admin/media/:id", async (c) => {
  const media = await c.env.DB.prepare("SELECT id,key,url,thumbnail_key FROM media_assets WHERE id=?1").bind(c.req.param("id")).first();
  if (!media) throw new HTTPError(404, "Media not found.");
  const assertionId = id();
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(`DELETE FROM media_assets AS m WHERE id=?1 AND (${usageExpression})=0`).bind(media.id),
      c.env.DB.prepare("INSERT INTO transaction_assertions(id,value) VALUES(?1,(SELECT 1 FROM media_deletion_queue WHERE asset_id=?2))").bind(assertionId,media.id),
      c.env.DB.prepare("DELETE FROM transaction_assertions WHERE id=?1").bind(assertionId),
      auditStatement(c, "deleted", "media", media.id, { key: media.key }),
    ]);
  } catch {
    const usage = await mediaUsage(c, media);
    if (usage.count) throw new HTTPError(409, `This asset is currently used in ${usage.count} location${usage.count === 1 ? "" : "s"}.`, "media_in_use");
    const stillExists = await c.env.DB.prepare("SELECT id FROM media_assets WHERE id=?1").bind(media.id).first();
    if (!stillExists) return c.json({ ok: true, alreadyDeleted: true });
    throw new HTTPError(409, "Media usage changed while deletion was in progress. Refresh and try again.", "media_delete_conflict");
  }
  let cleanupPending = false;
  try {
    await c.env.MEDIA.delete([media.key, media.thumbnail_key].filter(Boolean));
    await c.env.DB.prepare("DELETE FROM media_deletion_queue WHERE asset_id=?1").bind(media.id).run();
  } catch (error) {
    cleanupPending = true;
    await c.env.DB.prepare("UPDATE media_deletion_queue SET attempts=attempts+1,last_error=?1,updated_at=CURRENT_TIMESTAMP WHERE asset_id=?2").bind(String(error?.message || error).slice(0,500),media.id).run().catch(() => {});
  }
  return c.json({ ok: true, cleanupPending });
});
app.delete("/api/admin/reviews/:id", async (c) => {
  const review = await c.env.DB.prepare("SELECT id FROM reviews WHERE id=?1").bind(c.req.param("id")).first();
  if (!review) throw new HTTPError(404, "Review not found.", "review_not_found");
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM reviews WHERE id=?1").bind(review.id),
    auditStatement(c, "deleted", "review", review.id),
  ]);
  return c.json({ ok: true });
});
app.put("/api/admin/homepage/:id", async (c) => {
  const data=await body(c);
  const content = assertSafeStructuredValue(data.content || {}, "Homepage content");
  if (!(await c.env.DB.prepare("SELECT id FROM homepage_sections WHERE id=?1").bind(c.req.param("id")).first())) throw new HTTPError(404, "Homepage section not found.", "homepage_section_not_found");
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE homepage_sections SET title=?1,content_json=?2,enabled=?3,sort_order=?4,updated_at=CURRENT_TIMESTAMP WHERE id=?5").bind(data.title||null,json(content),data.enabled===false?0:1,Number(data.sortOrder)||0,c.req.param("id")),
    auditStatement(c,"updated","homepage",c.req.param("id")),
  ]);
  return c.json({ok:true});
});
app.post("/api/admin/digital", async (c) => {
  const data=await body(c); const contentId=data.id||id();
  assertSafeStructuredValue(data, "Digital content", 500_000);
  if (!["weather","mandi","scheme","icar","article"].includes(data.contentType) || !String(data.title || "").trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(data.slug || ""))) throw new HTTPError(400, "Digital content type, title, or slug is invalid.", "invalid_digital_content");
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO digital_content(id,content_type,title,slug,summary,content,image_url,source_url,featured,status,published_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11) ON CONFLICT(id) DO UPDATE SET content_type=excluded.content_type,title=excluded.title,slug=excluded.slug,summary=excluded.summary,content=excluded.content,image_url=excluded.image_url,source_url=excluded.source_url,featured=excluded.featured,status=excluded.status,published_at=excluded.published_at,updated_at=CURRENT_TIMESTAMP").bind(contentId,data.contentType,String(data.title).trim().slice(0,240),data.slug,data.summary||null,data.content||null,data.imageUrl||null,data.sourceUrl||null,data.featured?1:0,data.status||"draft",data.status==="published"?(data.publishedAt||new Date().toISOString()):null),
    auditStatement(c,data.id?"updated":"created","digital",contentId,{title:data.title}),
  ]);
  return c.json({id:contentId});
});
app.post("/api/admin/seo", async (c) => {
  const data=await body(c); const seoId=data.id||id();
  assertSafeStructuredValue(data, "SEO content", 250_000);
  let openGraph = data.openGraph || {};
  if (!data.openGraph && data.openGraphJson) { try { openGraph = JSON.parse(data.openGraphJson); } catch { openGraph = {}; } }
  if (data.openGraphImageUrl !== undefined) openGraph = { ...openGraph, image: data.openGraphImageUrl || undefined };
  let twitter = data.twitter || {};
  if (!data.twitter && data.twitterJson) { try { twitter = JSON.parse(data.twitterJson); } catch { twitter = {}; } }
  if (!String(data.route || "").startsWith("/")) throw new HTTPError(400, "SEO route must be site-relative.", "invalid_seo_route");
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO seo_entries(id,route,meta_title,meta_description,canonical_url,open_graph_json,twitter_json,robots) VALUES(?1,?2,?3,?4,?5,?6,?7,?8) ON CONFLICT(id) DO UPDATE SET route=excluded.route,meta_title=excluded.meta_title,meta_description=excluded.meta_description,canonical_url=excluded.canonical_url,open_graph_json=excluded.open_graph_json,twitter_json=excluded.twitter_json,robots=excluded.robots,updated_at=CURRENT_TIMESTAMP").bind(seoId,data.route,data.metaTitle||null,data.metaDescription||null,data.canonicalUrl||null,json(openGraph),json(twitter),data.robots||"index,follow"),
    auditStatement(c,data.id?"updated":"created","seo",seoId,{route:data.route}),
  ]);
  return c.json({id:seoId});
});
app.put("/api/admin/permissions/:userId", async (c) => {
  const data=await body(c);
  if(!["SUPER_ADMIN","ADMIN"].includes(data.role))throw new HTTPError(400,"Invalid administrator role.");
  const target = await c.env.DB.prepare("SELECT u.id,u.email,u.account_status,u.blacklisted,COALESCE(p.role,u.role) role FROM users u LEFT JOIN user_permissions p ON p.user_id=u.id WHERE u.id=?1").bind(c.req.param("userId")).first();
  if (!target) throw new HTTPError(404, "User not found.");
  if (
    target.role === "SUPER_ADMIN"
    && data.role !== "SUPER_ADMIN"
    && target.account_status === "ACTIVE"
    && !target.blacklisted
    && await activeSuperAdminCount(c) <= 1
  ) {
    throw new HTTPError(409, "The last active Super Admin cannot be demoted.", "last_super_admin");
  }
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO user_permissions(user_id,role) VALUES(?1,?2) ON CONFLICT(user_id) DO UPDATE SET role=excluded.role,updated_at=CURRENT_TIMESTAMP").bind(target.id,data.role),
    c.env.DB.prepare("UPDATE users SET session_version=session_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?1").bind(target.id),
    auditStatement(c,"role_changed","user",target.id,{customerId:target.id,customerEmail:target.email,adminEmail:c.get("admin").email,previousRole:target.role,newRole:data.role,sessionsRevoked:true}),
  ]);
  return c.json({ok:true});
});

export default {
  fetch: app.fetch,
  async scheduled(event, env) {
    await env.DB.batch([
      env.DB.prepare("UPDATE cms_entries SET status='published',updated_at=CURRENT_TIMESTAMP WHERE status='scheduled' AND publish_at<=CURRENT_TIMESTAMP"),
      env.DB.prepare("UPDATE cms_entries SET status='archived',updated_at=CURRENT_TIMESTAMP WHERE status='published' AND expires_at IS NOT NULL AND expires_at<=CURRENT_TIMESTAMP"),
      env.DB.prepare("DELETE FROM rate_limit_buckets WHERE datetime(expires_at)<CURRENT_TIMESTAMP"),
      env.DB.prepare("DELETE FROM admin_login_attempts WHERE attempted_at<datetime('now','-7 days')"),
    ]);
    const pendingMediaDeletes = (await env.DB.prepare("SELECT * FROM media_deletion_queue ORDER BY created_at LIMIT 50").all()).results;
    for (const pending of pendingMediaDeletes) {
      try {
        await env.MEDIA.delete([pending.object_key, pending.thumbnail_key].filter(Boolean));
        await env.DB.prepare("DELETE FROM media_deletion_queue WHERE asset_id=?1").bind(pending.asset_id).run();
      } catch (error) {
        await env.DB.prepare("UPDATE media_deletion_queue SET attempts=attempts+1,last_error=?1,updated_at=CURRENT_TIMESTAMP WHERE asset_id=?2")
          .bind(String(error?.message || error).slice(0,500), pending.asset_id).run();
      }
    }
    const unhashedMedia = (await env.DB.prepare("SELECT id,key FROM media_assets WHERE content_hash IS NULL AND duplicate_of IS NULL ORDER BY created_at LIMIT 10").all()).results;
    for (const asset of unhashedMedia) {
      try {
        const object = await env.MEDIA.get(asset.key);
        if (!object) continue;
        const hash = await contentHash(await object.arrayBuffer());
        const duplicate = await env.DB.prepare("SELECT id FROM media_assets WHERE content_hash=?1 AND id<>?2").bind(hash,asset.id).first();
        await env.DB.prepare(duplicate
          ? "UPDATE media_assets SET duplicate_of=?1,updated_at=CURRENT_TIMESTAMP WHERE id=?2 AND content_hash IS NULL"
          : "UPDATE media_assets SET content_hash=?1,updated_at=CURRENT_TIMESTAMP WHERE id=?2 AND content_hash IS NULL")
          .bind(duplicate ? duplicate.id : hash,asset.id).run();
      } catch (error) {
        console.error("Media hash backfill failed", { assetId: asset.id, error: String(error?.message || error) });
      }
    }
    if (!env.NOTIFICATION_WEBHOOK || !env.NOTIFICATION_WEBHOOK_SECRET) {
      const pendingAuthenticationEmail = await env.DB.prepare(
        "SELECT COUNT(*) count FROM notifications WHERE status IN ('queued','failed') AND event_type IN ('email_verification','password_reset') AND attempts<5",
      ).first();
      if (Number(pendingAuthenticationEmail?.count || 0) > 0) {
        console.error(json({
          event: "authentication_email_delivery_unconfigured",
          component: "authentication",
          pending: Number(pendingAuthenticationEmail.count),
          missingWebhook: !env.NOTIFICATION_WEBHOOK,
          missingWebhookSecret: !env.NOTIFICATION_WEBHOOK_SECRET,
        }));
      }
      return;
    }
    const queued = (await env.DB.prepare(
      "SELECT * FROM notifications WHERE status IN ('queued','failed') AND attempts<5 AND (next_attempt_at IS NULL OR next_attempt_at<=CURRENT_TIMESTAMP) ORDER BY created_at LIMIT 50",
    ).all()).results;
    for (const notification of queued) {
      try {
        const template = await env.DB.prepare("SELECT template_key,subject,preheader,html_content,text_content FROM email_templates WHERE template_key=?1 AND enabled=1").bind(notification.event_type).first();
        const response = await fetch(env.NOTIFICATION_WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.NOTIFICATION_WEBHOOK_SECRET || ""}` }, body: json({ ...JSON.parse(notification.payload_json), template }) });
        if (response.ok) {
          await env.DB.prepare(`UPDATE notifications SET status='sent',sent_at=CURRENT_TIMESTAMP,attempts=attempts+1,
            next_attempt_at=NULL,last_error=NULL,
            payload_json=CASE WHEN event_type IN ('email_verification','password_reset') THEN '{"delivered":true}' ELSE payload_json END
            WHERE id=?1`).bind(notification.id).run();
        } else {
          await env.DB.prepare(`UPDATE notifications SET status='failed',attempts=attempts+1,
            next_attempt_at=datetime('now',CASE attempts WHEN 0 THEN '+5 minutes' WHEN 1 THEN '+15 minutes' WHEN 2 THEN '+30 minutes' ELSE '+60 minutes' END),
            last_error=?1 WHERE id=?2`).bind(`HTTP ${response.status}`, notification.id).run();
        }
      } catch (error) {
        await env.DB.prepare(`UPDATE notifications SET status='failed',attempts=attempts+1,
          next_attempt_at=datetime('now',CASE attempts WHEN 0 THEN '+5 minutes' WHEN 1 THEN '+15 minutes' WHEN 2 THEN '+30 minutes' ELSE '+60 minutes' END),
          last_error=?1 WHERE id=?2`).bind(String(error?.message || error).slice(0,300), notification.id).run();
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
