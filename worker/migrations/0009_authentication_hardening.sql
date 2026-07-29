ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0;

-- Disable the publicly documented bootstrap password if it was never changed.
-- The account remains available for an explicitly provisioned password or its
-- verified Google identity.
UPDATE users
SET
  password_hash=NULL,
  password_salt=NULL,
  updated_at=CURRENT_TIMESTAMP
WHERE
  email='admin@kisangaurav.com'
  AND password_salt='kg-super-admin-v1-2026'
  AND password_hash='350f67b65dd27ecaa260072d89b83ee7162444b4971fae6d16ccc157c5666c25'
  AND must_change_password=1;
