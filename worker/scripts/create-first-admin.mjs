import { createHash, pbkdf2Sync, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const args = Object.fromEntries(process.argv.slice(2).map((argument, index, values) => argument.startsWith("--") ? [argument.slice(2), values[index + 1]?.startsWith("--") ? "" : values[index + 1]] : null).filter(Boolean));
const email = String(args.email || "admin@kisangaurav.com").trim().toLowerCase();
const password = String(args.password || "ChangeMe@123");
const name = String(args.name || "Kisan Gaurav Super Admin");
const role = String(args.role || "SUPER_ADMIN").toUpperCase();
if (!email.includes("@")) throw new Error("Provide a valid --email.");
if (password.length < 12) throw new Error("Password must contain at least 12 characters.");
if (!["SUPER_ADMIN", "ADMIN"].includes(role)) throw new Error("Role must be SUPER_ADMIN or ADMIN.");

const salt = randomUUID();
const hash = pbkdf2Sync(password, salt, 310000, 32, "sha256").toString("hex");
const id = `local-admin-${createHash("sha256").update(email).digest("hex").slice(0, 20)}`;
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sql = `
INSERT OR IGNORE INTO users(id,email,name,password_hash,password_salt,role,email_verified_at,must_change_password)
VALUES(${quote(id)},${quote(email)},${quote(name)},${quote(hash)},${quote(salt)},'customer',CURRENT_TIMESTAMP,1);
INSERT INTO user_permissions(user_id,role)
SELECT id,${quote(role)} FROM users WHERE email=${quote(email)}
ON CONFLICT(user_id) DO UPDATE SET role=excluded.role,updated_at=CURRENT_TIMESTAMP;
`;
const scriptDirectory = resolve(fileURLToPath(new URL(".", import.meta.url)));
const wrangler = resolve(scriptDirectory, "..", "node_modules", "wrangler", "bin", "wrangler.js");
const result = spawnSync(process.execPath, [wrangler, "d1", "execute", "kisan-gaurav-commerce", "--local", "--command", sql], { cwd: resolve(scriptDirectory, ".."), stdio: "inherit" });
if (result.status !== 0) process.exit(result.status || 1);
console.log(`Local ${role} ready: ${email}`);
