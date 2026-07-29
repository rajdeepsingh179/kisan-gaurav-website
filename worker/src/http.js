export class HTTPError extends Error {
  constructor(status, message, code = "request_rejected") {
    super(message);
    this.name = "HTTPError";
    this.status = status;
    this.code = code;
  }
}

const DATABASE_ERRORS = [
  ["VARIANT_NOT_AVAILABLE", 409, "Product variant is no longer available.", "variant_not_available"],
  ["INVENTORY_CONFLICT", 409, "Inventory changed while this request was being saved. Refresh and try again.", "inventory_conflict"],
  ["INSUFFICIENT_STOCK", 409, "One or more items no longer have enough stock.", "insufficient_stock"],
  ["ORDER_STATE_CONFLICT", 409, "Order status changed before this update completed.", "order_state_conflict"],
  ["INVALID_ORDER_TRANSITION", 409, "That order status transition is not allowed.", "invalid_order_transition"],
  ["COUPON_UNAVAILABLE", 409, "Coupon is invalid, exhausted, or expired.", "coupon_unavailable"],
  ["RETURN_ALREADY_EXISTS", 409, "An active return request already exists for this order.", "return_already_exists"],
];

export function databaseHTTPError(error) {
  const message = String(error?.message || "");
  for (const [token, status, publicMessage, code] of DATABASE_ERRORS) {
    if (message.includes(token)) return new HTTPError(status, publicMessage, code);
  }
  if (message.includes("UNIQUE constraint failed")) {
    const payment = message.includes("processed_payments");
    return new HTTPError(409, payment ? "This payment has already been processed." : "A record with that unique value already exists.", payment ? "payment_already_processed" : "unique_conflict");
  }
  if (message.includes("FOREIGN KEY constraint failed")) return new HTTPError(409, "A referenced record does not exist or is still in use.", "reference_conflict");
  if (message.includes("CHECK constraint failed") || message.includes("NOT NULL constraint failed")) return new HTTPError(400, "The submitted data violates a database constraint.", "database_validation_failed");
  return null;
}
