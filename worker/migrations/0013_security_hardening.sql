CREATE TABLE rate_limit_buckets (
  key TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  identity_hash TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rate_limit_expiry ON rate_limit_buckets(expires_at);
CREATE INDEX idx_activity_actor_created ON activity_logs(actor_user_id,created_at DESC);
CREATE INDEX idx_activity_action_created ON activity_logs(action,created_at DESC);
