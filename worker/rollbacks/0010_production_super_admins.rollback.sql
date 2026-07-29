-- Roll back only the role changes introduced by
-- 0010_production_super_admins.sql. Both users were CUSTOMERs without rows in
-- user_permissions before the forward migration.

DELETE FROM user_permissions
WHERE user_id IN (
  SELECT id
  FROM users
  WHERE email IN (
    'rajdeepsingh179@gmail.com',
    'sonichaudhary903@gmail.com'
  )
);

DROP TRIGGER IF EXISTS prevent_last_super_admin_demotion;
DROP TRIGGER IF EXISTS prevent_last_super_admin_removal;
