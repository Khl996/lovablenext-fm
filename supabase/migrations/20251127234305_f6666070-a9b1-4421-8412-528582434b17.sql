-- Add missing .view permissions for roles that have .manage but not .view
-- This ensures sidebar displays correctly for all roles

-- Maintenance Manager needs .view permissions
INSERT INTO role_permissions (permission_key, role_code, allowed)
SELECT 
  CASE 
    WHEN permission_key = 'assets.manage' THEN 'assets.view'
    WHEN permission_key = 'inventory.manage' THEN 'inventory.view'
    WHEN permission_key = 'maintenance.manage' THEN 'maintenance.view'
    WHEN permission_key = 'teams.manage' THEN 'teams.view'
  END,
  role_code,
  true
FROM role_permissions
WHERE role_code = 'maintenance_manager'
AND permission_key IN ('assets.manage', 'inventory.manage', 'maintenance.manage', 'teams.manage')
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp2 
  WHERE rp2.role_code = role_permissions.role_code
  AND rp2.permission_key = CASE 
    WHEN role_permissions.permission_key = 'assets.manage' THEN 'assets.view'
    WHEN role_permissions.permission_key = 'inventory.manage' THEN 'inventory.view'
    WHEN role_permissions.permission_key = 'maintenance.manage' THEN 'maintenance.view'
    WHEN role_permissions.permission_key = 'teams.manage' THEN 'teams.view'
  END
);

-- Hospital Admin needs .view permissions
INSERT INTO role_permissions (permission_key, role_code, allowed)
SELECT 
  CASE 
    WHEN permission_key = 'facilities.manage' THEN 'facilities.view'
    WHEN permission_key = 'assets.manage' THEN 'assets.view'
    WHEN permission_key = 'inventory.manage' THEN 'inventory.view'
    WHEN permission_key = 'teams.manage' THEN 'teams.view'
  END,
  role_code,
  true
FROM role_permissions
WHERE role_code = 'hospital_admin'
AND permission_key IN ('facilities.manage', 'assets.manage', 'inventory.manage', 'teams.manage')
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp2 
  WHERE rp2.role_code = role_permissions.role_code
  AND rp2.permission_key = CASE 
    WHEN role_permissions.permission_key = 'facilities.manage' THEN 'facilities.view'
    WHEN role_permissions.permission_key = 'assets.manage' THEN 'assets.view'
    WHEN role_permissions.permission_key = 'inventory.manage' THEN 'inventory.view'
    WHEN role_permissions.permission_key = 'teams.manage' THEN 'teams.view'
  END
);

-- Facility Manager needs .view permissions
INSERT INTO role_permissions (permission_key, role_code, allowed)
SELECT 
  CASE 
    WHEN permission_key = 'facilities.manage' THEN 'facilities.view'
    WHEN permission_key = 'assets.manage' THEN 'assets.view'
    WHEN permission_key = 'inventory.manage' THEN 'inventory.view'
    WHEN permission_key = 'teams.manage' THEN 'teams.view'
  END,
  role_code,
  true
FROM role_permissions
WHERE role_code = 'facility_manager'
AND permission_key IN ('facilities.manage', 'assets.manage', 'inventory.manage', 'teams.manage')
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp2 
  WHERE rp2.role_code = role_permissions.role_code
  AND rp2.permission_key = CASE 
    WHEN role_permissions.permission_key = 'facilities.manage' THEN 'facilities.view'
    WHEN role_permissions.permission_key = 'assets.manage' THEN 'assets.view'
    WHEN role_permissions.permission_key = 'inventory.manage' THEN 'inventory.view'
    WHEN role_permissions.permission_key = 'teams.manage' THEN 'teams.view'
  END
);

-- Global Admin should have ALL .view permissions
INSERT INTO role_permissions (permission_key, role_code, allowed)
SELECT DISTINCT p.key, 'global_admin', true
FROM permissions p
WHERE p.key LIKE '%.view'
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_code = 'global_admin'
  AND rp.permission_key = p.key
);
