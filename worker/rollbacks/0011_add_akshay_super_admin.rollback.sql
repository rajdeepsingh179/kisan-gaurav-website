-- Remove the administrator permission while retaining the user account and
-- any Google provider link it may acquire after the forward migration.

DELETE FROM user_permissions
WHERE user_id = (
  SELECT id
  FROM users
  WHERE email = 'akshayyr22@gmail.com'
);
