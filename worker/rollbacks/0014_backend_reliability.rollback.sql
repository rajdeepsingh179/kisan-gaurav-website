DROP TRIGGER IF EXISTS prevent_duplicate_active_return;
DROP TRIGGER IF EXISTS apply_coupon_redemption;
DROP TRIGGER IF EXISTS validate_coupon_redemption;
DROP TABLE IF EXISTS processed_payments;
DROP INDEX IF EXISTS idx_order_transitions_order;
DROP TRIGGER IF EXISTS apply_order_transition;
DROP TRIGGER IF EXISTS validate_order_transition;
DROP TABLE IF EXISTS order_transitions;
DROP INDEX IF EXISTS idx_inventory_mutations_reference;
DROP INDEX IF EXISTS idx_inventory_mutations_variant;
DROP TRIGGER IF EXISTS apply_inventory_mutation;
DROP TRIGGER IF EXISTS validate_inventory_mutation;
DROP TABLE IF EXISTS inventory_mutations;
DROP TRIGGER IF EXISTS queue_deleted_media_objects;
DROP TABLE IF EXISTS media_deletion_queue;
DROP TABLE IF EXISTS transaction_assertions;
DROP INDEX IF EXISTS idx_media_duplicate_of;
DROP INDEX IF EXISTS idx_product_variants_live;
DROP INDEX IF EXISTS idx_media_content_hash;

-- SQLite/D1 does not safely support removing the appended archived and
-- content_hash and duplicate_of columns in-place. They remain inert after this rollback.
