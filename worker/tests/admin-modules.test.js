import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const adminPage = await readFile(new URL("../../src/pages/AdminPage.jsx", import.meta.url), "utf8");
const contentWorkspace = await readFile(new URL("../../src/components/admin/ContentWorkspace.jsx", import.meta.url), "utf8");
const workerSource = await readFile(new URL("../src/index.js", import.meta.url), "utf8");

const modules = [
  ["Dashboard", "dashboard"],
  ["Analytics", "analytics"],
  ["Products", "products"],
  ["Categories", "categories"],
  ["Inventory", "inventory"],
  ["Orders", "orders"],
  ["Customers", "customers"],
  ["Coupons", "coupons"],
  ["Reviews", "reviews"],
  ["Content CMS", "content"],
  ["Media Library", "media"],
  ["Homepage", "homepage"],
  ["Digital Platform", "digital"],
  ["SEO", "seo"],
  ["Users", "users"],
  ["Settings", "settings"],
  ["Audit Logs", "activity"],
];

test("every release-gated Admin module is registered in the frontend", () => {
  for (const [label, key] of modules) {
    assert.match(adminPage, new RegExp(`["']${key}["']`), `${label} (${key}) is not registered`);
  }
  assert.match(contentWorkspace, /\["blog",\s*"Blog"\]/, "Blog CMS workspace is not registered");
});

test("every data-backed Admin module has a server endpoint or dedicated route", () => {
  const queryResources = [
    "products", "categories", "orders", "customers", "inventory", "coupons",
    "reviews", "settings", "analytics", "homepage", "digital", "seo", "activity", "content", "users",
  ];
  for (const resource of queryResources) {
    assert.match(workerSource, new RegExp(`${resource}:\\s*["'\`]SELECT`), `${resource} query is missing`);
  }
  assert.match(workerSource, /app\.get\(["']\/api\/admin\/dashboard["']/);
  assert.match(workerSource, /app\.get\(["']\/api\/admin\/media-library["']/);
});

test("Admin accessibility landmarks and dialog semantics remain present", () => {
  assert.match(adminPage, /className="admin-skip-link"/);
  assert.match(adminPage, /aria-current=/);
  assert.match(adminPage, /id="admin-main"/);
  assert.match(adminPage, /role="dialog"/);
  assert.match(adminPage, /aria-labelledby=/);
  assert.match(adminPage, /scope="col"/);
  assert.match(adminPage, /tabIndex="0"/);
});
