-- Add missing admin permissions to permissions table
INSERT INTO permissions (key, name, name_ar, category, description)
VALUES 
  ('hospitals.view', 'View Hospitals', 'عرض المستشفيات', 'hospitals', 'View hospitals list'),
  ('hospitals.manage', 'Manage Hospitals', 'إدارة المستشفيات', 'hospitals', 'Create and manage hospitals'),
  ('companies.view', 'View Companies', 'عرض الشركات', 'companies', 'View companies list'),
  ('companies.manage', 'Manage Companies', 'إدارة الشركات', 'companies', 'Create and manage companies'),
  ('settings.role_permissions', 'Manage Role Permissions', 'إدارة صلاحيات الأدوار', 'settings', 'Access role permissions matrix'),
  ('settings.permissions_guide', 'View Permissions Guide', 'عرض دليل الصلاحيات', 'settings', 'View permissions documentation'),
  ('settings.locations', 'Manage Locations', 'إدارة المواقع', 'settings', 'Manage facility locations'),
  ('settings.issue_types', 'Manage Issue Types', 'إدارة أنواع البلاغات', 'settings', 'Manage issue type mappings'),
  ('settings.specializations', 'Manage Specializations', 'إدارة التخصصات', 'settings', 'Manage technical specializations')
ON CONFLICT (key) DO NOTHING;

-- Global Admin - full access (already has full access via bypass)

-- Hospital Admin - manage hospitals, companies, users, role permissions
INSERT INTO role_permissions (role_code, permission_key, allowed, hospital_id)
VALUES 
  ('hospital_admin', 'hospitals.view', true, NULL),
  ('hospital_admin', 'companies.view', true, NULL),
  ('hospital_admin', 'companies.manage', true, NULL),
  ('hospital_admin', 'settings.role_permissions', true, NULL),
  ('hospital_admin', 'settings.permissions_guide', true, NULL),
  ('hospital_admin', 'settings.locations', true, NULL),
  ('hospital_admin', 'settings.issue_types', true, NULL),
  ('hospital_admin', 'settings.specializations', true, NULL),
  ('hospital_admin', 'settings.lookup_tables', true, NULL)
ON CONFLICT DO NOTHING;

-- Facility Manager - view companies, manage locations and settings
INSERT INTO role_permissions (role_code, permission_key, allowed, hospital_id)
VALUES 
  ('facility_manager', 'companies.view', true, NULL),
  ('facility_manager', 'settings.permissions_guide', true, NULL),
  ('facility_manager', 'settings.locations', true, NULL),
  ('facility_manager', 'settings.issue_types', true, NULL),
  ('facility_manager', 'settings.specializations', true, NULL),
  ('facility_manager', 'settings.lookup_tables', true, NULL)
ON CONFLICT DO NOTHING;

-- Maintenance Manager - view companies, view permissions guide
INSERT INTO role_permissions (role_code, permission_key, allowed, hospital_id)
VALUES 
  ('maintenance_manager', 'companies.view', true, NULL),
  ('maintenance_manager', 'settings.permissions_guide', true, NULL)
ON CONFLICT DO NOTHING;

-- Supervisor - view permissions guide
INSERT INTO role_permissions (role_code, permission_key, allowed, hospital_id)
VALUES 
  ('supervisor', 'settings.permissions_guide', true, NULL)
ON CONFLICT DO NOTHING;