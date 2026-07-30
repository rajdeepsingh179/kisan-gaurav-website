import { HTTPError } from "./http.js";

export const id = () => crypto.randomUUID();
export const json = (value) => JSON.stringify(value);

export async function calculateCheckout(env, payload) {
  if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) throw new HTTPError(400, "Cart is empty.", "empty_cart");
  if (payload.items.length > 100) throw new HTTPError(400, "Cart contains too many line items.", "invalid_cart");
  const items = [];
  const seenVariants = new Set();
  for (const requested of payload.items) {
    const slug = String(requested?.slug || "").trim();
    const variantName = String(requested?.variant || "").trim();
    const quantity = Number(requested?.quantity);
    if (!slug || !variantName || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10) {
      throw new HTTPError(400, "Cart contains an invalid product, variant, or quantity.", "invalid_cart_item");
    }
    const dbVariant = await env.DB.prepare("SELECT v.id,v.sku,v.price_paise,v.festival_price_paise,v.stock,p.id product_id,p.name FROM product_variants v JOIN products p ON p.id=v.product_id WHERE p.slug=?1 AND v.name=?2 AND p.active=1 AND p.archived=0 AND p.status='published' AND v.active=1 AND v.archived=0").bind(slug, variantName).first();
    if (!dbVariant) throw new HTTPError(409, `Unavailable product or variant: ${slug}`, "variant_not_available");
    if (seenVariants.has(dbVariant.id)) throw new HTTPError(400, "A cart variant may only appear once.", "duplicate_cart_item");
    seenVariants.add(dbVariant.id);
    const unitPrice = dbVariant.festival_price_paise || dbVariant.price_paise;
    if (dbVariant.stock < quantity) throw new HTTPError(409, `${dbVariant.name} does not have enough stock.`, "insufficient_stock");
    items.push({ productId: dbVariant.product_id, variantId: dbVariant.id, sku: dbVariant.sku, name: dbVariant.name, variant: variantName, pricePaise: unitPrice, quantity });
  }
  const subtotalPaise = items.reduce((total, item) => total + item.pricePaise * item.quantity, 0);
  let discountPaise = 0;
  let coupon = null;
  if (payload.couponCode) {
    coupon = await env.DB.prepare("SELECT * FROM coupons WHERE code=?1 AND enabled=1 AND (expires_at IS NULL OR expires_at>CURRENT_TIMESTAMP) AND (usage_limit IS NULL OR usage_count<usage_limit)").bind(String(payload.couponCode).toUpperCase()).first();
    if (!coupon) throw new HTTPError(409, "Coupon is invalid, exhausted, or expired.", "coupon_unavailable");
    if (subtotalPaise < coupon.minimum_order_paise) throw new HTTPError(400, "Order does not meet the coupon minimum.", "coupon_minimum_not_met");
    discountPaise = coupon.type === "percent" ? Math.round(subtotalPaise * coupon.value / 100) : coupon.value;
    discountPaise = Math.min(discountPaise, subtotalPaise);
  }
  const shippingMethod = payload.shippingMethod === "express" ? "express" : "standard";
  const shippingPaise = shippingMethod === "express" ? 14900 : subtotalPaise - discountPaise >= 99900 ? 0 : 7900;
  const taxPaise = Math.round((subtotalPaise - discountPaise + shippingPaise) * .05);
  return { items, coupon, shippingMethod, subtotalPaise, discountPaise, shippingPaise, taxPaise, totalPaise: subtotalPaise - discountPaise + shippingPaise + taxPaise };
}

export async function persistOrder(env, payload, checkout, userId, payment) {
  if (!userId || payment?.method !== "razorpay" || payment?.status !== "paid" || !payment?.orderId || !payment?.paymentId) {
    throw new HTTPError(403, "A verified customer and completed online payment are required.", "online_payment_required");
  }
  const customer = await env.DB.prepare(
    "SELECT id,email,name FROM users WHERE id=?1 AND email_verified_at IS NOT NULL AND account_status='ACTIVE' AND blacklisted=0",
  ).bind(userId).first();
  if (!customer) throw new HTTPError(403, "A valid verified customer account is required.", "verified_customer_required");
  if (String(payload?.customer?.email || "").trim().toLowerCase() !== customer.email.toLowerCase()) {
    throw new HTTPError(403, "Checkout identity does not match the signed-in customer.", "customer_identity_mismatch");
  }
  const customerPayload = { ...payload.customer, name: customer.name, email: customer.email };
  const orderId = id();
  const orderNumber = `KG${Date.now().toString(36).toUpperCase()}${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const address = payload.address || {};
  const invoiceKey = `invoices/${orderId}.json`;
  const invoice = json({ orderId, orderNumber, customer: customerPayload, address, items: checkout.items, totals: checkout, issuedAt: new Date().toISOString() });
  const statements = [
    env.DB.prepare("INSERT INTO orders(id,order_number,user_id,customer_name,customer_email,customer_mobile,shipping_address_json,shipping_method,coupon_code,subtotal_paise,discount_paise,shipping_paise,tax_paise,total_paise,payment_method,payment_status,payment_order_id,payment_id,status,invoice_key) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,'confirmed',?19)").bind(orderId, orderNumber, userId, customer.name, customer.email.toLowerCase(), customerPayload.phone, json(address), checkout.shippingMethod, checkout.coupon?.code || null, checkout.subtotalPaise, checkout.discountPaise, checkout.shippingPaise, checkout.taxPaise, checkout.totalPaise, payment.method, payment.status, payment.orderId, payment.paymentId, invoiceKey),
    env.DB.prepare("INSERT INTO order_status_history(id,order_id,status,note) VALUES(?1,?2,'confirmed','Order confirmed')").bind(id(), orderId),
    env.DB.prepare("INSERT INTO notifications(id,user_id,order_id,channel,event_type,recipient,payload_json) VALUES(?1,?2,?3,'email','order_confirmation',?4,?5)").bind(id(), userId, orderId, customer.email, json({ orderNumber, totalPaise: checkout.totalPaise })),
    env.DB.prepare("INSERT INTO notifications(id,user_id,order_id,channel,event_type,recipient,payload_json) VALUES(?1,NULL,?2,'admin','new_order','admin',?3)").bind(id(), orderId, json({ orderNumber })),
  ];
  for (const item of checkout.items) {
    statements.push(env.DB.prepare("INSERT INTO order_items(id,order_id,product_id,variant_id,product_name,variant_name,sku,unit_price_paise,quantity) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)").bind(id(), orderId, item.productId, item.variantId, item.name, item.variant, item.sku, item.pricePaise, item.quantity));
    statements.push(env.DB.prepare("INSERT INTO inventory_mutations(id,variant_id,mutation_type,quantity,reason,reference_id,actor_user_id) VALUES(?1,?2,'delta',?3,'order',?4,?5)").bind(id(),item.variantId,-item.quantity,orderId,userId));
  }
  if (checkout.coupon) {
    statements.push(env.DB.prepare("INSERT INTO coupon_redemptions(coupon_id,order_id,user_id) VALUES(?1,?2,?3)").bind(checkout.coupon.id, orderId, userId));
  }
  if (payload.saveAddress) {
    statements.push(env.DB.prepare("INSERT INTO addresses(id,user_id,label,recipient_name,mobile,line1,line2,city,state,pincode) VALUES(?1,?2,'Order address',?3,?4,?5,?6,?7,?8,?9)").bind(id(),userId,customer.name,customerPayload.phone,address.line1,address.line2 || null,address.city,address.state,address.pincode));
  }
  if (payment.orderId && payment.paymentId) {
    statements.push(env.DB.prepare("INSERT INTO processed_payments(payment_order_id,payment_id,order_id) VALUES(?1,?2,?3)").bind(payment.orderId,payment.paymentId,orderId));
  }
  if (payment.intentKey) statements.push(env.DB.prepare("DELETE FROM settings WHERE key=?1").bind(payment.intentKey));
  await env.MEDIA.put(invoiceKey, invoice, { httpMetadata: { contentType: "application/json", cacheControl: "private, no-store" } });
  try {
    await env.DB.batch(statements);
  } catch (error) {
    await env.MEDIA.delete(invoiceKey).catch(() => {});
    throw error;
  }
  return { id: orderId, orderNumber, status: "confirmed", totalPaise: checkout.totalPaise };
}
