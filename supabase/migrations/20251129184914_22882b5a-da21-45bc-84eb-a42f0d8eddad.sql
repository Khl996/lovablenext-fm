
-- Clean up duplicate permissions by removing old references and old keys

-- Step 1: Delete old permission references from role_permissions
DELETE FROM role_permissions 
WHERE permission_key IN (
  'manage_teams', 'view_teams', 
  'manage_facilities', 'view_facilities', 
  'manage_assets', 'view_assets', 
  'view_work_orders', 
  'view_operations_log'
);

-- Step 2: Delete old duplicate permissions from permissions table
DELETE FROM permissions 
WHERE key IN (
  'manage_teams', 'view_teams', 
  'manage_facilities', 'view_facilities', 
  'manage_assets', 'view_assets', 
  'view_work_orders', 
  'view_operations_log'
);
