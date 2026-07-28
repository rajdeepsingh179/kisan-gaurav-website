import { Auth } from "@auth/core";
import Credentials from "@auth/core/providers/credentials";
import Google from "@auth/core/providers/google";

const encoder = new TextEncoder();
const hex = (buffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

export async function hashPassword(password, salt = crypto.randomUUID()) {
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode(salt), iterations: 310000, hash: "SHA-256" }, material, 256);
  return { salt, hash: hex(bits) };
}

export async function verifyPassword(password, salt, expected) {
  const result = await hashPassword(password, salt);
  if (result.hash.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) mismatch |= result.hash.charCodeAt(index) ^ expected.charCodeAt(index);
  return mismatch === 0;
}

export function authConfig(env) {
  const providers = [
    Credentials({
      credentials: { email: { type: "email" }, password: { type: "password" } },
      authorize: async (credentials, request) => {
        const email = String(credentials?.email || "").trim().toLowerCase();
        const ip = request?.headers?.get("CF-Connecting-IP") || null;
        const recent = await env.DB.prepare("SELECT COUNT(*) count FROM admin_login_attempts WHERE email=?1 AND succeeded=0 AND attempted_at>datetime('now','-15 minutes')").bind(email).first();
        if (Number(recent?.count) >= 10) return null;
        const user = await env.DB.prepare("SELECT u.id,u.email,u.name,COALESCE(up.role,u.role) role,u.profile_photo_url,u.password_hash,u.password_salt,u.must_change_password FROM users u LEFT JOIN user_permissions up ON up.user_id=u.id WHERE u.email=?1").bind(email).first();
        if (!user?.password_hash || !(await verifyPassword(String(credentials?.password || ""), user.password_salt, user.password_hash))) {
          await env.DB.prepare("INSERT INTO admin_login_attempts(id,email,ip_address,succeeded) VALUES(?1,?2,?3,0)").bind(crypto.randomUUID(),email,ip).run();
          return null;
        }
        await env.DB.batch([
          env.DB.prepare("INSERT INTO admin_login_attempts(id,email,ip_address,succeeded) VALUES(?1,?2,?3,1)").bind(crypto.randomUUID(),email,ip),
          env.DB.prepare("DELETE FROM admin_login_attempts WHERE attempted_at<datetime('now','-1 day')"),
        ]);
        return { id: user.id, email: user.email, name: user.name, role: user.role, image: user.profile_photo_url, mustChangePassword: Boolean(user.must_change_password) };
      },
    }),
  ];
  if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) providers.unshift(Google({ clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET }));
  return {
    basePath: "/api/auth",
    secret: env.AUTH_SECRET,
    trustHost: true,
    session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
    providers,
    callbacks: {
      async signIn({ user, account }) {
        if (account?.provider !== "google") return true;
        const email = String(user.email || "").toLowerCase();
        let stored = await env.DB.prepare("SELECT u.id,COALESCE(up.role,u.role) role,u.must_change_password FROM users u LEFT JOIN user_permissions up ON up.user_id=u.id WHERE u.email=?1").bind(email).first();
        if (!stored) {
          const id = crypto.randomUUID();
          await env.DB.prepare("INSERT INTO users(id,email,name,profile_photo_url,email_verified_at) VALUES(?1,?2,?3,?4,CURRENT_TIMESTAMP)").bind(id, email, user.name || email, user.image || null).run();
          stored = { id, role: "customer" };
        }
        await env.DB.prepare("INSERT OR IGNORE INTO auth_accounts(user_id,provider,provider_account_id) VALUES(?1,?2,?3)").bind(stored.id, account.provider, account.providerAccountId).run();
        user.id = stored.id;
        user.role = stored.role;
        user.mustChangePassword = Boolean(stored.must_change_password);
        return true;
      },
      async jwt({ token, user }) {
        if (user) {
          token.uid = user.id;
          token.role = user.role || "customer";
          token.mustChangePassword = Boolean(user.mustChangePassword);
        } else if (token.email) {
          const stored = await env.DB.prepare("SELECT u.id,COALESCE(up.role,u.role) role,u.must_change_password FROM users u LEFT JOIN user_permissions up ON up.user_id=u.id WHERE u.email=?1").bind(String(token.email).toLowerCase()).first();
          if (stored) { token.uid = stored.id; token.role = stored.role; token.mustChangePassword = Boolean(stored.must_change_password); }
        }
        return token;
      },
      session({ session, token }) {
        if (session.user) { session.user.id = token.uid; session.user.role = token.role || "customer"; session.user.mustChangePassword = Boolean(token.mustChangePassword); }
        return session;
      },
    },
  };
}

export function handleAuth(request, env) {
  return Auth(request, authConfig(env));
}

export async function getSession(request, env) {
  const url = new URL(request.url);
  url.pathname = "/api/auth/session";
  url.search = "";
  const response = await Auth(new Request(url, { headers: { cookie: request.headers.get("cookie") || "" } }), authConfig(env));
  if (!response.ok) return null;
  const session = await response.json();
  return session?.user?.id ? session : null;
}
