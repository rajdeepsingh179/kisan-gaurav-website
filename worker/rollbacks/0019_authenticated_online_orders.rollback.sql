DROP INDEX IF EXISTS idx_orders_registered_customer;
DROP TRIGGER IF EXISTS prevent_unsupported_order_payment;
DROP TRIGGER IF EXISTS prevent_invalid_order_customer_update;
DROP TRIGGER IF EXISTS prevent_invalid_order_customer_insert;

-- Quarantined rows are intentionally not restored automatically because their
-- customer/payment invariants are invalid. Retain the table for manual audit.
