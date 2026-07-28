ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;

CREATE TABLE admin_login_attempts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT,
  succeeded INTEGER NOT NULL DEFAULT 0,
  attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_admin_login_attempts ON admin_login_attempts(email,attempted_at DESC);

ALTER TABLE user_permissions RENAME TO user_permissions_legacy;

CREATE TABLE user_permissions (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN','ADMIN','MANAGER','STAFF')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO user_permissions(user_id,role,updated_at)
SELECT
  user_id,
  CASE role
    WHEN 'admin' THEN 'ADMIN'
    WHEN 'manager' THEN 'MANAGER'
    WHEN 'staff' THEN 'STAFF'
    ELSE upper(role)
  END,
  updated_at
FROM user_permissions_legacy;

DROP TABLE user_permissions_legacy;

INSERT OR IGNORE INTO user_permissions(user_id,role)
SELECT id,'ADMIN' FROM users WHERE role='admin';

INSERT OR IGNORE INTO users(
  id,email,name,password_hash,password_salt,role,email_verified_at,must_change_password
) VALUES (
  'initial-super-admin',
  'admin@kisangaurav.com',
  'Kisan Gaurav Super Admin',
  '5ea5ca3480cc95624642040aca4f5f2d3e0d6c508ae6b3afb5474aabf0b58b71',
  'kg-super-admin-v1-2026',
  'customer',
  CURRENT_TIMESTAMP,
  1
);

-- Preserve an existing password. If the email previously existed only through
-- OAuth, initialize its password without creating another user row.
UPDATE users
SET
  password_hash=COALESCE(password_hash,'5ea5ca3480cc95624642040aca4f5f2d3e0d6c508ae6b3afb5474aabf0b58b71'),
  password_salt=COALESCE(password_salt,'kg-super-admin-v1-2026'),
  must_change_password=CASE WHEN password_hash IS NULL THEN 1 ELSE must_change_password END
WHERE email='admin@kisangaurav.com';

INSERT INTO user_permissions(user_id,role)
SELECT id,'SUPER_ADMIN' FROM users WHERE email='admin@kisangaurav.com'
ON CONFLICT(user_id) DO UPDATE SET role='SUPER_ADMIN',updated_at=CURRENT_TIMESTAMP;
