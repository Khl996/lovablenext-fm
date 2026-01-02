/*
  # Add Missing Permissions for Modules
  
  1. Permissions Added
    - Calibration module permissions (view, manage)
    - Contracts module permissions (view, manage)
    - SLA module permissions (view, manage)
    - Costs module permissions (view, manage)
  
  2. Role Assignments
    - Assign all new permissions to platform_owner role
  
  3. Security
    - Platform owners get full access to all modules
*/

-- Add calibration permissions to permissions table
INSERT INTO permissions (key, name, name_ar, category, description)
VALUES 
  ('calibration.view', 'View Calibration', 'عرض المعايرة', 'calibration', 'View calibration records'),
  ('calibration.manage', 'Manage Calibration', 'إدارة المعايرة', 'calibration', 'Manage calibration records')
ON CONFLICT (key) DO NOTHING;

-- Add contracts permissions to permissions table
INSERT INTO permissions (key, name, name_ar, category, description)
VALUES 
  ('contracts.view', 'View Contracts', 'عرض العقود', 'contracts', 'View contracts'),
  ('contracts.manage', 'Manage Contracts', 'إدارة العقود', 'contracts', 'Manage contracts')
ON CONFLICT (key) DO NOTHING;

-- Add SLA permissions to permissions table
INSERT INTO permissions (key, name, name_ar, category, description)
VALUES 
  ('sla.view', 'View SLA', 'عرض اتفاقيات الخدمة', 'sla', 'View SLA templates'),
  ('sla.manage', 'Manage SLA', 'إدارة اتفاقيات الخدمة', 'sla', 'Manage SLA templates')
ON CONFLICT (key) DO NOTHING;

-- Add costs permissions to permissions table
INSERT INTO permissions (key, name, name_ar, category, description)
VALUES 
  ('costs.view', 'View Costs', 'عرض التكاليف', 'costs', 'View costs and expenses'),
  ('costs.manage', 'Manage Costs', 'إدارة التكاليف', 'costs', 'Manage costs and expenses')
ON CONFLICT (key) DO NOTHING;

-- Now assign them to platform_owner in role_permissions
INSERT INTO role_permissions (role, permission_key, allowed)
VALUES 
  ('platform_owner', 'calibration.view', true),
  ('platform_owner', 'calibration.manage', true),
  ('platform_owner', 'contracts.view', true),
  ('platform_owner', 'contracts.manage', true),
  ('platform_owner', 'sla.view', true),
  ('platform_owner', 'sla.manage', true),
  ('platform_owner', 'costs.view', true),
  ('platform_owner', 'costs.manage', true)
ON CONFLICT (role, permission_key) DO UPDATE
  SET allowed = EXCLUDED.allowed;
