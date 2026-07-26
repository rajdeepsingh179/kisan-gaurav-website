import { catalog } from "./catalog";

export const id = () => crypto.randomUUID();
export const json = (value) => JSON.stringify(value);

export async function calculateCheckout(env, payload) {
  if (!Array.isArray(payload.items) || payload.items.length === 0) throw new Error("Cart is empty.");
  const items = [];
  for (const requested of payload.items) {
    const embedded = catalog[requested.slug];
    if (!embedded || !embedded.variants[requested.variant]) throw new Error(`Unavailable product or variant: ${requested.slug}`);
    const dbVariant = await env.DB.prepare("SELECT v.id,v.sku,v.price_paise,v.stock,p.id product_id,p.name FROM product_variants v JOIN products p ON p.id=v.product_id WHERE p.slug=?1 AND v.name=?2 AND p.active=1 AND v.active=1").bind(requested.slug, requested.variant).first();
    const quantity = Math.max(1, Math.min(10, Number(requested.quantity) || 1));
    const unitPrice = dbVariant?.price_paise || embedded.variants[requested.variant];
    if (dbVariant && dbVariant.stock < quantity) throw new Error(`${dbVariant.name} is out of stock.`);
    items.push({ productId: dbVariant?.product_id || requested.slug, variantId: dbVariant?.id || `${requested.slug}:${requested.variant}`, sku: dbVariant?.sku || `KG-${requested.slug}-${requested.variant}`, name: dbVariant?.name || embedded.name, variant: requested.variant, pricePaise: unitPrice, quantity });
  }
  const subtotalPaise = items.reduce((total, item) => total + item.pricePaise * item.quantity, 0);
  let discountPaise = 0;
  let coupon = null;
  if (payload.couponCode) {
    coupon = await env.DB.prepare("SELECT * FROM coupons WHERE code=?1 AND enabled=1 AND (expires_at IS NULL OR expires_at>CURRENT_TIMESTAMP) AND (usage_limit IS NULL OR usage_count<usage_limit)").bind(String(payload.couponCode).toUpperCase()).first();
    if (!coupon) throw new Error("Coupon is invalid or expired.");
    if (subtotalPaise < coupon.minimum_order_paise) throw new Error("Order does not meet the coupon minimum.");
    discountPaise = coupon.type === "percent" ? Math.round(subtotalPaise * coupon.value / 100) : coupon.value;
    discountPaise = Math.min(discountPaise, subtotalPaise);
  }
  const shippingMethod = payload.shippingMethod === "express" ? "express" : "standard";
  const shippingPaise = shippingMethod === "express" ? 14900 : subtotalPaise - discountPaise >= 99900 ? 0 : 7900;
  const taxPaise = Math.round((subtotalPaise - discountPaise + shippingPaise) * .05);
  return { items, coupon, shippingMethod, subtotalPaise, discountPaise, shippingPaise, taxPaise, totalPaise: subtotalPaise - discountPaise + shippingPaise + taxPaise };
}

export async function persistOrder(env, payload, checkout, userId, payment) {
  const orderId = id();
  const orderNumber = `KG${Date.now().toString().slice(-10)}`;
  const address = payload.address || {};
  const statements = [
    env.DB.prepare("INSERT INTO orders(id,order_number,user_id,customer_name,customer_email,customer_mobile,shipping_address_json,shipping_method,coupon_code,subtotal_paise,discount_paise,shipping_paise,tax_paise,total_paise,payment_method,payment_status,payment_order_id,payment_id,status) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,'confirmed')").bind(orderId, orderNumber, userId || null, payload.customer.name, payload.customer.email.toLowerCase(), payload.customer.phone, json(address), checkout.shippingMethod, checkout.coupon?.code || null, checkout.subtotalPaise, checkout.discountPaise, checkout.shippingPaise, checkout.taxPaise, checkout.totalPaise, payment.method, payment.status, payment.orderId || null, payment.paymentId || null),
    env.DB.prepare("INSERT INTO order_status_history(id,order_id,status,note) VALUES(?1,?2,'confirmed','Order confirmed')").bind(id(), orderId),
    env.DB.prepare("INSERT INTO notifications(id,user_id,order_id,channel,event_type,recipient,payload_json) VALUES(?1,?2,?3,'email','order_confirmation',?4,?5)").bind(id(), userId || null, orderId, payload.customer.email, json({ orderNumber, totalPaise: checkout.totalPaise })),
    env.DB.prepare("INSERT INTO notifications(id,user_id,order_id,channel,event_type,recipient,payload_json) VALUES(?1,NULL,?2,'admin','new_order','admin',?3)").bind(id(), orderId, json({ orderNumber })),
  ];
  for (const item of checkout.items) {
    statements.push(env.DB.prepare("INSERT INTO order_items(id,order_id,product_id,variant_id,product_name,variant_name,sku,unit_price_paise,quantity) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)").bind(id(), orderId, item.productId, item.variantId, item.name, item.variant, item.sku, item.pricePaise, item.quantity));
    if (!item.variantId.includes(":")) {
      statements.push(env.DB.prepare("UPDATE product_variants SET stock=stock-?1,updated_at=CURRENT_TIMESTAMP WHERE id=?2 AND stock>=?1").bind(item.quantity, item.variantId));
      statements.push(env.DB.prepare("INSERT INTO inventory_history(id,variant_id,change_quantity,balance_after,reason,reference_id,actor_user_id) SELECT ?1,id,?2,stock,'order',?3,?4 FROM product_variants WHERE id=?5").bind(id(), -item.quantity, orderId, userId || null, item.variantId));
    }
  }
  if (checkout.coupon) {
    statements.push(env.DB.prepare("UPDATE coupons SET usage_count=usage_count+1 WHERE id=?1").bind(checkout.coupon.id));
    statements.push(env.DB.prepare("INSERT INTO coupon_redemptions(coupon_id,order_id,user_id) VALUES(?1,?2,?3)").bind(checkout.coupon.id, orderId, userId || null));
  }
  await env.DB.batch(statements);
  const invoiceKey = `invoices/${orderId}.json`;
  await env.MEDIA.put(invoiceKey, json({ orderId, orderNumber, customer: payload.customer, address, items: checkout.items, totals: checkout, issuedAt: new Date().toISOString() }), { httpMetadata: { contentType: "application/json", cacheControl: "private, no-store" } });
  await env.DB.prepare("UPDATE orders SET invoice_key=?1 WHERE id=?2").bind(invoiceKey, orderId).run();
  return { id: orderId, orderNumber, status: "confirmed", totalPaise: checkout.totalPaise };
}
