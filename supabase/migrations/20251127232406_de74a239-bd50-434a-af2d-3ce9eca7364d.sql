-- =====================================================
-- Fix: Update role_permissions to support both systems
-- Insert data in both 'role' (app_role enum) and 'role_code' columns
-- =====================================================

-- First, delete existing entries for the 8 core roles to avoid conflicts
DELETE FROM public.role_permissions 
WHERE role_code IN ('global_admin', 'hospital_admin', 'facility_manager', 'maintenance_manager', 'engineer', 'supervisor', 'technician', 'reporter');

-- =====================================================
-- Re-insert with both role and role_code populated
-- =====================================================

-- Global Admin: Full access
INSERT INTO public.role_permissions (role, role_code, permission_key, allowed) VALUES
('global_admin'::app_role, 'global_admin', 'facilities.view', true),
('global_admin'::app_role, 'global_admin', 'facilities.manage', true),
('global_admin'::app_role, 'global_admin', 'assets.view', true),
('global_admin'::app_role, 'global_admin', 'assets.manage', true),
('global_admin'::app_role, 'global_admin', 'assets.qr', true),
('global_admin'::app_role, 'global_admin', 'inventory.view', true),
('global_admin'::app_role, 'global_admin', 'inventory.manage', true),
('global_admin'::app_role, 'global_admin', 'inventory.transactions', true),
('global_admin'::app_role, 'global_admin', 'maintenance.view', true),
('global_admin'::app_role, 'global_admin', 'maintenance.manage', true),
('global_admin'::app_role, 'global_admin', 'maintenance.execute', true),
('global_admin'::app_role, 'global_admin', 'teams.view', true),
('global_admin'::app_role, 'global_admin', 'teams.manage', true),
('global_admin'::app_role, 'global_admin', 'operations_log.view', true),
('global_admin'::app_role, 'global_admin', 'operations_log.create', true),
('global_admin'::app_role, 'global_admin', 'users.view', true),
('global_admin'::app_role, 'global_admin', 'users.manage', true),
('global_admin'::app_role, 'global_admin', 'users.permissions', true),
('global_admin'::app_role, 'global_admin', 'settings.access', true),
('global_admin'::app_role, 'global_admin', 'settings.hospitals', true),
('global_admin'::app_role, 'global_admin', 'settings.roles', true),
('global_admin'::app_role, 'global_admin', 'settings.lookup_tables', true);

-- Hospital Admin
INSERT INTO public.role_permissions (role, role_code, permission_key, allowed) VALUES
('hospital_admin'::app_role, 'hospital_admin', 'facilities.view', true),
('hospital_admin'::app_role, 'hospital_admin', 'facilities.manage', true),
('hospital_admin'::app_role, 'hospital_admin', 'assets.view', true),
('hospital_admin'::app_role, 'hospital_admin', 'assets.manage', true),
('hospital_admin'::app_role, 'hospital_admin', 'assets.qr', true),
('hospital_admin'::app_role, 'hospital_admin', 'inventory.view', true),
('hospital_admin'::app_role, 'hospital_admin', 'inventory.manage', true),
('hospital_admin'::app_role, 'hospital_admin', 'inventory.transactions', true),
('hospital_admin'::app_role, 'hospital_admin', 'maintenance.view', true),
('hospital_admin'::app_role, 'hospital_admin', 'maintenance.manage', true),
('hospital_admin'::app_role, 'hospital_admin', 'maintenance.execute', true),
('hospital_admin'::app_role, 'hospital_admin', 'teams.view', true),
('hospital_admin'::app_role, 'hospital_admin', 'teams.manage', true),
('hospital_admin'::app_role, 'hospital_admin', 'operations_log.view', true),
('hospital_admin'::app_role, 'hospital_admin', 'operations_log.create', true),
('hospital_admin'::app_role, 'hospital_admin', 'users.view', true),
('hospital_admin'::app_role, 'hospital_admin', 'users.manage', true),
('hospital_admin'::app_role, 'hospital_admin', 'users.permissions', true);

-- Facility Manager
INSERT INTO public.role_permissions (role, role_code, permission_key, allowed) VALUES
('facility_manager'::app_role, 'facility_manager', 'facilities.view', true),
('facility_manager'::app_role, 'facility_manager', 'facilities.manage', true),
('facility_manager'::app_role, 'facility_manager', 'assets.view', true),
('facility_manager'::app_role, 'facility_manager', 'assets.manage', true),
('facility_manager'::app_role, 'facility_manager', 'assets.qr', true),
('facility_manager'::app_role, 'facility_manager', 'inventory.view', true),
('facility_manager'::app_role, 'facility_manager', 'inventory.manage', true),
('facility_manager'::app_role, 'facility_manager', 'inventory.transactions', true),
('facility_manager'::app_role, 'facility_manager', 'maintenance.view', true),
('facility_manager'::app_role, 'facility_manager', 'maintenance.manage', true),
('facility_manager'::app_role, 'facility_manager', 'teams.view', true),
('facility_manager'::app_role, 'facility_manager', 'teams.manage', true),
('facility_manager'::app_role, 'facility_manager', 'operations_log.view', true),
('facility_manager'::app_role, 'facility_manager', 'operations_log.create', true),
('facility_manager'::app_role, 'facility_manager', 'users.view', true);

-- Maintenance Manager
INSERT INTO public.role_permissions (role, role_code, permission_key, allowed) VALUES
('maintenance_manager'::app_role, 'maintenance_manager', 'facilities.view', true),
('maintenance_manager'::app_role, 'maintenance_manager', 'assets.view', true),
('maintenance_manager'::app_role, 'maintenance_manager', 'assets.manage', true),
('maintenance_manager'::app_role, 'maintenance_manager', 'assets.qr', true),
('maintenance_manager'::app_role, 'maintenance_manager', 'inventory.view', true),
('maintenance_manager'::app_role, 'maintenance_manager', 'inventory.manage', true),
('maintenance_manager'::app_role, 'maintenance_manager', 'inventory.transactions', true),
('maintenance_manager'::app_role, 'maintenance_manager', 'maintenance.view', true),
('maintenance_manager'::app_role, 'maintenance_manager', 'maintenance.manage', true),
('maintenance_manager'::app_role, 'maintenance_manager', 'maintenance.execute', true),
('maintenance_manager'::app_role, 'maintenance_manager', 'teams.view', true),
('maintenance_manager'::app_role, 'maintenance_manager', 'teams.manage', true),
('maintenance_manager'::app_role, 'maintenance_manager', 'operations_log.view', true),
('maintenance_manager'::app_role, 'maintenance_manager', 'operations_log.create', true),
('maintenance_manager'::app_role, 'maintenance_manager', 'users.view', true);

-- Engineer
INSERT INTO public.role_permissions (role, role_code, permission_key, allowed) VALUES
('engineer'::app_role, 'engineer', 'facilities.view', true),
('engineer'::app_role, 'engineer', 'assets.view', true),
('engineer'::app_role, 'engineer', 'inventory.view', true),
('engineer'::app_role, 'engineer', 'maintenance.view', true),
('engineer'::app_role, 'engineer', 'maintenance.execute', true),
('engineer'::app_role, 'engineer', 'teams.view', true),
('engineer'::app_role, 'engineer', 'operations_log.view', true),
('engineer'::app_role, 'engineer', 'operations_log.create', true);

-- Supervisor
INSERT INTO public.role_permissions (role, role_code, permission_key, allowed) VALUES
('supervisor'::app_role, 'supervisor', 'facilities.view', true),
('supervisor'::app_role, 'supervisor', 'assets.view', true),
('supervisor'::app_role, 'supervisor', 'inventory.view', true),
('supervisor'::app_role, 'supervisor', 'inventory.transactions', true),
('supervisor'::app_role, 'supervisor', 'maintenance.view', true),
('supervisor'::app_role, 'supervisor', 'maintenance.execute', true),
('supervisor'::app_role, 'supervisor', 'teams.view', true),
('supervisor'::app_role, 'supervisor', 'operations_log.view', true),
('supervisor'::app_role, 'supervisor', 'operations_log.create', true);

-- Technician
INSERT INTO public.role_permissions (role, role_code, permission_key, allowed) VALUES
('technician'::app_role, 'technician', 'facilities.view', true),
('technician'::app_role, 'technician', 'assets.view', true),
('technician'::app_role, 'technician', 'inventory.view', true),
('technician'::app_role, 'technician', 'inventory.transactions', true),
('technician'::app_role, 'technician', 'maintenance.view', true),
('technician'::app_role, 'technician', 'maintenance.execute', true),
('technician'::app_role, 'technician', 'operations_log.view', true),
('technician'::app_role, 'technician', 'operations_log.create', true);

-- Reporter
INSERT INTO public.role_permissions (role, role_code, permission_key, allowed) VALUES
('reporter'::app_role, 'reporter', 'facilities.view', true),
('reporter'::app_role, 'reporter', 'assets.view', true);