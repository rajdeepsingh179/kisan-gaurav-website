/* global Buffer, exports, require */
const crypto = require("node:crypto");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { defineSecret } = require("firebase-functions/params");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");

initializeApp();
setGlobalOptions({ region: "asia-south1", maxInstances: 20 });
const db = getFirestore();
const razorpayKeyId = defineSecret("RAZORPAY_KEY_ID");
const razorpayKeySecret = defineSecret("RAZORPAY_KEY_SECRET");

async function authoritativeCheckout(data) {
  if (!Array.isArray(data.items) || !data.items.length) throw new HttpsError("invalid-argument", "Cart is empty.");
  const items = [];
  for (const requested of data.items) {
    const snapshot = await db.doc(`products/${requested.slug}`).get();
    if (!snapshot.exists || snapshot.data().active !== true) throw new HttpsError("failed-precondition", `Product ${requested.slug} is unavailable.`);
    const product = snapshot.data();
    const variant = product.variants?.find((entry) => entry.name === requested.variant);
    if (!variant) throw new HttpsError("invalid-argument", "Invalid product variant.");
    const quantity = Math.max(1, Math.min(10, Number(requested.quantity) || 1));
    items.push({ slug: requested.slug, name: product.name, image: product.image, variant: requested.variant, price: variant.price, quantity });
  }
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let discount = 0;
  if (data.couponCode) {
    const coupon = await db.doc(`coupons/${String(data.couponCode).toUpperCase()}`).get();
    if (coupon.exists && coupon.data().active && (!coupon.data().expiresAt || coupon.data().expiresAt.toMillis() > Date.now())) {
      discount = coupon.data().type === "percent" ? subtotal * coupon.data().value / 100 : coupon.data().value;
      discount = Math.min(Math.round(discount), subtotal);
    }
  }
  const shipping = subtotal - discount >= 999 ? 0 : 79;
  const tax = Math.round((subtotal - discount + shipping) * .05);
  return { items, totals: { subtotal, discount, shipping, tax, total: subtotal - discount + shipping + tax } };
}

exports.createCheckoutOrder = onCall(async (request) => {
  const data = request.data || {};
  if (!data.customer?.email || !data.address?.pincode) throw new HttpsError("invalid-argument", "Customer and shipping address are required.");
  const checkout = await authoritativeCheckout(data);
  const reference = db.collection("orders").doc();
  await reference.set({ ...checkout, customerId: request.auth?.uid || null, guest: !request.auth, customer: data.customer, address: data.address, couponCode: data.couponCode || null, paymentMethod: "cod", paymentStatus: "pending", status: "confirmed", tracking: [{ status: "confirmed", at: FieldValue.serverTimestamp() }], createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  return { id: reference.id, status: "confirmed" };
});

exports.createRazorpayOrder = onCall({ secrets: [razorpayKeyId, razorpayKeySecret] }, async (request) => {
  const checkout = await authoritativeCheckout(request.data || {});
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${razorpayKeyId.value()}:${razorpayKeySecret.value()}`).toString("base64")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: checkout.totals.total * 100, currency: "INR", receipt: `kg_${Date.now()}`, notes: { customerId: request.auth?.uid || "guest" } }),
  });
  if (!response.ok) throw new HttpsError("internal", "Payment order creation failed.");
  const order = await response.json();
  await db.doc(`paymentIntents/${order.id}`).set({ ...checkout, checkout: request.data, customerId: request.auth?.uid || null, status: "created", createdAt: FieldValue.serverTimestamp() });
  return { id: order.id, amount: order.amount, currency: order.currency };
});

exports.verifyRazorpayPayment = onCall({ secrets: [razorpayKeySecret] }, async (request) => {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = request.data || {};
  const expected = crypto.createHmac("sha256", razorpayKeySecret.value()).update(`${orderId}|${paymentId}`).digest("hex");
  if (!signature || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) throw new HttpsError("permission-denied", "Payment verification failed.");
  const intent = await db.doc(`paymentIntents/${orderId}`).get();
  if (!intent.exists) throw new HttpsError("not-found", "Payment intent not found.");
  const data = intent.data();
  const reference = db.collection("orders").doc();
  await reference.set({ items: data.items, totals: data.totals, customerId: request.auth?.uid || null, guest: !request.auth, customer: data.checkout.customer, address: data.checkout.address, couponCode: data.checkout.couponCode || null, paymentMethod: "razorpay", paymentStatus: "paid", razorpay: { orderId, paymentId }, status: "confirmed", tracking: [{ status: "confirmed", at: FieldValue.serverTimestamp() }], createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  await intent.ref.update({ status: "verified", paymentId, orderDocumentId: reference.id, verifiedAt: FieldValue.serverTimestamp() });
  return { orderId: reference.id };
});

exports.requestReturn = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to request a return.");
  const order = await db.doc(`orders/${request.data.orderId}`).get();
  if (!order.exists || order.data().customerId !== request.auth.uid) throw new HttpsError("permission-denied", "Order not available.");
  const reference = db.collection("returns").doc();
  await reference.set({ orderId: order.id, customerId: request.auth.uid, reason: request.data.reason, status: "requested", createdAt: FieldValue.serverTimestamp() });
  return { id: reference.id, status: "requested" };
});
