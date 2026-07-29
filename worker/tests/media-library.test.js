import test from "node:test";
import assert from "node:assert/strict";
import { File } from "node:buffer";
import { contentHash, validateMediaUpload } from "../src/security.js";

const jpegBytes = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0xff, 0xd9]);

test("Media Library validates the file signature independently of the claimed MIME", () => {
  const valid = new File([jpegBytes], "crop.jpg", { type: "image/jpeg" });
  assert.equal(validateMediaUpload(valid, jpegBytes.buffer).extension, "jpg");

  const disguised = new File([jpegBytes], "crop.png", { type: "image/png" });
  assert.throws(() => validateMediaUpload(disguised, jpegBytes.buffer), /PNG signature|extension/i);
});

test("Media Library content hashing supports deterministic duplicate detection", async () => {
  const first = await contentHash(jpegBytes.buffer);
  const duplicate = await contentHash(Uint8Array.from(jpegBytes).buffer);
  const different = await contentHash(Uint8Array.from([0xff, 0xd8, 0xff, 0xdb, 0xff, 0xd9]).buffer);
  assert.equal(first, duplicate);
  assert.notEqual(first, different);
});

test("Media Library rejects files exceeding the configured limit", () => {
  const file = new File([jpegBytes], "crop.jpg", { type: "image/jpeg" });
  assert.throws(() => validateMediaUpload(file, jpegBytes.buffer, { maxBytes: 4 }), /limit/i);
});
