-- Pre-provision a passwordless user for Google Sign-In, then grant the
-- requested production administrator role. Idempotent on repeated execution.

INSERT OR IGNORE INTO users(id, email, name, role)
VALUES (
  'preprovisioned-akshay-super-admin',
  'akshayyr22@gmail.com',
  'akshayyr22@gmail.com',
  'customer'
);

INSERT INTO user_permissions(user_id, role, updated_at)
SELECT id, 'SUPER_ADMIN', CURRENT_TIMESTAMP
FROM users
WHERE email = 'akshayyr22@gmail.com'
ON CONFLICT(user_id) DO UPDATE SET
  role = 'SUPER_ADMIN',
  updated_at = CURRENT_TIMESTAMP;
