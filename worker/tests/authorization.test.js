import test from "node:test";
import assert from "node:assert/strict";
import { canAccess } from "../src/index.js";

test("customers cannot access Admin CMS routes", () => {
  assert.equal(canAccess("CUSTOMER", "/api/admin/dashboard", "GET"), false);
  assert.equal(canAccess("customer", "/api/admin/products", "GET"), false);
});

test("ADMIN can operate standard modules but cannot manage permissions", () => {
  const standardModules = [
    "dashboard", "analytics", "products", "categories", "inventory", "orders",
    "customers", "coupons", "reviews", "content", "media-library", "homepage",
    "digital", "seo", "settings", "activity",
  ];
  for (const module of standardModules) {
    assert.equal(canAccess("ADMIN", `/api/admin/${module}`, "GET"), true, module);
  }
  assert.equal(canAccess("ADMIN", "/api/admin/permissions/user-1", "PUT"), false);
  assert.equal(canAccess("ADMIN", "/api/admin/customers/user-1", "GET"), true);
  assert.equal(canAccess("ADMIN", "/api/admin/customers/user-1", "PATCH"), true);
  assert.equal(canAccess("ADMIN", "/api/admin/customers/user-1", "DELETE"), false);
  assert.equal(canAccess("ADMIN", "/api/admin/customers/user-1/orders", "GET"), true);
  assert.equal(canAccess("ADMIN", "/api/admin/customers/user-1/orders", "PATCH"), false);
  assert.equal(canAccess("ADMIN", "/api/admin/customers/user-1/password-reset", "POST"), true);
  assert.equal(canAccess("ADMIN", "/api/admin/customers/user-1/password-reset", "GET"), false);
  assert.equal(canAccess("ADMIN", "/api/admin/customers/user-1/resend-verification", "POST"), true);
  assert.equal(canAccess("ADMIN", "/api/admin/customers/user-1/status", "PATCH"), false);
});

test("SUPER_ADMIN can manage all Admin CMS routes", () => {
  assert.equal(canAccess("SUPER_ADMIN", "/api/admin/permissions/user-1", "PUT"), true);
  assert.equal(canAccess("SUPER_ADMIN", "/api/admin/customers/user-1", "DELETE"), true);
});
