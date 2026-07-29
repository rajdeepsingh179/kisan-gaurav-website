-- Production administrator role setup.
-- Idempotent: reapplying preserves the requested role assignments.

INSERT INTO user_permissions(user_id, role, updated_at)
SELECT id, 'SUPER_ADMIN', CURRENT_TIMESTAMP
FROM users
WHERE email = 'rajdeepsingh179@gmail.com'
ON CONFLICT(user_id) DO UPDATE SET
  role = 'SUPER_ADMIN',
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO user_permissions(user_id, role, updated_at)
SELECT id, 'SUPER_ADMIN', CURRENT_TIMESTAMP
FROM users
WHERE email = 'sonichaudhary903@gmail.com'
ON CONFLICT(user_id) DO UPDATE SET
  role = 'SUPER_ADMIN',
  updated_at = CURRENT_TIMESTAMP;

-- Preserve at least one SUPER_ADMIN even when roles are changed outside the
-- application. These guards cover demotion, permission deletion, and cascaded
-- deletion of the final SUPER_ADMIN user.
DROP TRIGGER IF EXISTS prevent_last_super_admin_demotion;
CREATE TRIGGER prevent_last_super_admin_demotion
BEFORE UPDATE OF role ON user_permissions
FOR EACH ROW
WHEN
  OLD.role = 'SUPER_ADMIN'
  AND NEW.role <> 'SUPER_ADMIN'
  AND (SELECT COUNT(*) FROM user_permissions WHERE role = 'SUPER_ADMIN') <= 1
BEGIN
  SELECT RAISE(ABORT, 'Cannot demote the last SUPER_ADMIN');
END;

DROP TRIGGER IF EXISTS prevent_last_super_admin_removal;
CREATE TRIGGER prevent_last_super_admin_removal
BEFORE DELETE ON user_permissions
FOR EACH ROW
WHEN
  OLD.role = 'SUPER_ADMIN'
  AND (SELECT COUNT(*) FROM user_permissions WHERE role = 'SUPER_ADMIN') <= 1
BEGIN
  SELECT RAISE(ABORT, 'Cannot remove the last SUPER_ADMIN');
END;
