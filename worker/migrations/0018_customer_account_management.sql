-- Customer lifecycle controls for the SUPER_ADMIN customer-management workspace.

ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'ACTIVE'
  CHECK(account_status IN ('ACTIVE','SUSPENDED','DELETED'));
ALTER TABLE users ADD COLUMN blacklisted INTEGER NOT NULL DEFAULT 0
  CHECK(blacklisted IN (0,1));
ALTER TABLE users ADD COLUMN status_reason TEXT;
ALTER TABLE users ADD COLUMN suspended_at TEXT;
ALTER TABLE users ADD COLUMN deleted_at TEXT;
ALTER TABLE users ADD COLUMN blacklisted_at TEXT;
ALTER TABLE users ADD COLUMN status_changed_at TEXT;
ALTER TABLE users ADD COLUMN status_changed_by TEXT;

CREATE INDEX idx_users_account_lifecycle
  ON users(account_status,blacklisted,created_at DESC);

DROP TRIGGER IF EXISTS prevent_last_super_admin_demotion;
CREATE TRIGGER prevent_last_super_admin_demotion
BEFORE UPDATE OF role ON user_permissions
FOR EACH ROW
WHEN
  OLD.role = 'SUPER_ADMIN'
  AND NEW.role <> 'SUPER_ADMIN'
  AND (
    SELECT COUNT(*)
    FROM user_permissions p
    JOIN users u ON u.id=p.user_id
    WHERE p.role='SUPER_ADMIN' AND u.account_status='ACTIVE' AND u.blacklisted=0
  ) <= 1
BEGIN
  SELECT RAISE(ABORT, 'Cannot demote the last active SUPER_ADMIN');
END;

DROP TRIGGER IF EXISTS prevent_last_super_admin_removal;
CREATE TRIGGER prevent_last_super_admin_removal
BEFORE DELETE ON user_permissions
FOR EACH ROW
WHEN
  OLD.role = 'SUPER_ADMIN'
  AND (
    SELECT COUNT(*)
    FROM user_permissions p
    JOIN users u ON u.id=p.user_id
    WHERE p.role='SUPER_ADMIN' AND u.account_status='ACTIVE' AND u.blacklisted=0
  ) <= 1
BEGIN
  SELECT RAISE(ABORT, 'Cannot remove the last active SUPER_ADMIN');
END;

CREATE TRIGGER prevent_last_super_admin_restriction
BEFORE UPDATE OF account_status,blacklisted ON users
FOR EACH ROW
WHEN
  EXISTS(SELECT 1 FROM user_permissions p WHERE p.user_id=OLD.id AND p.role='SUPER_ADMIN')
  AND OLD.account_status='ACTIVE'
  AND OLD.blacklisted=0
  AND (NEW.account_status<>'ACTIVE' OR NEW.blacklisted<>0)
  AND (
    SELECT COUNT(*)
    FROM user_permissions p
    JOIN users u ON u.id=p.user_id
    WHERE p.role='SUPER_ADMIN' AND u.account_status='ACTIVE' AND u.blacklisted=0
  ) <= 1
BEGIN
  SELECT RAISE(ABORT, 'Cannot restrict the last active SUPER_ADMIN');
END;
