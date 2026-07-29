ALTER TABLE users ADD COLUMN first_name TEXT;
ALTER TABLE users ADD COLUMN last_name TEXT;
ALTER TABLE users ADD COLUMN failed_login_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TEXT;

-- Existing password users must continue to work after verification becomes
-- mandatory. Google-created users were already marked verified at creation.
UPDATE users
SET email_verified_at=COALESCE(email_verified_at, CURRENT_TIMESTAMP)
WHERE password_hash IS NOT NULL;

CREATE TABLE email_verification_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pending_password_hash TEXT NOT NULL,
  pending_password_salt TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_verification_user
  ON email_verification_tokens(user_id, created_at DESC);

INSERT OR IGNORE INTO email_templates(
  id,template_key,name,subject,preheader,html_content,text_content,enabled
) VALUES(
  'email-verification',
  'email_verification',
  'Email Verification',
  'Verify your Kisan Gaurav email',
  'Your verification link expires in 24 hours.',
  '<h1>Verify your email</h1><p>Finish creating your Kisan Gaurav account:</p><p><a href="{{verificationUrl}}">Verify email</a></p><p>This link expires in 24 hours.</p>',
  'Verify your Kisan Gaurav email: {{verificationUrl}} (expires in 24 hours)',
  1
);
