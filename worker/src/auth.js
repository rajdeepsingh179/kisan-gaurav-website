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
  return {
    basePath: "/api/auth",
    secret: env.AUTH_SECRET,
    trustHost: true,
    session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
    providers: [
      Google({ clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET }),
      Credentials({
        credentials: { email: { type: "email" }, password: { type: "password" } },
        authorize: async (credentials) => {
          const email = String(credentials?.email || "").trim().toLowerCase();
          const user = await env.DB.prepare("SELECT id,email,name,role,profile_photo_url,password_hash,password_salt FROM users WHERE email=?1").bind(email).first();
          if (!user?.password_hash || !(await verifyPassword(String(credentials?.password || ""), user.password_salt, user.password_hash))) return null;
          return { id: user.id, email: user.email, name: user.name, role: user.role, image: user.profile_photo_url };
        },
      }),
    ],
    callbacks: {
      async signIn({ user, account }) {
        if (account?.provider !== "google") return true;
        const email = String(user.email || "").toLowerCase();
        let stored = await env.DB.prepare("SELECT id,role FROM users WHERE email=?1").bind(email).first();
        if (!stored) {
          const id = crypto.randomUUID();
          await env.DB.prepare("INSERT INTO users(id,email,name,profile_photo_url,email_verified_at) VALUES(?1,?2,?3,?4,CURRENT_TIMESTAMP)").bind(id, email, user.name || email, user.image || null).run();
          stored = { id, role: "customer" };
        }
        await env.DB.prepare("INSERT OR IGNORE INTO auth_accounts(user_id,provider,provider_account_id) VALUES(?1,?2,?3)").bind(stored.id, account.provider, account.providerAccountId).run();
        user.id = stored.id;
        user.role = stored.role;
        return true;
      },
      async jwt({ token, user }) {
        if (user) {
          token.uid = user.id;
          token.role = user.role || "customer";
        } else if (token.email) {
          const stored = await env.DB.prepare("SELECT id,role FROM users WHERE email=?1").bind(String(token.email).toLowerCase()).first();
          if (stored) { token.uid = stored.id; token.role = stored.role; }
        }
        return token;
      },
      session({ session, token }) {
        if (session.user) { session.user.id = token.uid; session.user.role = token.role || "customer"; }
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
