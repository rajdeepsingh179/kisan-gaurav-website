import { HTTPError } from "./http.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const binaryDecoder = new TextDecoder("latin1");

const MIME_EXTENSIONS = {
  "image/jpeg": new Set(["jpg", "jpeg"]),
  "image/png": new Set(["png"]),
  "image/webp": new Set(["webp"]),
  "image/svg+xml": new Set(["svg"]),
  "application/pdf": new Set(["pdf"]),
};

const MIME_LIMITS = {
  "image/jpeg": 10_000_000,
  "image/png": 10_000_000,
  "image/webp": 10_000_000,
  "image/svg+xml": 1_000_000,
  "application/pdf": 12_000_000,
};

const PROFILE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MEDIA_TYPES = new Set(Object.keys(MIME_EXTENSIONS));
const UNSAFE_SVG = [
  /<!DOCTYPE|<!ENTITY/i,
  /<\s*(?:script|foreignObject|iframe|object|embed|applet|audio|video|canvas|style|link|meta|base|form)\b/i,
  /<\s*(?:animate|animateMotion|animateTransform|set)\b/i,
  /\son[a-z0-9_-]+\s*=/i,
  /(?:javascript|vbscript)\s*:/i,
  /data\s*:\s*(?:text\/html|image\/svg\+xml)/i,
  /(?:@import|expression)\s*\(/i,
  /<\?(?!xml(?:\s|$))/i,
  /\sstyle\s*=/i,
  /\shref\s*=\s*["']\s*(?!#)[^"']+/i,
  /\sxlink:href\s*=\s*["']\s*(?!#)[^"']+/i,
  /url\s*\(\s*(?!["']?#)[^)]+\)/i,
];

const startsWith = (bytes, expected) => expected.every((value, index) => bytes[index] === value);
const endsWith = (bytes, expected) => expected.every((value, index) => bytes[bytes.length - expected.length + index] === value);
const ascii = (bytes, start, length) => binaryDecoder.decode(bytes.slice(start, start + length));

export function securityHeaders() {
  return {
    "Content-Security-Policy": "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "X-Permitted-Cross-Domain-Policies": "none",
  };
}

export function assertRequestSize(request, maxBytes) {
  const declared = Number(request.headers.get("Content-Length") || 0);
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new HTTPError(413, "Request body is too large.", "payload_too_large");
  }
}

export function safeFileName(value) {
  const name = [...String(value || "upload")].map((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127 || character === "/" || character === "\\" ? "_" : character;
  }).join("").trim().slice(0, 180);
  return name || "upload";
}

function extensionFor(file) {
  const extension = safeFileName(file.name).split(".").pop()?.toLowerCase() || "";
  const allowed = MIME_EXTENSIONS[file.type];
  if (!allowed?.has(extension)) {
    throw new HTTPError(400, "The file extension does not match its MIME type.", "media_extension_mismatch");
  }
  return file.type === "image/jpeg" && extension === "jpeg" ? "jpg" : extension;
}

function assertSvg(bytes) {
  let source;
  try {
    source = decoder.decode(bytes).replace(/^\uFEFF/, "").trim();
  } catch {
    throw new HTTPError(400, "SVG files must contain valid UTF-8 text.", "invalid_svg_encoding");
  }
  if (!/^(?:<\?xml[\s\S]*?\?>\s*)?<svg(?:\s|>)/i.test(source) || !/<\/svg>\s*$/i.test(source)) {
    throw new HTTPError(400, "The SVG document is malformed.", "invalid_svg");
  }
  if (UNSAFE_SVG.some((pattern) => pattern.test(source))) {
    throw new HTTPError(400, "SVG contains active or externally loaded content.", "unsafe_svg");
  }
}

function assertPdf(bytes) {
  if (ascii(bytes, 0, 5) !== "%PDF-") throw new HTTPError(400, "The PDF signature is invalid.", "invalid_pdf");
  const tail = ascii(bytes, Math.max(0, bytes.length - 2048), Math.min(bytes.length, 2048));
  if (!tail.includes("%%EOF")) throw new HTTPError(400, "The PDF is incomplete.", "invalid_pdf");
  const source = ascii(bytes, 0, bytes.length);
  if (/\/(?:JavaScript|JS|Launch|EmbeddedFile|OpenAction|AA)\b/i.test(source)) {
    throw new HTTPError(400, "PDF contains active or embedded content.", "unsafe_pdf");
  }
}

function assertSignature(type, bytes) {
  if (type === "image/jpeg") {
    if (!startsWith(bytes, [0xff, 0xd8, 0xff]) || !endsWith(bytes, [0xff, 0xd9])) throw new HTTPError(400, "The JPEG signature is invalid.", "invalid_media_signature");
    return;
  }
  if (type === "image/png") {
    if (!startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) || ascii(bytes, 12, 4) !== "IHDR" || ascii(bytes, bytes.length - 8, 4) !== "IEND") {
      throw new HTTPError(400, "The PNG signature is invalid.", "invalid_media_signature");
    }
    return;
  }
  if (type === "image/webp") {
    const declaredLength = bytes.length >= 8 ? new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true) + 8 : 0;
    if (ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP" || !["VP8 ", "VP8L", "VP8X"].includes(ascii(bytes, 12, 4)) || declaredLength !== bytes.length) {
      throw new HTTPError(400, "The WEBP signature is invalid.", "invalid_media_signature");
    }
    return;
  }
  if (type === "image/svg+xml") return assertSvg(bytes);
  if (type === "application/pdf") return assertPdf(bytes);
  throw new HTTPError(400, "Unsupported media type.", "unsupported_media_type");
}

export function validateMediaUpload(file, arrayBuffer, options = {}) {
  const allowedTypes = options.profile ? PROFILE_TYPES : MEDIA_TYPES;
  if (!(file instanceof File) || !allowedTypes.has(file.type)) {
    throw new HTTPError(400, options.profile ? "Upload a JPG, PNG or WEBP image." : "Upload a JPG, JPEG, PNG, WEBP, SVG or PDF file.", "unsupported_media_type");
  }
  const limit = Math.min(options.maxBytes || Number.MAX_SAFE_INTEGER, MIME_LIMITS[file.type]);
  if (!file.size || file.size > limit || arrayBuffer.byteLength !== file.size) {
    throw new HTTPError(400, `File exceeds the ${Math.floor(limit / 1_000_000)} MB limit or is empty.`, "invalid_media_size");
  }
  const bytes = new Uint8Array(arrayBuffer);
  assertSignature(file.type, bytes);
  return { extension: extensionFor(file), fileName: safeFileName(file.name), bytes };
}

async function digest(value) {
  const result = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(result)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function contentHash(arrayBuffer) {
  const result = await crypto.subtle.digest("SHA-256", arrayBuffer);
  return [...new Uint8Array(result)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function enforceRateLimit(c, { scope, limit, windowSeconds, identity }) {
  const source = String(identity || c.req.header("CF-Connecting-IP") || "unknown").slice(0, 300);
  const identityHash = await digest(source);
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = `${scope}:${identityHash}:${bucket}`;
  const expiresAt = new Date((bucket + 1) * windowSeconds * 1000 + 60_000).toISOString();
  const [, result] = await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO rate_limit_buckets(key,scope,identity_hash,request_count,expires_at) VALUES(?1,?2,?3,1,?4) ON CONFLICT(key) DO UPDATE SET request_count=request_count+1").bind(key, scope, identityHash, expiresAt),
    c.env.DB.prepare("SELECT request_count FROM rate_limit_buckets WHERE key=?1").bind(key),
  ]);
  const count = Number(result.results[0]?.request_count || 0);
  c.header("RateLimit-Limit", String(limit));
  c.header("RateLimit-Remaining", String(Math.max(0, limit - count)));
  if (count > limit) {
    const retryAfter = Math.max(1, Math.ceil(((bucket + 1) * windowSeconds * 1000 - Date.now()) / 1000));
    c.header("Retry-After", String(retryAfter));
    throw new HTTPError(429, "Too many requests. Please try again later.", "rate_limited");
  }
}

export function rateProfile(path, method) {
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return null;
  if (path.startsWith("/api/auth/")) return { scope: "auth", limit: 30, windowSeconds: 300 };
  if (["/api/account/signup", "/api/account/forgot-password", "/api/account/reset-password"].includes(path)) return { scope: "account-sensitive", limit: 10, windowSeconds: 900 };
  if (path === "/api/admin/uploads" || path.endsWith("/replace")) return { scope: "media-write", limit: 30, windowSeconds: 600 };
  if (path.startsWith("/api/admin/")) return { scope: "admin-write", limit: 180, windowSeconds: 60 };
  if (path.startsWith("/api/orders") || path.startsWith("/api/payments") || path === "/api/checkout/quote") return { scope: "commerce-write", limit: 40, windowSeconds: 300 };
  if (path === "/api/analytics/events") return { scope: "analytics-write", limit: 60, windowSeconds: 60 };
  return { scope: "api-write", limit: 120, windowSeconds: 60 };
}

export function sanitizeAuditDetails(details) {
  const blocked = /password|secret|token|authorization|cookie|signature/i;
  const visit = (value, depth = 0) => {
    if (depth > 4) return "[truncated]";
    if (Array.isArray(value)) return value.slice(0, 25).map((item) => visit(item, depth + 1));
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).slice(0, 50).map(([key, item]) => [key, blocked.test(key) ? "[redacted]" : visit(item, depth + 1)]));
    }
    return typeof value === "string" ? value.slice(0, 500) : value;
  };
  return visit(details || {});
}
