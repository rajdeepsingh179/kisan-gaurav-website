DROP INDEX IF EXISTS idx_notifications_delivery;
ALTER TABLE notifications DROP COLUMN last_error;
ALTER TABLE notifications DROP COLUMN next_attempt_at;
ALTER TABLE notifications DROP COLUMN attempts;
DROP INDEX IF EXISTS idx_auth_accounts_user;
DROP INDEX IF EXISTS idx_email_verification_expiry;
DROP INDEX IF EXISTS idx_password_reset_expiry;
DROP INDEX IF EXISTS idx_password_reset_user_time;
DROP INDEX IF EXISTS idx_admin_login_attempts_ip_time;
