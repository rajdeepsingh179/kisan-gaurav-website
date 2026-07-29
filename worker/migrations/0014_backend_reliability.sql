ALTER TABLE product_variants ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;
ALTER TABLE media_assets ADD COLUMN content_hash TEXT;
ALTER TABLE media_assets ADD COLUMN duplicate_of TEXT REFERENCES media_assets(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_media_content_hash
  ON media_assets(content_hash)
  WHERE content_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_duplicate_of
  ON media_assets(duplicate_of)
  WHERE duplicate_of IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_live
  ON product_variants(product_id, archived, active);

CREATE TABLE transaction_assertions (
  id TEXT PRIMARY KEY,
  value INTEGER NOT NULL CHECK(value=1)
);

CREATE TABLE media_deletion_queue (
  asset_id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL,
  thumbnail_key TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER queue_deleted_media_objects
AFTER DELETE ON media_assets
BEGIN
  INSERT INTO media_deletion_queue(asset_id, object_key, thumbnail_key)
  VALUES(OLD.id, OLD.key, OLD.thumbnail_key)
  ON CONFLICT(asset_id) DO UPDATE SET
    object_key=excluded.object_key,
    thumbnail_key=excluded.thumbnail_key,
    updated_at=CURRENT_TIMESTAMP;
END;

CREATE TABLE inventory_mutations (
  id TEXT PRIMARY KEY,
  variant_id TEXT NOT NULL REFERENCES product_variants(id),
  mutation_type TEXT NOT NULL CHECK(mutation_type IN ('set', 'delta')),
  expected_stock INTEGER,
  quantity INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id TEXT,
  actor_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER validate_inventory_mutation
BEFORE INSERT ON inventory_mutations
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM product_variants WHERE id=NEW.variant_id
    ) THEN RAISE(ABORT, 'VARIANT_NOT_AVAILABLE')
    WHEN EXISTS (
      SELECT 1 FROM product_variants
      WHERE id=NEW.variant_id AND archived=1
    ) AND (NEW.mutation_type='set' OR NEW.quantity<0)
      THEN RAISE(ABORT, 'VARIANT_NOT_AVAILABLE')
    WHEN NEW.mutation_type='set' AND (
      NEW.expected_stock IS NULL OR NEW.quantity < 0 OR
      NOT EXISTS (
        SELECT 1 FROM product_variants
        WHERE id=NEW.variant_id AND stock=NEW.expected_stock
      )
    ) THEN RAISE(ABORT, 'INVENTORY_CONFLICT')
    WHEN NEW.mutation_type='delta' AND (
      NEW.quantity=0 OR
      NOT EXISTS (
        SELECT 1 FROM product_variants
        WHERE id=NEW.variant_id AND stock + NEW.quantity >= 0
      )
    ) THEN RAISE(ABORT, 'INSUFFICIENT_STOCK')
  END;
END;

CREATE TRIGGER apply_inventory_mutation
AFTER INSERT ON inventory_mutations
BEGIN
  UPDATE product_variants
  SET stock=CASE
      WHEN NEW.mutation_type='set' THEN NEW.quantity
      ELSE stock + NEW.quantity
    END,
    updated_at=CURRENT_TIMESTAMP
  WHERE id=NEW.variant_id;

  INSERT INTO inventory_history(
    id, variant_id, change_quantity, balance_after, reason,
    reference_id, actor_user_id, created_at
  )
  SELECT
    NEW.id, NEW.variant_id,
    CASE
      WHEN NEW.mutation_type='set' THEN NEW.quantity - NEW.expected_stock
      ELSE NEW.quantity
    END,
    stock, NEW.reason, NEW.reference_id, NEW.actor_user_id, NEW.created_at
  FROM product_variants
  WHERE id=NEW.variant_id;
END;

CREATE INDEX IF NOT EXISTS idx_inventory_mutations_variant
  ON inventory_mutations(variant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_mutations_reference
  ON inventory_mutations(reference_id);

CREATE TABLE order_transitions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  note TEXT,
  tracking_number TEXT,
  actor_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER validate_order_transition
BEFORE INSERT ON order_transitions
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM orders
      WHERE id=NEW.order_id AND status=NEW.from_status
    ) THEN RAISE(ABORT, 'ORDER_STATE_CONFLICT')
    WHEN NOT (
      (NEW.from_status='pending' AND NEW.to_status IN ('confirmed','cancelled')) OR
      (NEW.from_status='confirmed' AND NEW.to_status IN ('packed','cancelled')) OR
      (NEW.from_status='packed' AND NEW.to_status IN ('shipped','cancelled')) OR
      (NEW.from_status='shipped' AND NEW.to_status IN ('delivered','returned')) OR
      (NEW.from_status='delivered' AND NEW.to_status IN ('returned','refunded')) OR
      (NEW.from_status='returned' AND NEW.to_status='refunded')
    ) THEN RAISE(ABORT, 'INVALID_ORDER_TRANSITION')
  END;
END;

CREATE TRIGGER apply_order_transition
AFTER INSERT ON order_transitions
BEGIN
  UPDATE orders
  SET status=NEW.to_status,
    tracking_number=COALESCE(NEW.tracking_number, tracking_number),
    updated_at=CURRENT_TIMESTAMP
  WHERE id=NEW.order_id;

  INSERT INTO order_status_history(id, order_id, status, note, created_at)
  VALUES(NEW.id, NEW.order_id, NEW.to_status, NEW.note, NEW.created_at);
END;

CREATE INDEX IF NOT EXISTS idx_order_transitions_order
  ON order_transitions(order_id, created_at DESC);

CREATE TABLE processed_payments (
  payment_order_id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER validate_coupon_redemption
BEFORE INSERT ON coupon_redemptions
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM coupons
      WHERE id=NEW.coupon_id
        AND enabled=1
        AND (expires_at IS NULL OR expires_at>CURRENT_TIMESTAMP)
        AND (usage_limit IS NULL OR usage_count<usage_limit)
    ) THEN RAISE(ABORT, 'COUPON_UNAVAILABLE')
  END;
END;

CREATE TRIGGER apply_coupon_redemption
AFTER INSERT ON coupon_redemptions
BEGIN
  UPDATE coupons
  SET usage_count=usage_count+1, updated_at=CURRENT_TIMESTAMP
  WHERE id=NEW.coupon_id;
END;

CREATE TRIGGER prevent_duplicate_active_return
BEFORE INSERT ON returns
WHEN EXISTS (
  SELECT 1 FROM returns
  WHERE order_id=NEW.order_id AND status IN ('pending','approved')
)
BEGIN
  SELECT RAISE(ABORT, 'RETURN_ALREADY_EXISTS');
END;
