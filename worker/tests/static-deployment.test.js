import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const projectFile = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("SPA redirects cannot rewrite missing static assets to index.html", async () => {
  const redirects = await projectFile("public/_redirects");
  assert.doesNotMatch(redirects, /^\s*\/\*\s+(?:\/|\/index\.html)\s+200\s*$/m);
  assert.doesNotMatch(redirects, /^\/assets(?:\/|\*)/m);
  assert.match(await projectFile("public/404.html"), /Page not found/);
});

test("legacy service worker retires poisoned caches without intercepting fetches", async () => {
  const serviceWorker = await projectFile("public/sw.js");
  assert.match(serviceWorker, /caches\.delete/);
  assert.match(serviceWorker, /registration\.unregister/);
  assert.doesNotMatch(serviceWorker, /addEventListener\(["']fetch/);
  assert.doesNotMatch(serviceWorker, /cache\.put/);
  assert.doesNotMatch(await projectFile("src/main.jsx"), /serviceWorker\.register/);
});

test("Worker routes are API-only and cannot intercept Pages assets", async () => {
  const workerConfig = await projectFile("worker/wrangler.toml");
  assert.match(workerConfig, /kisangaurav\.com\/api\/\*/);
  assert.doesNotMatch(workerConfig, /kisangaurav\.com\/assets\/\*/);
  assert.doesNotMatch(workerConfig, /kisangaurav\.com\/\*/);
});
