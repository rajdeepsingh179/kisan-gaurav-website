import test from "node:test";
import assert from "node:assert/strict";
import { validateProduct } from "../src/validation.js";

const validProduct = {
  name: "Organic Turmeric",
  slug: "organic-turmeric",
  categoryId: "spices",
  status: "published",
  imageUrl: "/api/media/products/turmeric.webp",
  variants: [
    { id: "variant-1", name: "250 g", sku: "TURMERIC-250", pricePaise: 19900, mrpPaise: 24900, stock: 12, isDefault: true },
  ],
};

test("product validation preserves an existing variant identity for atomic updates", () => {
  const product = validateProduct(validProduct);
  assert.equal(product.variants[0].id, "variant-1");
  assert.equal(product.variants[0].isDefault, true);
  assert.equal(product.imageUrl, "/api/media/products/turmeric.webp");
});

test("product validation rejects unsafe media and invalid commercial values", () => {
  assert.throws(() => validateProduct({ ...validProduct, imageUrl: "javascript:alert(1)" }), /unsafe|HTTPS/i);
  assert.throws(() => validateProduct({
    ...validProduct,
    variants: [{ ...validProduct.variants[0], pricePaise: -1 }],
  }), /price/i);
  assert.throws(() => validateProduct({
    ...validProduct,
    variants: [
      validProduct.variants[0],
      { ...validProduct.variants[0], id: "variant-2", name: "500 g", sku: "turmeric-250" },
    ],
  }), /duplicate SKU/i);
});
