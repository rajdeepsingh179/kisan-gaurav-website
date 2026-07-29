import test from "node:test";
import assert from "node:assert/strict";
import { File } from "node:buffer";
import { contentHash, securityHeaders, validateMediaUpload } from "../src/security.js";

const upload = (name, type, bytes, options) => {
  const file = new File([Uint8Array.from(bytes)], name, { type });
  return validateMediaUpload(file, Uint8Array.from(bytes).buffer, options);
};

test("security headers include browser isolation policies", () => {
  const headers = securityHeaders();
  assert.match(headers["Content-Security-Policy"], /frame-ancestors 'none'/);
  assert.match(headers["Strict-Transport-Security"], /includeSubDomains/);
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.match(headers["Permissions-Policy"], /camera=\(\)/);
});

test("accepts matching image signatures", () => {
  const jpeg = upload("photo.jpeg", "image/jpeg", [0xff, 0xd8, 0xff, 0xe0, 0x00, 0xff, 0xd9]);
  assert.equal(jpeg.extension, "jpg");

  const png = upload("photo.png", "image/png", [
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0, 0, 0, 0, 0x49, 0x48, 0x44, 0x52,
    0x49, 0x45, 0x4e, 0x44, 0, 0, 0, 0,
  ]);
  assert.equal(png.extension, "png");

  const webp = upload("photo.webp", "image/webp", [
    0x52, 0x49, 0x46, 0x46, 12, 0, 0, 0,
    0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58,
    0, 0, 0, 0,
  ]);
  assert.equal(webp.extension, "webp");
});

test("rejects MIME and extension mismatches", () => {
  assert.throws(
    () => upload("photo.png", "image/jpeg", [0xff, 0xd8, 0xff, 0xff, 0xd9]),
    /extension does not match/i,
  );
  assert.throws(
    () => upload("photo.jpg", "image/jpeg", [0x89, 0x50, 0x4e, 0x47]),
    /JPEG signature/i,
  );
});

test("blocks active SVG content and permits inert SVG", () => {
  const safe = new TextEncoder().encode("<svg xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M0 0\"/></svg>");
  assert.equal(upload("icon.svg", "image/svg+xml", safe).extension, "svg");

  const script = new TextEncoder().encode("<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>");
  assert.throws(() => upload("icon.svg", "image/svg+xml", script), /active or externally loaded/i);

  const external = new TextEncoder().encode("<svg xmlns=\"http://www.w3.org/2000/svg\"><image href=\"https://attacker.invalid/a.png\"/></svg>");
  assert.throws(() => upload("icon.svg", "image/svg+xml", external), /active or externally loaded/i);
});

test("rejects active PDF content and enforces upload limits", () => {
  const active = new TextEncoder().encode("%PDF-1.7\n1 0 obj\n/JavaScript\nendobj\n%%EOF");
  assert.throws(() => upload("file.pdf", "application/pdf", active), /active or embedded/i);

  const jpeg = new File([Uint8Array.from([0xff, 0xd8, 0xff, 0xff, 0xd9])], "photo.jpg", { type: "image/jpeg" });
  assert.throws(() => validateMediaUpload(jpeg, Uint8Array.from([0xff, 0xd8, 0xff, 0xff, 0xd9]).buffer, { maxBytes: 4 }), /limit/i);
});

test("profile images cannot be SVG", () => {
  const safe = new TextEncoder().encode("<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>");
  assert.throws(() => upload("avatar.svg", "image/svg+xml", safe, { profile: true }), /JPG, PNG or WEBP/i);
});

test("content hashes are deterministic and content-sensitive", async () => {
  const first = await contentHash(new TextEncoder().encode("asset-a").buffer);
  const repeated = await contentHash(new TextEncoder().encode("asset-a").buffer);
  const second = await contentHash(new TextEncoder().encode("asset-b").buffer);
  assert.equal(first, repeated);
  assert.notEqual(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
});
