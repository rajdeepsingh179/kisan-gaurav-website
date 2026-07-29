import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const env = {
  AUTH_SECRET: "release-test-secret",
  FRONTEND_URL: "https://kisangaurav.com",
};

test("health API responds with security headers and a request ID", async () => {
  const response = await worker.fetch(new Request("https://kisangaurav.com/api/health"), env);
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.service, "kisan-gaurav-api");
  assert.equal(response.headers.get("X-Frame-Options"), "DENY");
  assert.ok(response.headers.get("Content-Security-Policy"));
  assert.ok(response.headers.get("X-Request-ID"));
});

test("CORS preflight is limited to trusted origins", async () => {
  const trusted = await worker.fetch(new Request("https://kisangaurav.com/api/health", {
    method: "OPTIONS",
    headers: { Origin: "https://kisangaurav.com" },
  }), env);
  assert.equal(trusted.status, 204);
  assert.equal(trusted.headers.get("Access-Control-Allow-Origin"), "https://kisangaurav.com");

  const untrusted = await worker.fetch(new Request("https://kisangaurav.com/api/health", {
    method: "OPTIONS",
    headers: { Origin: "https://attacker.invalid" },
  }), env);
  assert.equal(untrusted.status, 204);
  assert.equal(untrusted.headers.get("Access-Control-Allow-Origin"), null);
});

test("state-changing API requests reject missing or untrusted origins", async () => {
  const response = await worker.fetch(new Request("https://kisangaurav.com/api/account/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Origin: "https://attacker.invalid" },
    body: JSON.stringify({ name: "Attacker" }),
  }), env);
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "Request origin is not allowed.");
});
