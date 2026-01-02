/*
  # Add Admin Permissions for Platform Owner
  
  1. Permissions Added
    - Hospitals management permissions
    - Companies management permissions
    - Users management permissions
    - Settings sub-permissions (role_permissions, locations, issue_types, specializations, lookup_tables)
  
  2. Role Assignments
    - Assign all new permissions to platform_owner role
*/

-- Add hospitals permissions
INSERT INTO permissions (key, name, name_ar, category, description)
VALUES 
  ('hospitals.view', 'View Hospitals', 'عرض المستشفيات', 'hospitals', 'View hospitals list'),
  ('hospitals.manage', 'Manage Hospitals', 'إدارة المستشفيات', 'hospitals', 'Create, update, delete hospitals')
ON CONFLICT (key) DO NOTHING;

-- Add companies permissions
INSERT INTO permissions (key, name, name_ar, category, description)
VALUES 
  ('companies.view', 'View Companies', 'عرض الشركات', 'companies', 'View companies list'),
  ('companies.manage', 'Manage Companies', 'إدارة الشركات', 'companies', 'Create, update, delete companies')
ON CONFLICT (key) DO NOTHING;

-- Add users permissions
INSERT INTO permissions (key, name, name_ar, category, description)
VALUES 
  ('users.view', 'View Users', 'عرض المستخدمين', 'users', 'View users list'),
  ('users.manage', 'Manage Users', 'إدارة المستخدمين', 'users', 'Create, update, delete users')
ON CONFLICT (key) DO NOTHING;

-- Add settings sub-permissions
INSERT INTO permissions (key, name, name_ar, category, description)
VALUES 
  ('settings.role_permissions', 'Manage Role Permissions', 'إدارة صلاحيات الأدوار', 'settings', 'Manage role permissions'),
  ('settings.locations', 'Manage Locations', 'إدارة المواقع', 'settings', 'Manage facility locations'),
  ('settings.issue_types', 'Manage Issue Types', 'إدارة أنواع البلاغات', 'settings', 'Manage issue types'),
  ('settings.specializations', 'Manage Specializations', 'إدارة التخصصات', 'settings', 'Manage technical specializations'),
  ('settings.lookup_tables', 'Manage Lookup Tables', 'إدارة الجداول المرجعية', 'settings', 'Manage lookup tables')
ON CONFLICT (key) DO NOTHING;

-- Assign all to platform_owner
INSERT INTO role_permissions (role, permission_key, allowed)
VALUES 
  ('platform_owner', 'hospitals.view', true),
  ('platform_owner', 'hospitals.manage', true),
  ('platform_owner', 'companies.view', true),
  ('platform_owner', 'companies.manage', true),
  ('platform_owner', 'users.view', true),
  ('platform_owner', 'users.manage', true),
  ('platform_owner', 'settings.role_permissions', true),
  ('platform_owner', 'settings.locations', true),
  ('platform_owner', 'settings.issue_types', true),
  ('platform_owner', 'settings.specializations', true),
  ('platform_owner', 'settings.lookup_tables', true)
ON CONFLICT (role, permission_key) DO UPDATE
  SET allowed = EXCLUDED.allowed;
