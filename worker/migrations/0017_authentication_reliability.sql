-- Authentication hot-path indexes. These keep lockout, token validation, and
-- provider-link lookups predictable as the customer table grows.
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_ip_time
  ON admin_login_attempts(ip_address, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_password_reset_user_time
  ON password_reset_tokens(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_password_reset_expiry
  ON password_reset_tokens(expires_at, used_at);

CREATE INDEX IF NOT EXISTS idx_email_verification_expiry
  ON email_verification_tokens(expires_at, used_at);

CREATE INDEX IF NOT EXISTS idx_auth_accounts_user
  ON auth_accounts(user_id);

-- Retry transient notification delivery failures instead of permanently
-- dropping verification and password-reset messages after one attempt.
ALTER TABLE notifications ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE notifications ADD COLUMN next_attempt_at TEXT;
ALTER TABLE notifications ADD COLUMN last_error TEXT;

CREATE INDEX IF NOT EXISTS idx_notifications_delivery
  ON notifications(status, next_attempt_at, attempts, created_at);
