import test from "node:test";
import assert from "node:assert/strict";
import { authConfig, hashPassword, passwordValidationError, verifyPassword } from "../src/auth.js";

const statement = (row = null) => ({
  bind() { return this; },
  async first() { return row; },
});

test("password hashing verifies the intended password without storing plaintext", async () => {
  const stored = await hashPassword("Correct horse battery staple", "release-test-salt");
  assert.notEqual(stored.hash, "Correct horse battery staple");
  assert.equal(await verifyPassword("Correct horse battery staple", stored.salt, stored.hash), true);
  assert.equal(await verifyPassword("wrong password", stored.salt, stored.hash), false);
});

test("customer passwords require length and mixed character classes", () => {
  assert.match(passwordValidationError("short"), /12 characters/);
  assert.match(passwordValidationError("alllowercase123!"), /uppercase/);
  assert.match(passwordValidationError("ALLUPPERCASE123!"), /lowercase/);
  assert.match(passwordValidationError("NoNumbersHere!"), /number/);
  assert.match(passwordValidationError("NoSymbolsHere123"), /symbol/);
  assert.equal(passwordValidationError("Strong password 123!"), null);
});

test("Auth.js uses JWT persistence, a bounded lifetime, and Google only when configured", () => {
  const withoutGoogle = authConfig({ AUTH_SECRET: "test-secret", DB: { prepare: () => statement() } });
  assert.equal(withoutGoogle.session.strategy, "jwt");
  assert.equal(withoutGoogle.session.maxAge, 60 * 60 * 24 * 30);
  assert.deepEqual(withoutGoogle.providers.map((provider) => provider.id), ["credentials"]);

  const withGoogle = authConfig({
    AUTH_SECRET: "test-secret",
    GOOGLE_CLIENT_ID: "google-client",
    GOOGLE_CLIENT_SECRET: "google-secret",
    DB: { prepare: () => statement() },
  });
  assert.deepEqual(withGoogle.providers.map((provider) => provider.id), ["google", "credentials"]);
  assert.equal(withGoogle.cookies.sessionToken.options.sameSite, "lax");
  assert.equal(withGoogle.cookies.sessionToken.options.secure, true);
  assert.equal(withGoogle.cookies.sessionToken.options.domain, ".kisangaurav.com");
});

test("JWT and session callbacks preserve role and session-version claims", async () => {
  const config = authConfig({ AUTH_SECRET: "test-secret", DB: { prepare: () => statement() } });
  const token = await config.callbacks.jwt({
    token: {},
    user: { id: "user-1", role: "SUPER_ADMIN", mustChangePassword: false, sessionVersion: 7 },
  });
  assert.deepEqual(
    { uid: token.uid, role: token.role, mustChangePassword: token.mustChangePassword, sessionVersion: token.sessionVersion },
    { uid: "user-1", role: "SUPER_ADMIN", mustChangePassword: false, sessionVersion: 7 },
  );

  const session = config.callbacks.session({ session: { user: {} }, token });
  assert.deepEqual(session.user, { id: "user-1", role: "SUPER_ADMIN", mustChangePassword: false });
});

test("JWT callback revokes a token when the stored session version changes", async () => {
  const env = {
    AUTH_SECRET: "test-secret",
    DB: { prepare: () => statement({ id: "user-1", role: "ADMIN", must_change_password: 0, session_version: 8 }) },
  };
  const token = await authConfig(env).callbacks.jwt({
    token: { uid: "user-1", role: "ADMIN", sessionVersion: 7 },
  });
  assert.equal(token, null);
});

test("Auth.js redirect callback blocks cross-origin redirects", () => {
  const config = authConfig({ AUTH_SECRET: "test-secret", DB: { prepare: () => statement() } });
  assert.equal(
    config.callbacks.redirect({ url: "https://attacker.invalid/steal", baseUrl: "https://kisangaurav.com" }),
    "https://kisangaurav.com",
  );
  assert.equal(
    config.callbacks.redirect({ url: "/admin", baseUrl: "https://kisangaurav.com" }),
    "https://kisangaurav.com/admin",
  );
});
