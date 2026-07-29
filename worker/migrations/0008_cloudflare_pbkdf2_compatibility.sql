-- Cloudflare Workers WebCrypto supports PBKDF2 iteration counts up to 100,000.
-- Only migrate the untouched deterministic seed hash. User-selected passwords
-- are never reset or rewritten by this migration.
UPDATE users
SET
  password_hash='350f67b65dd27ecaa260072d89b83ee7162444b4971fae6d16ccc157c5666c25',
  updated_at=CURRENT_TIMESTAMP
WHERE
  email='admin@kisangaurav.com'
  AND password_salt='kg-super-admin-v1-2026'
  AND password_hash='5ea5ca3480cc95624642040aca4f5f2d3e0d6c508ae6b3afb5474aabf0b58b71'
  AND must_change_password=1;
