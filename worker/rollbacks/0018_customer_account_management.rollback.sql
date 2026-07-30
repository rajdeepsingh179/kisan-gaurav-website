DROP TRIGGER IF EXISTS prevent_last_super_admin_restriction;
DROP TRIGGER IF EXISTS prevent_last_super_admin_demotion;
DROP TRIGGER IF EXISTS prevent_last_super_admin_removal;
DROP INDEX IF EXISTS idx_users_account_lifecycle;

ALTER TABLE users DROP COLUMN status_changed_by;
ALTER TABLE users DROP COLUMN status_changed_at;
ALTER TABLE users DROP COLUMN blacklisted_at;
ALTER TABLE users DROP COLUMN deleted_at;
ALTER TABLE users DROP COLUMN suspended_at;
ALTER TABLE users DROP COLUMN status_reason;
ALTER TABLE users DROP COLUMN blacklisted;
ALTER TABLE users DROP COLUMN account_status;

CREATE TRIGGER prevent_last_super_admin_demotion
BEFORE UPDATE OF role ON user_permissions
FOR EACH ROW
WHEN
  OLD.role = 'SUPER_ADMIN'
  AND NEW.role <> 'SUPER_ADMIN'
  AND (SELECT COUNT(*) FROM user_permissions WHERE role='SUPER_ADMIN') <= 1
BEGIN
  SELECT RAISE(ABORT, 'Cannot demote the last SUPER_ADMIN');
END;

CREATE TRIGGER prevent_last_super_admin_removal
BEFORE DELETE ON user_permissions
FOR EACH ROW
WHEN
  OLD.role = 'SUPER_ADMIN'
  AND (SELECT COUNT(*) FROM user_permissions WHERE role='SUPER_ADMIN') <= 1
BEGIN
  SELECT RAISE(ABORT, 'Cannot remove the last SUPER_ADMIN');
END;
