-- =====================================================
-- PERMISSIONS SYSTEM: Initial Data Population
-- Step 1: Add unique constraints if not exist
-- Step 2: Insert permissions and role permissions
-- =====================================================

-- Add unique constraint on permissions.key if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'permissions_key_key'
  ) THEN
    ALTER TABLE public.permissions ADD CONSTRAINT permissions_key_key UNIQUE (key);
  END IF;
END $$;

-- Add unique constraint on role_permissions (role_code, permission_key) if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'role_permissions_role_code_permission_key_key'
  ) THEN
    ALTER TABLE public.role_permissions 
    ADD CONSTRAINT role_permissions_role_code_permission_key_key 
    UNIQUE (role_code, permission_key);
  END IF;
END $$;

-- =====================================================
-- Insert all permissions (excluding work orders)
-- =====================================================
INSERT INTO public.permissions (key, name, name_ar, category, description) VALUES
-- Facilities Module
('facilities.view', 'View Facilities', 'عرض المرافق', 'facilities', 'View buildings, floors, departments, and rooms'),
('facilities.manage', 'Manage Facilities', 'إدارة المرافق', 'facilities', 'Add, edit, and delete facilities'),

-- Assets Module
('assets.view', 'View Assets', 'عرض الأصول', 'assets', 'View asset list and details'),
('assets.manage', 'Manage Assets', 'إدارة الأصول', 'assets', 'Add, edit, and delete assets'),
('assets.qr', 'Generate QR Codes', 'إنشاء رموز QR', 'assets', 'Generate and print QR codes for assets'),

-- Inventory Module
('inventory.view', 'View Inventory', 'عرض المخزون', 'inventory', 'View inventory items and stock levels'),
('inventory.manage', 'Manage Inventory', 'إدارة المخزون', 'inventory', 'Add, edit, and delete inventory items'),
('inventory.transactions', 'Inventory Transactions', 'معاملات المخزون', 'inventory', 'Perform stock in/out transactions'),

-- Maintenance Module
('maintenance.view', 'View Maintenance', 'عرض الصيانة', 'maintenance', 'View maintenance plans and tasks'),
('maintenance.manage', 'Manage Maintenance', 'إدارة الصيانة', 'maintenance', 'Create and manage maintenance plans'),
('maintenance.execute', 'Execute Maintenance', 'تنفيذ الصيانة', 'maintenance', 'Execute and update maintenance tasks'),

-- Teams Module
('teams.view', 'View Teams', 'عرض الفرق', 'teams', 'View team information and members'),
('teams.manage', 'Manage Teams', 'إدارة الفرق', 'teams', 'Add, edit, and delete teams and members'),

-- Operations Log Module
('operations_log.view', 'View Operations Log', 'عرض سجل العمليات', 'operations_log', 'View all operational logs'),
('operations_log.create', 'Create Operations Log', 'إنشاء سجل عمليات', 'operations_log', 'Create new operational log entries'),

-- Users Module
('users.view', 'View Users', 'عرض المستخدمين', 'users', 'View user list and profiles'),
('users.manage', 'Manage Users', 'إدارة المستخدمين', 'users', 'Add, edit, and deactivate users'),
('users.permissions', 'Manage User Permissions', 'إدارة صلاحيات المستخدمين', 'users', 'Manage exceptional permissions for users'),

-- Settings Module
('settings.access', 'Access Settings', 'الوصول للإعدادات', 'settings', 'Access system settings and configuration'),
('settings.hospitals', 'Manage Hospitals', 'إدارة المستشفيات', 'settings', 'Add and manage hospitals'),
('settings.roles', 'Manage Roles & Permissions', 'إدارة الأدوار والصلاحيات', 'settings', 'Configure roles and permissions'),
('settings.lookup_tables', 'Manage Lookup Tables', 'إدارة جداول البحث', 'settings', 'Manage system lookup tables and codes')

ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- Default Role Permissions Matrix
-- =====================================================

-- Global Admin: Full access
INSERT INTO public.role_permissions (role_code, permission_key, allowed) VALUES
('global_admin', 'facilities.view', true),
('global_admin', 'facilities.manage', true),
('global_admin', 'assets.view', true),
('global_admin', 'assets.manage', true),
('global_admin', 'assets.qr', true),
('global_admin', 'inventory.view', true),
('global_admin', 'inventory.manage', true),
('global_admin', 'inventory.transactions', true),
('global_admin', 'maintenance.view', true),
('global_admin', 'maintenance.manage', true),
('global_admin', 'maintenance.execute', true),
('global_admin', 'teams.view', true),
('global_admin', 'teams.manage', true),
('global_admin', 'operations_log.view', true),
('global_admin', 'operations_log.create', true),
('global_admin', 'users.view', true),
('global_admin', 'users.manage', true),
('global_admin', 'users.permissions', true),
('global_admin', 'settings.access', true),
('global_admin', 'settings.hospitals', true),
('global_admin', 'settings.roles', true),
('global_admin', 'settings.lookup_tables', true)
ON CONFLICT (role_code, permission_key) DO NOTHING;

-- Hospital Admin
INSERT INTO public.role_permissions (role_code, permission_key, allowed) VALUES
('hospital_admin', 'facilities.view', true),
('hospital_admin', 'facilities.manage', true),
('hospital_admin', 'assets.view', true),
('hospital_admin', 'assets.manage', true),
('hospital_admin', 'assets.qr', true),
('hospital_admin', 'inventory.view', true),
('hospital_admin', 'inventory.manage', true),
('hospital_admin', 'inventory.transactions', true),
('hospital_admin', 'maintenance.view', true),
('hospital_admin', 'maintenance.manage', true),
('hospital_admin', 'maintenance.execute', true),
('hospital_admin', 'teams.view', true),
('hospital_admin', 'teams.manage', true),
('hospital_admin', 'operations_log.view', true),
('hospital_admin', 'operations_log.create', true),
('hospital_admin', 'users.view', true),
('hospital_admin', 'users.manage', true),
('hospital_admin', 'users.permissions', true)
ON CONFLICT (role_code, permission_key) DO NOTHING;

-- Facility Manager
INSERT INTO public.role_permissions (role_code, permission_key, allowed) VALUES
('facility_manager', 'facilities.view', true),
('facility_manager', 'facilities.manage', true),
('facility_manager', 'assets.view', true),
('facility_manager', 'assets.manage', true),
('facility_manager', 'assets.qr', true),
('facility_manager', 'inventory.view', true),
('facility_manager', 'inventory.manage', true),
('facility_manager', 'inventory.transactions', true),
('facility_manager', 'maintenance.view', true),
('facility_manager', 'maintenance.manage', true),
('facility_manager', 'teams.view', true),
('facility_manager', 'teams.manage', true),
('facility_manager', 'operations_log.view', true),
('facility_manager', 'operations_log.create', true),
('facility_manager', 'users.view', true)
ON CONFLICT (role_code, permission_key) DO NOTHING;

-- Maintenance Manager
INSERT INTO public.role_permissions (role_code, permission_key, allowed) VALUES
('maintenance_manager', 'facilities.view', true),
('maintenance_manager', 'assets.view', true),
('maintenance_manager', 'assets.manage', true),
('maintenance_manager', 'assets.qr', true),
('maintenance_manager', 'inventory.view', true),
('maintenance_manager', 'inventory.manage', true),
('maintenance_manager', 'inventory.transactions', true),
('maintenance_manager', 'maintenance.view', true),
('maintenance_manager', 'maintenance.manage', true),
('maintenance_manager', 'maintenance.execute', true),
('maintenance_manager', 'teams.view', true),
('maintenance_manager', 'teams.manage', true),
('maintenance_manager', 'operations_log.view', true),
('maintenance_manager', 'operations_log.create', true),
('maintenance_manager', 'users.view', true)
ON CONFLICT (role_code, permission_key) DO NOTHING;

-- Engineer
INSERT INTO public.role_permissions (role_code, permission_key, allowed) VALUES
('engineer', 'facilities.view', true),
('engineer', 'assets.view', true),
('engineer', 'inventory.view', true),
('engineer', 'maintenance.view', true),
('engineer', 'maintenance.execute', true),
('engineer', 'teams.view', true),
('engineer', 'operations_log.view', true),
('engineer', 'operations_log.create', true)
ON CONFLICT (role_code, permission_key) DO NOTHING;

-- Supervisor
INSERT INTO public.role_permissions (role_code, permission_key, allowed) VALUES
('supervisor', 'facilities.view', true),
('supervisor', 'assets.view', true),
('supervisor', 'inventory.view', true),
('supervisor', 'inventory.transactions', true),
('supervisor', 'maintenance.view', true),
('supervisor', 'maintenance.execute', true),
('supervisor', 'teams.view', true),
('supervisor', 'operations_log.view', true),
('supervisor', 'operations_log.create', true)
ON CONFLICT (role_code, permission_key) DO NOTHING;

-- Technician
INSERT INTO public.role_permissions (role_code, permission_key, allowed) VALUES
('technician', 'facilities.view', true),
('technician', 'assets.view', true),
('technician', 'inventory.view', true),
('technician', 'inventory.transactions', true),
('technician', 'maintenance.view', true),
('technician', 'maintenance.execute', true),
('technician', 'operations_log.view', true),
('technician', 'operations_log.create', true)
ON CONFLICT (role_code, permission_key) DO NOTHING;

-- Reporter
INSERT INTO public.role_permissions (role_code, permission_key, allowed) VALUES
('reporter', 'facilities.view', true),
('reporter', 'assets.view', true)
ON CONFLICT (role_code, permission_key) DO NOTHING;