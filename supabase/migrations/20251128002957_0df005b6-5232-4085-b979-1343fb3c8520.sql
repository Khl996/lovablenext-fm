-- Update all 'eng' role_code to 'engineer' in role_permissions table
UPDATE role_permissions
SET role_code = 'engineer'
WHERE role_code = 'eng';