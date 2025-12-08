-- Add missing permissions to permissions table
INSERT INTO permissions (key, name, name_ar, category, description)
VALUES 
  ('sla.view', 'View SLA', 'عرض اتفاقيات مستوى الخدمة', 'sla', 'View SLA definitions and breaches'),
  ('sla.manage', 'Manage SLA', 'إدارة اتفاقيات مستوى الخدمة', 'sla', 'Create and manage SLA definitions'),
  ('costs.view', 'View Costs', 'عرض التكاليف', 'costs', 'View cost records'),
  ('costs.manage', 'Manage Costs', 'إدارة التكاليف', 'costs', 'Create and manage cost records')
ON CONFLICT (key) DO NOTHING;

-- Add permissions to role_permissions for appropriate roles (global defaults)
-- Hospital Admin - full access to all
INSERT INTO role_permissions (role_code, permission_key, allowed, hospital_id)
VALUES 
  ('hospital_admin', 'sla.view', true, NULL),
  ('hospital_admin', 'sla.manage', true, NULL),
  ('hospital_admin', 'costs.view', true, NULL),
  ('hospital_admin', 'costs.manage', true, NULL)
ON CONFLICT DO NOTHING;

-- Facility Manager - full access
INSERT INTO role_permissions (role_code, permission_key, allowed, hospital_id)
VALUES 
  ('facility_manager', 'sla.view', true, NULL),
  ('facility_manager', 'sla.manage', true, NULL),
  ('facility_manager', 'costs.view', true, NULL),
  ('facility_manager', 'costs.manage', true, NULL),
  ('facility_manager', 'calibration.view', true, NULL),
  ('facility_manager', 'calibration.manage', true, NULL),
  ('facility_manager', 'contracts.view', true, NULL),
  ('facility_manager', 'contracts.manage', true, NULL)
ON CONFLICT DO NOTHING;

-- Maintenance Manager - view SLA, manage costs
INSERT INTO role_permissions (role_code, permission_key, allowed, hospital_id)
VALUES 
  ('maintenance_manager', 'sla.view', true, NULL),
  ('maintenance_manager', 'costs.view', true, NULL),
  ('maintenance_manager', 'costs.manage', true, NULL),
  ('maintenance_manager', 'calibration.view', true, NULL),
  ('maintenance_manager', 'contracts.view', true, NULL)
ON CONFLICT DO NOTHING;

-- Engineer - view only
INSERT INTO role_permissions (role_code, permission_key, allowed, hospital_id)
VALUES 
  ('engineer', 'calibration.view', true, NULL),
  ('engineer', 'costs.view', true, NULL)
ON CONFLICT DO NOTHING;

-- Supervisor - view only
INSERT INTO role_permissions (role_code, permission_key, allowed, hospital_id)
VALUES 
  ('supervisor', 'costs.view', true, NULL)
ON CONFLICT DO NOTHING;