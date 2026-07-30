import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";
import { authConfig, hashPassword } from "../src/auth.js";
import { createAuthDatabase } from "./helpers/d1.js";

const ORIGIN = "https://kisangaurav.com";
const PASSWORD = "Strong password 123!";
const NEW_PASSWORD = "New strong password 456!";

class CookieJar {
  values = new Map();

  apply(response) {
    const headers = typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
    for (const header of headers) {
      const [pair, ...attributes] = header.split(";");
      const separator = pair.indexOf("=");
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1);
      const deleted = !value || attributes.some((attribute) => /^\s*max-age=0\s*$/i.test(attribute));
      if (deleted) this.values.delete(name);
      else this.values.set(name, value);
    }
  }

  header() {
    return [...this.values].map(([name, value]) => `${name}=${value}`).join("; ");
  }
}

function env(db, overrides = {}) {
  return {
    AUTH_SECRET: "release-test-secret-that-is-at-least-32-bytes",
    FRONTEND_URL: ORIGIN,
    DB: db,
    ...overrides,
  };
}

async function jsonRequest(db, path, payload, options = {}) {
  const response = await worker.fetch(new Request(`${ORIGIN}${path}`, {
    method: options.method || "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: ORIGIN,
      ...(options.cookie ? { Cookie: options.cookie } : {}),
    },
    body: JSON.stringify(payload),
  }), env(db));
  const data = await response.json();
  return { response, data };
}

async function csrf(db, jar, overrides = {}) {
  const response = await worker.fetch(new Request(`${ORIGIN}/api/auth/csrf`, {
    headers: jar.header() ? { Cookie: jar.header() } : {},
  }), env(db, overrides));
  jar.apply(response);
  assert.equal(response.status, 200);
  return (await response.json()).csrfToken;
}

async function credentialsSignIn(db, jar, email, password, rememberMe = true) {
  const csrfToken = await csrf(db, jar);
  const response = await worker.fetch(new Request(`${ORIGIN}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Auth-Return-Redirect": "1",
      Origin: ORIGIN,
      Cookie: jar.header(),
      "CF-Connecting-IP": "203.0.113.10",
    },
    body: new URLSearchParams({
      csrfToken,
      email,
      password,
      rememberMe: rememberMe ? "1" : "0",
      callbackUrl: `${ORIGIN}/account`,
    }),
  }), env(db));
  jar.apply(response);
  return { response, data: await response.json() };
}

async function session(db, jar) {
  const response = await worker.fetch(new Request(`${ORIGIN}/api/auth/session`, {
    headers: { Cookie: jar.header() },
  }), env(db));
  return { response, data: await response.json() };
}

function latestNotification(db, eventType) {
  const row = db.database.prepare(
    "SELECT payload_json FROM notifications WHERE event_type=? ORDER BY created_at DESC,rowid DESC LIMIT 1",
  ).get(eventType);
  return row ? JSON.parse(row.payload_json) : null;
}

function tokenFrom(url) {
  return new URL(url).searchParams.get("token");
}

async function registerAndVerify(db, email = "customer@example.com") {
  const signup = await jsonRequest(db, "/api/account/signup", {
    firstName: "Test",
    lastName: "Customer",
    email,
    password: PASSWORD,
  });
  assert.equal(signup.response.status, 202);
  const token = tokenFrom(latestNotification(db, "email_verification").verificationUrl);
  const verification = await jsonRequest(db, "/api/account/verify-email", { token });
  assert.equal(verification.response.status, 200);
  return { email, token };
}

test("email signup, verification, credentials session persistence, protected route, and logout work end to end", async (t) => {
  const db = createAuthDatabase();
  t.after(() => db.close());
  const { email, token } = await registerAndVerify(db);

  const reused = await jsonRequest(db, "/api/account/verify-email", { token });
  assert.equal(reused.response.status, 400);
  assert.equal(reused.data.code, "invalid_verification_token");

  const jar = new CookieJar();
  const signedIn = await credentialsSignIn(db, jar, email, PASSWORD);
  assert.equal(signedIn.response.status, 200);
  assert.equal(new URL(signedIn.data.url).searchParams.has("error"), false);

  const firstSession = await session(db, jar);
  const reloadedSession = await session(db, jar);
  assert.equal(firstSession.data.user.email, email);
  assert.equal(reloadedSession.data.user.id, firstSession.data.user.id);

  const profile = await worker.fetch(new Request(`${ORIGIN}/api/account/profile`, {
    headers: { Cookie: jar.header() },
  }), env(db));
  assert.equal(profile.status, 200);
  assert.equal((await profile.json()).email, email);

  const csrfToken = await csrf(db, jar);
  const logout = await worker.fetch(new Request(`${ORIGIN}/api/auth/signout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Auth-Return-Redirect": "1",
      Origin: ORIGIN,
      Cookie: jar.header(),
    },
    body: new URLSearchParams({ csrfToken, callbackUrl: ORIGIN }),
  }), env(db));
  jar.apply(logout);
  assert.equal(logout.status, 200);
  assert.equal((await session(db, jar)).data?.user, undefined);
});

test("duplicate registration and invalid credentials fail without creating duplicate users", async (t) => {
  const db = createAuthDatabase();
  t.after(() => db.close());
  const { email } = await registerAndVerify(db, "duplicate@example.com");

  const duplicate = await jsonRequest(db, "/api/account/signup", {
    firstName: "Duplicate",
    lastName: "Account",
    email,
    password: PASSWORD,
  });
  assert.equal(duplicate.response.status, 409);
  assert.equal(duplicate.data.code, "account_exists");
  assert.equal(db.database.prepare("SELECT COUNT(*) count FROM users WHERE email=?").get(email).count, 1);

  const jar = new CookieJar();
  const invalid = await credentialsSignIn(db, jar, email, "Incorrect password 123!");
  assert.equal(new URL(invalid.data.url).searchParams.get("error"), "CredentialsSignin");
  assert.equal((await session(db, jar)).data?.user, undefined);
  assert.equal(db.database.prepare("SELECT COUNT(*) count FROM activity_logs WHERE action='login_failed'").get().count, 1);
});

test("suspended and blacklisted accounts cannot sign in, reset passwords, or re-register", async (t) => {
  const db = createAuthDatabase();
  t.after(() => db.close());
  const { email } = await registerAndVerify(db, "restricted@example.com");
  db.database.prepare("UPDATE users SET account_status='SUSPENDED' WHERE email=?").run(email);

  const suspendedJar = new CookieJar();
  const suspended = await credentialsSignIn(db, suspendedJar, email, PASSWORD);
  assert.equal(new URL(suspended.data.url).searchParams.get("code"), "account_restricted");
  assert.equal((await session(db, suspendedJar)).data?.user, undefined);

  const forgot = await jsonRequest(db, "/api/account/forgot-password", { email });
  assert.equal(forgot.response.status, 200);
  assert.equal(db.database.prepare("SELECT COUNT(*) count FROM password_reset_tokens").get().count, 0);

  db.database.prepare("UPDATE users SET account_status='ACTIVE',blacklisted=1 WHERE email=?").run(email);
  const blacklistedJar = new CookieJar();
  const blacklisted = await credentialsSignIn(db, blacklistedJar, email, PASSWORD);
  assert.equal(new URL(blacklisted.data.url).searchParams.get("code"), "account_restricted");

  const registration = await jsonRequest(db, "/api/account/signup", {
    firstName: "Restricted",
    lastName: "Customer",
    email,
    password: PASSWORD,
  });
  assert.equal(registration.response.status, 403);
  assert.equal(registration.data.code, "account_restricted");
});

test("only SUPER_ADMIN can change customer lifecycle state and cannot restrict itself", async (t) => {
  const db = createAuthDatabase();
  t.after(() => db.close());
  const superAccount = await registerAndVerify(db, "super@example.com");
  const adminAccount = await registerAndVerify(db, "standard-admin@example.com");
  const customerAccount = await registerAndVerify(db, "managed-customer@example.com");
  const superId = db.database.prepare("SELECT id FROM users WHERE email=?").get(superAccount.email).id;
  const adminId = db.database.prepare("SELECT id FROM users WHERE email=?").get(adminAccount.email).id;
  const customerId = db.database.prepare("SELECT id FROM users WHERE email=?").get(customerAccount.email).id;
  db.database.prepare("INSERT INTO user_permissions(user_id,role) VALUES(?,?)").run(superId, "SUPER_ADMIN");
  db.database.prepare("INSERT INTO user_permissions(user_id,role) VALUES(?,?)").run(adminId, "ADMIN");

  const adminJar = new CookieJar();
  await credentialsSignIn(db, adminJar, adminAccount.email, PASSWORD);
  const denied = await jsonRequest(db, `/api/admin/customers/${customerId}/status`, { action: "suspend" }, { method: "PATCH", cookie: adminJar.header() });
  assert.equal(denied.response.status, 403);
  assert.equal(denied.data.code, "authorization_denied");

  const superJar = new CookieJar();
  await credentialsSignIn(db, superJar, superAccount.email, PASSWORD);
  const suspended = await jsonRequest(db, `/api/admin/customers/${customerId}/status`, { action: "suspend", reason: "Risk review" }, { method: "PATCH", cookie: superJar.header() });
  assert.equal(suspended.response.status, 200);
  const lifecycle = db.database.prepare("SELECT account_status,status_reason FROM users WHERE id=?").get(customerId);
  assert.equal(lifecycle.account_status, "SUSPENDED");
  assert.equal(lifecycle.status_reason, "Risk review");
  const audit = db.database.prepare("SELECT action,details_json,ip_address FROM activity_logs WHERE action='customer_suspended'").get();
  assert.equal(audit.action, "customer_suspended");
  assert.equal(JSON.parse(audit.details_json).customerEmail, customerAccount.email);

  const self = await jsonRequest(db, `/api/admin/customers/${superId}/status`, { action: "suspend" }, { method: "PATCH", cookie: superJar.header() });
  assert.equal(self.response.status, 409);
  assert.equal(self.data.code, "self_account_protected");
});

test("password reset is single-use, clears lock state, revokes sessions, and accepts only the new password", async (t) => {
  const db = createAuthDatabase();
  t.after(() => db.close());
  const { email } = await registerAndVerify(db, "reset@example.com");
  const originalJar = new CookieJar();
  await credentialsSignIn(db, originalJar, email, PASSWORD);

  db.database.prepare("UPDATE users SET failed_login_count=9,locked_until=datetime('now','+15 minutes') WHERE email=?").run(email);
  const forgot = await jsonRequest(db, "/api/account/forgot-password", { email });
  assert.equal(forgot.response.status, 200);
  const resetToken = tokenFrom(latestNotification(db, "password_reset").resetUrl);
  const reset = await jsonRequest(db, "/api/account/reset-password", { token: resetToken, password: NEW_PASSWORD });
  assert.equal(reset.response.status, 200);

  const reused = await jsonRequest(db, "/api/account/reset-password", { token: resetToken, password: "Another password 789!" });
  assert.equal(reused.response.status, 400);
  assert.equal(reused.data.code, "invalid_reset_token");
  assert.equal((await session(db, originalJar)).data?.user, undefined);

  const stored = db.database.prepare("SELECT failed_login_count,locked_until FROM users WHERE email=?").get(email);
  assert.equal(stored.failed_login_count, 0);
  assert.equal(stored.locked_until, null);

  const oldJar = new CookieJar();
  const oldLogin = await credentialsSignIn(db, oldJar, email, PASSWORD);
  assert.equal(new URL(oldLogin.data.url).searchParams.get("error"), "CredentialsSignin");
  const newJar = new CookieJar();
  const newLogin = await credentialsSignIn(db, newJar, email, NEW_PASSWORD);
  assert.equal(new URL(newLogin.data.url).searchParams.has("error"), false);
});

test("credential lockout and rate protection block repeated guessing and recover after expiry", async (t) => {
  const db = createAuthDatabase();
  t.after(() => db.close());
  const { email } = await registerAndVerify(db, "lockout@example.com");
  const lowerCost = await hashPassword(PASSWORD, "lockout-test-salt", 100000);
  db.database.prepare(
    "UPDATE users SET password_hash=?,password_salt=?,password_iterations=? WHERE email=?",
  ).run(lowerCost.hash, lowerCost.salt, lowerCost.iterations, email);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const jar = new CookieJar();
    const result = await credentialsSignIn(db, jar, email, "Incorrect password 123!");
    assert.equal(new URL(result.data.url).searchParams.get("error"), "CredentialsSignin");
  }
  const locked = db.database.prepare("SELECT failed_login_count,locked_until FROM users WHERE email=?").get(email);
  assert.equal(locked.failed_login_count, 10);
  assert.ok(locked.locked_until);

  const blockedJar = new CookieJar();
  const blocked = await credentialsSignIn(db, blockedJar, email, PASSWORD);
  assert.equal(new URL(blocked.data.url).searchParams.get("error"), "CredentialsSignin");

  db.database.prepare("DELETE FROM admin_login_attempts WHERE email=?").run(email);
  db.database.prepare("UPDATE users SET locked_until=datetime('now','-1 minute') WHERE email=?").run(email);
  const recoveredJar = new CookieJar();
  const recovered = await credentialsSignIn(db, recoveredJar, email, PASSWORD);
  assert.equal(new URL(recovered.data.url).searchParams.has("error"), false);
});

test("remember-me controls cookie persistence and Google sign-in creates a secure OAuth redirect", async (t) => {
  const db = createAuthDatabase();
  t.after(() => db.close());
  const { email } = await registerAndVerify(db, "cookies@example.com");

  const browserJar = new CookieJar();
  const browserSession = await credentialsSignIn(db, browserJar, email, PASSWORD, false);
  const browserCookie = browserSession.response.headers.getSetCookie().find((value) => value.includes("authjs.session-token"));
  assert.ok(browserCookie);
  assert.doesNotMatch(browserCookie, /;\s*(?:Expires|Max-Age)=/i);

  const persistentJar = new CookieJar();
  const persistentSession = await credentialsSignIn(db, persistentJar, email, PASSWORD, true);
  const persistentCookie = persistentSession.response.headers.getSetCookie().find((value) => value.includes("authjs.session-token"));
  assert.match(persistentCookie, /;\s*(?:Expires|Max-Age)=/i);

  const googleEnv = { GOOGLE_CLIENT_ID: "google-client", GOOGLE_CLIENT_SECRET: "google-secret" };
  const oauthJar = new CookieJar();
  const csrfToken = await csrf(db, oauthJar, googleEnv);
  t.mock.method(globalThis, "fetch", async (input) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    if (url.pathname === "/.well-known/openid-configuration") {
      return Response.json({
        issuer: "https://accounts.google.com",
        authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
        token_endpoint: "https://oauth2.googleapis.com/token",
        userinfo_endpoint: "https://openidconnect.googleapis.com/v1/userinfo",
        jwks_uri: "https://www.googleapis.com/oauth2/v3/certs",
      });
    }
    throw new Error(`Unexpected OAuth test request: ${url.origin}${url.pathname}`);
  });
  const oauth = await worker.fetch(new Request(`${ORIGIN}/api/auth/signin/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Auth-Return-Redirect": "1",
      Origin: ORIGIN,
      Cookie: oauthJar.header(),
    },
    body: new URLSearchParams({ csrfToken, callbackUrl: `${ORIGIN}/account` }),
  }), env(db, googleEnv));
  const oauthPayload = await oauth.json();
  assert.equal(oauth.status, 200);
  assert.equal(new URL(oauthPayload.url).hostname, "accounts.google.com");
  const oauthCookies = oauth.headers.getSetCookie();
  assert.ok(oauthCookies.some((value) => /authjs\.(?:state|pkce)/.test(value) && /;\s*Secure/i.test(value)));
  assert.ok(oauthCookies.every((value) => !/SameSite=None/i.test(value)));
});

test("Google callback links a verified identity to one existing user and preserves its role", async (t) => {
  const db = createAuthDatabase();
  t.after(() => db.close());
  const password = await hashPassword(PASSWORD, "google-link-test", 100000);
  db.database.prepare(
    "INSERT INTO users(id,email,name,password_hash,password_salt,password_iterations,email_verified_at) VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP)",
  ).run("google-user", "google@example.com", "Google User", password.hash, password.salt, password.iterations);
  db.database.prepare("INSERT INTO user_permissions(user_id,role) VALUES(?,?)").run("google-user", "ADMIN");

  const config = authConfig(env(db, { GOOGLE_CLIENT_ID: "client", GOOGLE_CLIENT_SECRET: "secret" }));
  const user = { email: "Google@Example.com", name: "Google User", image: null };
  const allowed = await config.callbacks.signIn({
    user,
    account: { provider: "google", providerAccountId: "google-subject-1" },
    profile: { email_verified: true },
  });
  assert.equal(allowed, true);
  assert.equal(user.id, "google-user");
  assert.equal(user.role, "ADMIN");
  assert.equal(db.database.prepare("SELECT COUNT(*) count FROM users WHERE email=?").get("google@example.com").count, 1);
  assert.equal(db.database.prepare("SELECT COUNT(*) count FROM auth_accounts WHERE provider_account_id=?").get("google-subject-1").count, 1);
});

test("administrator credentials honor stored PBKDF2 iterations and password changes revoke the prior session", async (t) => {
  const db = createAuthDatabase();
  t.after(() => db.close());
  const legacy = await hashPassword(PASSWORD, "legacy-admin-salt", 100000);
  db.database.prepare(
    "INSERT INTO users(id,email,name,password_hash,password_salt,password_iterations,email_verified_at) VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP)",
  ).run("admin-user", "admin@example.com", "Admin User", legacy.hash, legacy.salt, legacy.iterations);
  db.database.prepare("INSERT INTO user_permissions(user_id,role) VALUES(?,?)").run("admin-user", "SUPER_ADMIN");

  const jar = new CookieJar();
  const login = await credentialsSignIn(db, jar, "admin@example.com", PASSWORD);
  assert.equal(new URL(login.data.url).searchParams.has("error"), false);

  // Recreate a legacy stored hash after session issuance to exercise the
  // password-change verifier independently of login's transparent upgrade.
  db.database.prepare(
    "UPDATE users SET password_hash=?,password_salt=?,password_iterations=? WHERE id=?",
  ).run(legacy.hash, legacy.salt, legacy.iterations, "admin-user");
  const changed = await jsonRequest(db, "/api/admin/account/password", {
    currentPassword: PASSWORD,
    newPassword: NEW_PASSWORD,
  }, { method: "PATCH", cookie: jar.header() });
  assert.equal(changed.response.status, 200);
  assert.equal((await session(db, jar)).data?.user, undefined);

  const newJar = new CookieJar();
  const newLogin = await credentialsSignIn(db, newJar, "admin@example.com", NEW_PASSWORD);
  assert.equal(new URL(newLogin.data.url).searchParams.has("error"), false);
  assert.equal((await session(db, newJar)).data.user.role, "SUPER_ADMIN");
});

test("customer and admin claims are separated and protected routes reject anonymous requests", async (t) => {
  const db = createAuthDatabase();
  t.after(() => db.close());
  const anonymous = await worker.fetch(new Request(`${ORIGIN}/api/account/profile`), env(db));
  assert.equal(anonymous.status, 401);

  const config = authConfig(env(db));
  const customerToken = await config.callbacks.jwt({ token: {}, user: { id: "customer", role: "customer", sessionVersion: 0 } });
  const adminToken = await config.callbacks.jwt({ token: {}, user: { id: "admin", role: "SUPER_ADMIN", sessionVersion: 0 } });
  assert.equal(config.callbacks.session({ session: { user: {} }, token: customerToken }).user.role, "customer");
  assert.equal(config.callbacks.session({ session: { user: {} }, token: adminToken }).user.role, "SUPER_ADMIN");
});
