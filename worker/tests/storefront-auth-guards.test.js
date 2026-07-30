import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("cart and checkout routes are wrapped by the customer authentication route", () => {
  const app = source("src/App.jsx");
  assert.match(app, /<Route element={<CustomerRoute \/>}>[\s\S]*path="cart"[\s\S]*path="checkout"/);
});

test("guest cart and wishlist actions redirect to authentication without local guest state", () => {
  const commerce = source("src/contexts/CommerceContext.jsx");
  assert.match(commerce, /redirectToAuthentication/);
  assert.doesNotMatch(commerce, /localStorage/);
  assert.match(commerce, /if \(!user\).*redirectToAuthentication/);
});

test("checkout exposes Razorpay online methods and no COD or guest checkout", () => {
  const checkout = source("src/pages/CheckoutPage.jsx");
  assert.match(checkout, /paymentMethod: "razorpay"/);
  assert.match(checkout, /UPI, credit\/debit cards and net banking/);
  assert.match(checkout, /instruments: \[\{ method: "upi" \}, \{ method: "card" \}, \{ method: "netbanking" \}\]/);
  assert.match(checkout, /show_default_blocks: false/);
  assert.doesNotMatch(checkout, /cash on delivery|guest checkout|pay later|offline payment/i);
});
