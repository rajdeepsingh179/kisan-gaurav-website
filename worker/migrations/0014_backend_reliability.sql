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

CREATE INDEX IF NOT EXISTS idx_order_transitions_order
  ON order_transitions(order_id, created_at DESC);

CREATE TABLE processed_payments (
  payment_order_id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
