ALTER TABLE users ADD COLUMN password_iterations INTEGER NOT NULL DEFAULT 100000;
ALTER TABLE email_verification_tokens ADD COLUMN pending_password_iterations INTEGER NOT NULL DEFAULT 600000;
