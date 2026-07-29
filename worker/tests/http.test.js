import test from "node:test";
import assert from "node:assert/strict";
import { databaseHTTPError } from "../src/http.js";

test("maps transactional database failures to stable API errors", () => {
  assert.deepEqual(
    { status: databaseHTTPError(new Error("INVENTORY_CONFLICT: SQLITE_CONSTRAINT")).status, code: databaseHTTPError(new Error("INVENTORY_CONFLICT")).code },
    { status: 409, code: "inventory_conflict" },
  );
  assert.equal(databaseHTTPError(new Error("INSUFFICIENT_STOCK")).code, "insufficient_stock");
  assert.equal(databaseHTTPError(new Error("COUPON_UNAVAILABLE")).code, "coupon_unavailable");
  assert.equal(databaseHTTPError(new Error("RETURN_ALREADY_EXISTS")).status, 409);
});

test("maps standard SQLite constraints without exposing internals", () => {
  assert.equal(databaseHTTPError(new Error("UNIQUE constraint failed: products.slug")).code, "unique_conflict");
  assert.equal(databaseHTTPError(new Error("FOREIGN KEY constraint failed")).code, "reference_conflict");
  assert.equal(databaseHTTPError(new Error("CHECK constraint failed: stock >= 0")).status, 400);
  assert.equal(databaseHTTPError(new Error("socket reset")), null);
});
