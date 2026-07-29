import test from "node:test";
import assert from "node:assert/strict";
import {
  assertSafeStructuredValue, validateCategory, validateCmsEntry,
  validateCoupon, validateOrderRequest, validateProduct, validateSetting,
} from "../src/validation.js";

test("normalizes and validates products", () => {
  const product = validateProduct({
    name: "Premium Almonds",
    slug: "premium-almonds",
    categoryId: "category-1",
    gstBasisPoints: 500,
    variants: [{ name: "250 g", sku: "ALMOND-250", pricePaise: 49900, mrpPaise: 59900, stock: 10, isDefault: true }],
  });
  assert.equal(product.status, "draft");
  assert.equal(product.variants[0].stock, 10);
  assert.throws(() => validateProduct({ ...product, slug: "Invalid Slug" }), /lowercase/i);
  assert.throws(() => validateProduct({ ...product, variants: [{ name: "A", sku: "DUP", pricePaise: 1 }, { name: "B", sku: "dup", pricePaise: 1 }] }), /duplicate SKU/i);
});

test("rejects active content in products and CMS", () => {
  assert.throws(() => validateProduct({
    name: "Unsafe",
    slug: "unsafe",
    categoryId: "category-1",
    description: "<script>alert(1)</script>",
  }), /unsafe/i);
  assert.throws(() => validateCmsEntry({
    entryType: "page",
    slug: "unsafe",
    title: "Unsafe",
    content: { body: "<img src=x onerror=alert(1)>" },
  }), /unsafe active content/i);
});

test("validates categories and HTTPS media URLs", () => {
  const category = validateCategory({ name: "Dry Fruits", slug: "dry-fruits", heroImageUrl: "/api/media/categories/hero.webp" });
  assert.equal(category.heroImageUrl, "/api/media/categories/hero.webp");
  assert.throws(() => validateCategory({ name: "Bad", slug: "bad", heroImageUrl: "javascript:alert(1)" }), /unsafe|HTTPS/i);
});

test("enforces coupon ranges and codes", () => {
  assert.equal(validateCoupon({ code: "save_10", type: "percent", value: 10 }).code, "SAVE_10");
  assert.throws(() => validateCoupon({ code: "SAVE200", type: "percent", value: 200 }), /between 1 and 100/i);
  assert.throws(() => validateCoupon({ code: "!!", type: "flat", value: 100 }), /Coupon code/i);
});

test("settings reject reserved keys, prototype keys, and oversized content", () => {
  assert.equal(validateSetting("store.shipping", { enabled: true }).key, "store.shipping");
  assert.throws(() => validateSetting("payment_intent:fake", {}), /reserved/i);
  assert.throws(() => validateSetting("unsafe", JSON.parse("{\"__proto__\":{\"polluted\":true}}")), /unsafe object keys/i);
  assert.throws(() => assertSafeStructuredValue({ body: "<iframe src=\"https://attacker.invalid\"></iframe>" }), /unsafe active content/i);
});

test("validates and normalizes order contact and address data", () => {
  const order = validateOrderRequest({
    customer: { name: "Test Buyer", email: "BUYER@EXAMPLE.COM", phone: "+91 98765 43210" },
    address: { line1: "Farm Road", city: "Jaipur", state: "Rajasthan", pincode: "302001" },
    saveAddress: true,
  });
  assert.equal(order.customer.email, "buyer@example.com");
  assert.equal(order.customer.phone, "+919876543210");
  assert.equal(order.saveAddress, true);
  assert.throws(() => validateOrderRequest({ customer: {}, address: {} }), /Email|required/i);
  assert.throws(() => validateOrderRequest({
    customer: { name: "Test", email: "bad", phone: "123" },
    address: { line1: "Road", city: "City", state: "State", pincode: "1" },
  }), /Email address/i);
});
