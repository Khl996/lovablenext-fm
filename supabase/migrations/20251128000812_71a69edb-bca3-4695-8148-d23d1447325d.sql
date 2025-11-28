
-- Fix role_code mismatch: 'eng' should be 'engineer'
UPDATE user_custom_roles
SET role_code = 'engineer'
WHERE role_code = 'eng';
