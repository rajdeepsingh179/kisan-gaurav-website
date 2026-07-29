import { Auth } from "@auth/core";
import Credentials from "@auth/core/providers/credentials";
import Google from "@auth/core/providers/google";

const encoder = new TextEncoder();
const hex = (buffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
const DUMMY_PASSWORD = {
  salt: "kg-auth-timing-v1",
  hash: "c103993171ec6094acabc6dd6e81deca8b230ad20471b94a5e6058e05f4380b6",
};

export async function hashPassword(password, salt = crypto.randomUUID()) {
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode(salt), iterations: 100000, hash: "SHA-256" }, material, 256);
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
  const googleClientId = env.GOOGLE_CLIENT_ID || env.AUTH_GOOGLE_ID;
  const googleClientSecret = env.GOOGLE_CLIENT_SECRET || env.AUTH_GOOGLE_SECRET;
  const providers = [
    Credentials({
      credentials: { email: { type: "email" }, password: { type: "password" } },
      authorize: async (credentials, request) => {
        const email = String(credentials?.email || "").trim().toLowerCase();
        const ip = request?.headers?.get("CF-Connecting-IP") || null;
        const recent = await env.DB.prepare("SELECT COUNT(*) count FROM admin_login_attempts WHERE email=?1 AND succeeded=0 AND attempted_at>datetime('now','-15 minutes')").bind(email).first();
        if (Number(recent?.count) >= 10) return null;
        const user = await env.DB.prepare("SELECT u.id,u.email,u.name,COALESCE(up.role,u.role) role,u.profile_photo_url,u.password_hash,u.password_salt,u.must_change_password,u.session_version FROM users u LEFT JOIN user_permissions up ON up.user_id=u.id WHERE u.email=?1").bind(email).first();
        const passwordMatches = await verifyPassword(
          String(credentials?.password || ""),
          user?.password_salt || DUMMY_PASSWORD.salt,
          user?.password_hash || DUMMY_PASSWORD.hash,
        );
        if (!user?.password_hash || !passwordMatches) {
          await env.DB.prepare("INSERT INTO admin_login_attempts(id,email,ip_address,succeeded) VALUES(?1,?2,?3,0)").bind(crypto.randomUUID(),email,ip).run();
          return null;
        }
        await env.DB.batch([
          env.DB.prepare("INSERT INTO admin_login_attempts(id,email,ip_address,succeeded) VALUES(?1,?2,?3,1)").bind(crypto.randomUUID(),email,ip),
          env.DB.prepare("DELETE FROM admin_login_attempts WHERE attempted_at<datetime('now','-1 day')"),
        ]);
        return { id: user.id, email: user.email, name: user.name, role: user.role, image: user.profile_photo_url, mustChangePassword: Boolean(user.must_change_password), sessionVersion: Number(user.session_version) };
      },
    }),
  ];
  if (googleClientId && googleClientSecret) providers.unshift(Google({ clientId: googleClientId, clientSecret: googleClientSecret }));
  return {
    basePath: "/api/auth",
    secret: env.AUTH_SECRET,
    trustHost: true,
    session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
    providers,
    callbacks: {
      async signIn({ user, account, profile }) {
        if (account?.provider !== "google") return true;
        const email = String(user.email || "").toLowerCase();
        if (!email || profile?.email_verified !== true) return false;
        let stored = await env.DB.prepare(
          "SELECT u.id,COALESCE(up.role,u.role) role,u.must_change_password,u.session_version FROM auth_accounts aa JOIN users u ON u.id=aa.user_id LEFT JOIN user_permissions up ON up.user_id=u.id WHERE aa.provider=?1 AND aa.provider_account_id=?2",
        ).bind(account.provider, account.providerAccountId).first();
        if (!stored) {
          stored = await env.DB.prepare("SELECT u.id,COALESCE(up.role,u.role) role,u.must_change_password,u.session_version FROM users u LEFT JOIN user_permissions up ON up.user_id=u.id WHERE u.email=?1").bind(email).first();
        }
        if (!stored) {
          const id = crypto.randomUUID();
          await env.DB.prepare("INSERT INTO users(id,email,name,profile_photo_url,email_verified_at) VALUES(?1,?2,?3,?4,CURRENT_TIMESTAMP)").bind(id, email, user.name || email, user.image || null).run();
          stored = { id, role: "customer", session_version: 0 };
        }
        await env.DB.prepare("INSERT OR IGNORE INTO auth_accounts(user_id,provider,provider_account_id) VALUES(?1,?2,?3)").bind(stored.id, account.provider, account.providerAccountId).run();
        const linked = await env.DB.prepare(
          "SELECT u.id,COALESCE(up.role,u.role) role,u.must_change_password,u.session_version FROM auth_accounts aa JOIN users u ON u.id=aa.user_id LEFT JOIN user_permissions up ON up.user_id=u.id WHERE aa.provider=?1 AND aa.provider_account_id=?2",
        ).bind(account.provider, account.providerAccountId).first();
        if (!linked) return false;
        user.id = linked.id;
        user.role = linked.role;
        user.mustChangePassword = Boolean(linked.must_change_password);
        user.sessionVersion = Number(linked.session_version);
        return true;
      },
      async jwt({ token, user }) {
        if (user) {
          token.uid = user.id;
          token.role = user.role || "customer";
          token.mustChangePassword = Boolean(user.mustChangePassword);
          token.sessionVersion = Number(user.sessionVersion);
        } else if (token.uid) {
          const stored = await env.DB.prepare("SELECT u.id,COALESCE(up.role,u.role) role,u.must_change_password,u.session_version FROM users u LEFT JOIN user_permissions up ON up.user_id=u.id WHERE u.id=?1").bind(token.uid).first();
          if (!stored || (token.sessionVersion !== undefined && Number(token.sessionVersion) !== Number(stored.session_version))) return null;
          token.role = stored.role;
          token.mustChangePassword = Boolean(stored.must_change_password);
          token.sessionVersion = Number(stored.session_version);
        }
        return token;
      },
      session({ session, token }) {
        if (session.user && token?.uid) { session.user.id = token.uid; session.user.role = token.role || "customer"; session.user.mustChangePassword = Boolean(token.mustChangePassword); }
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
