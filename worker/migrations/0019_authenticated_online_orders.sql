-- Enforce authenticated, verified customer ownership and online-only payment.
-- Invalid legacy rows are copied to a quarantine table for operational audit.
-- They remain in the live tables so applying this migration cannot erase order
-- history; current application queries exclude them from active commerce views.

UPDATE orders
SET user_id=(
  SELECT u.id FROM users u
  WHERE lower(u.email)=lower(orders.customer_email)
    AND u.email_verified_at IS NOT NULL
  LIMIT 1
)
WHERE user_id IS NULL
  AND EXISTS(
    SELECT 1 FROM users u
    WHERE lower(u.email)=lower(orders.customer_email)
      AND u.email_verified_at IS NOT NULL
  );

CREATE TABLE legacy_invalid_orders AS
SELECT o.*,CURRENT_TIMESTAMP quarantined_at,
  CASE
    WHEN o.user_id IS NULL THEN 'anonymous_customer'
    WHEN NOT EXISTS(SELECT 1 FROM users u WHERE u.id=o.user_id AND u.email_verified_at IS NOT NULL) THEN 'invalid_customer'
    ELSE 'unsupported_payment'
  END quarantine_reason
FROM orders o
WHERE o.user_id IS NULL
   OR NOT EXISTS(SELECT 1 FROM users u WHERE u.id=o.user_id AND u.email_verified_at IS NOT NULL)
   OR o.payment_method<>'razorpay'
   OR o.payment_status<>'paid'
   OR o.payment_order_id IS NULL
   OR o.payment_id IS NULL;

CREATE TRIGGER prevent_invalid_order_customer_insert
BEFORE INSERT ON orders
FOR EACH ROW
WHEN NEW.user_id IS NULL OR NOT EXISTS(
  SELECT 1 FROM users u
  WHERE u.id=NEW.user_id
    AND u.email_verified_at IS NOT NULL
    AND u.account_status='ACTIVE'
    AND u.blacklisted=0
)
BEGIN
  SELECT RAISE(ABORT, 'ORDER_REQUIRES_VERIFIED_CUSTOMER');
END;

CREATE TRIGGER prevent_invalid_order_customer_update
BEFORE UPDATE OF user_id ON orders
FOR EACH ROW
WHEN NEW.user_id IS NULL OR NOT EXISTS(
  SELECT 1 FROM users u
  WHERE u.id=NEW.user_id AND u.email_verified_at IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'ORDER_REQUIRES_VALID_CUSTOMER');
END;

CREATE TRIGGER prevent_unsupported_order_payment
BEFORE INSERT ON orders
FOR EACH ROW
WHEN NEW.payment_method<>'razorpay'
  OR NEW.payment_status<>'paid'
  OR NEW.payment_order_id IS NULL
  OR NEW.payment_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'ONLINE_PAYMENT_REQUIRED');
END;

CREATE INDEX idx_orders_registered_customer
  ON orders(user_id,created_at DESC);
