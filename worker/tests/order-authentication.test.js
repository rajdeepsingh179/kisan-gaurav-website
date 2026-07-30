import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";
import { hashPassword } from "../src/auth.js";
import { createCommerceDatabase } from "./helpers/d1.js";

const ORIGIN = "https://kisangaurav.com";
const PASSWORD = "Strong password 123!";
const RAZORPAY_SECRET = "razorpay-test-secret";

class CookieJar {
  values = new Map();
  apply(response) {
    for (const header of response.headers.getSetCookie()) {
      const [pair] = header.split(";");
      const separator = pair.indexOf("=");
      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      if (value) this.values.set(name, value);
      else this.values.delete(name);
    }
  }
  header() { return [...this.values].map(([name, value]) => `${name}=${value}`).join("; "); }
}

const media = {
  objects: new Map(),
  async put(key, value) { this.objects.set(key, value); },
  async delete(key) { this.objects.delete(key); },
  async get(key) { const value = this.objects.get(key); return value ? { body: value } : null; },
};
const environment = (db) => ({
  AUTH_SECRET: "release-test-secret-that-is-at-least-32-bytes",
  FRONTEND_URL: ORIGIN,
  RAZORPAY_KEY_ID: "rzp_test_key",
  RAZORPAY_KEY_SECRET: RAZORPAY_SECRET,
  DB: db,
  MEDIA: media,
});

async function request(db, path, payload, cookie = "", method = "POST") {
  const response = await worker.fetch(new Request(`${ORIGIN}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Origin: ORIGIN, ...(cookie ? { Cookie: cookie } : {}) },
    ...(!["GET", "HEAD"].includes(method) ? { body: JSON.stringify(payload) } : {}),
  }), environment(db));
  return { response, data: await response.json() };
}

async function signIn(db, email) {
  const jar = new CookieJar();
  const csrfResponse = await worker.fetch(new Request(`${ORIGIN}/api/auth/csrf`), environment(db));
  jar.apply(csrfResponse);
  const { csrfToken } = await csrfResponse.json();
  const response = await worker.fetch(new Request(`${ORIGIN}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Auth-Return-Redirect": "1",
      Origin: ORIGIN,
      Cookie: jar.header(),
    },
    body: new URLSearchParams({ csrfToken, email, password: PASSWORD, rememberMe: "1", callbackUrl: `${ORIGIN}/checkout` }),
  }), environment(db));
  jar.apply(response);
  assert.equal(new URL((await response.json()).url).searchParams.has("error"), false);
  return jar;
}

async function seedCustomer(db, { verified = true } = {}) {
  const password = await hashPassword(PASSWORD, crypto.randomUUID(), 100000);
  db.database.prepare(
    "INSERT INTO users(id,email,name,password_hash,password_salt,password_iterations,email_verified_at) VALUES(?,?,?,?,?,?,?)",
  ).run("customer-1", "customer@example.com", "Registered Customer", password.hash, password.salt, password.iterations, verified ? new Date().toISOString() : null);
}

async function seedAdmin(db) {
  const password = await hashPassword(PASSWORD, crypto.randomUUID(), 100000);
  db.database.prepare(
    "INSERT INTO users(id,email,name,password_hash,password_salt,password_iterations,email_verified_at) VALUES(?,?,?,?,?,?,?)",
  ).run("admin-1", "admin@example.com", "Operations Admin", password.hash, password.salt, password.iterations, new Date().toISOString());
  db.database.prepare("INSERT INTO user_permissions(user_id,role) VALUES(?,?)").run("admin-1", "ADMIN");
}

function seedProduct(db) {
  db.database.prepare("INSERT INTO categories(id,name) VALUES(?,?)").run("category-1", "Dry Fruits");
  db.database.prepare("INSERT INTO products(id,category_id,name,slug) VALUES(?,?,?,?)").run("product-1", "category-1", "Premium Almonds", "premium-almonds");
  db.database.prepare("INSERT INTO product_variants(id,product_id,name,sku,price_paise,stock) VALUES(?,?,?,?,?,?)").run("variant-1", "product-1", "250 gm", "ALMOND-250", 49900, 10);
}

const checkout = (overrides = {}) => ({
  customer: { name: "Registered Customer", email: "customer@example.com", phone: "9876543210" },
  address: { line1: "1 Market Road", line2: "", city: "Delhi", state: "Delhi", pincode: "110001" },
  items: [{ slug: "premium-almonds", variant: "250 gm", quantity: 1 }],
  paymentMethod: "razorpay",
  shippingMethod: "standard",
  saveAddress: true,
  ...overrides,
});

async function signature(value) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(RAZORPAY_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const result = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(result)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

test("guest requests cannot use cart state, coupons, checkout, payment, or order creation APIs", async (t) => {
  const db = createCommerceDatabase();
  t.after(() => db.close());
  seedProduct(db);
  for (const [path, payload, method] of [
    ["/api/checkout/quote", checkout()],
    ["/api/orders", checkout({ paymentMethod: "cod" })],
    ["/api/payments/razorpay/order", checkout()],
    ["/api/customer-state/cart", [], "PUT"],
    ["/api/account/addresses", {}],
  ]) {
    const result = await request(db, path, payload, "", method);
    assert.equal(result.response.status, 401, path);
  }
  assert.equal(db.database.prepare("SELECT COUNT(*) count FROM orders").get().count, 0);
});

test("verified customer completes Razorpay checkout and the order is linked to that customer", async (t) => {
  const db = createCommerceDatabase();
  t.after(() => db.close());
  await seedCustomer(db);
  seedProduct(db);
  const jar = await signIn(db, "customer@example.com");
  t.mock.method(globalThis, "fetch", async (input) => {
    assert.equal(new URL(typeof input === "string" ? input : input.url).hostname, "api.razorpay.com");
    return Response.json({ id: "order_rzp_123456", amount: 60690, currency: "INR" });
  });

  const created = await request(db, "/api/payments/razorpay/order", checkout(), jar.header());
  assert.equal(created.response.status, 200);
  assert.equal(created.data.id, "order_rzp_123456");
  const paymentId = "pay_rzp_123456";
  const verified = await request(db, "/api/payments/razorpay/verify", {
    razorpay_order_id: created.data.id,
    razorpay_payment_id: paymentId,
    razorpay_signature: await signature(`${created.data.id}|${paymentId}`),
  }, jar.header());
  assert.equal(verified.response.status, 200);

  const order = db.database.prepare("SELECT user_id,customer_email,customer_name,payment_method,payment_status FROM orders").get();
  assert.equal(order.user_id, "customer-1");
  assert.equal(order.customer_email, "customer@example.com");
  assert.equal(order.customer_name, "Registered Customer");
  assert.equal(order.payment_method, "razorpay");
  assert.equal(order.payment_status, "paid");
  assert.equal(db.database.prepare("SELECT COUNT(*) count FROM orders WHERE user_id IS NULL").get().count, 0);
});

test("authenticated checkout rejects COD, spoofed identity, and anonymous database inserts", async (t) => {
  const db = createCommerceDatabase();
  t.after(() => db.close());
  await seedCustomer(db);
  seedProduct(db);
  const jar = await signIn(db, "customer@example.com");

  const cod = await request(db, "/api/orders", checkout({ paymentMethod: "cod" }), jar.header());
  assert.equal(cod.response.status, 405);
  assert.equal(cod.data.code, "online_payment_required");
  const spoofed = await request(db, "/api/payments/razorpay/order", checkout({
    customer: { name: "Other", email: "other@example.com", phone: "9876543210" },
  }), jar.header());
  assert.equal(spoofed.response.status, 403);
  assert.equal(spoofed.data.code, "customer_identity_mismatch");

  assert.throws(() => db.database.prepare(
    "INSERT INTO orders(id,order_number,user_id,customer_name,customer_email,customer_mobile,shipping_address_json,shipping_method,subtotal_paise,total_paise,payment_method,payment_status,payment_order_id,payment_id,status) VALUES('bad','BAD',NULL,'Guest','guest@example.com','9999999999','{}','standard',100,100,'razorpay','paid','order_bad','pay_bad','confirmed')",
  ).run(), /ORDER_REQUIRES_VERIFIED_CUSTOMER/);
  assert.equal(db.database.prepare("SELECT COUNT(*) count FROM orders").get().count, 0);
});

test("ADMIN can inspect and edit customers but cannot perform lifecycle actions", async (t) => {
  const db = createCommerceDatabase();
  t.after(() => db.close());
  await seedCustomer(db);
  await seedAdmin(db);
  const jar = await signIn(db, "admin@example.com");

  const profile = await request(db, "/api/admin/customers/customer-1", undefined, jar.header(), "GET");
  assert.equal(profile.response.status, 200);
  assert.equal(profile.data.customer.id, "customer-1");
  assert.equal(profile.data.sessions.mode, "stateless_jwt");

  const updated = await request(db, "/api/admin/customers/customer-1", {
    name: "Updated Customer",
    firstName: "Updated",
    lastName: "Customer",
    mobile: "+91 98765 43210",
    notes: "Priority customer\nPrefers email",
  }, jar.header(), "PATCH");
  assert.equal(updated.response.status, 200);
  const storedCustomer = db.database.prepare("SELECT name,mobile,customer_notes FROM users WHERE id=?").get("customer-1");
  assert.equal(storedCustomer.name, "Updated Customer");
  assert.equal(storedCustomer.mobile, "+91 98765 43210");
  assert.equal(storedCustomer.customer_notes, "Priority customer\nPrefers email");

  const reset = await request(db, "/api/admin/customers/customer-1/password-reset", {}, jar.header());
  assert.equal(reset.response.status, 200);
  assert.equal(db.database.prepare("SELECT COUNT(*) count FROM notifications WHERE user_id=? AND event_type='password_reset'").get("customer-1").count, 1);

  const restricted = await request(db, "/api/admin/customers/customer-1/status", { action: "suspend" }, jar.header(), "PATCH");
  assert.equal(restricted.response.status, 403);
  assert.equal(db.database.prepare("SELECT account_status FROM users WHERE id=?").get("customer-1").account_status, "ACTIVE");
  assert.equal(db.database.prepare("SELECT COUNT(*) count FROM activity_logs WHERE action='customer_profile_viewed'").get().count, 1);
  assert.equal(db.database.prepare("SELECT COUNT(*) count FROM activity_logs WHERE action='customer_updated'").get().count, 1);
});
