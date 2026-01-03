/*
  # Add Detailed Work Order Permissions
  
  ## Overview
  Adds granular permissions for work order workflow actions
  
  ## New Permissions Added
  - work_orders.start_work: Start working on assigned orders
  - work_orders.complete_work: Mark work as completed
  - work_orders.supervisor_approve: Supervisor approval step
  - work_orders.engineer_review: Engineering review step
  - work_orders.final_approve: Final approval by manager
  - work_orders.reject: Reject work orders
  - work_orders.reassign: Reassign to different technician/team
  - work_orders.cancel: Cancel work orders
  - work_orders.reopen: Reopen closed work orders
  
  ## Role Assignments
  Each role gets appropriate permissions based on their responsibilities
*/

-- Add new detailed work order permissions
INSERT INTO permissions (key, name, name_ar, category, description)
VALUES 
  ('work_orders.start_work', 'Start Work', 'بدء العمل', 'work_orders', 'Start working on assigned work orders'),
  ('work_orders.complete_work', 'Complete Work', 'إكمال العمل', 'work_orders', 'Mark work as completed'),
  ('work_orders.supervisor_approve', 'Supervisor Approval', 'موافقة المشرف', 'work_orders', 'Approve work as supervisor'),
  ('work_orders.engineer_review', 'Engineer Review', 'مراجعة المهندس', 'work_orders', 'Review work as engineer'),
  ('work_orders.final_approve', 'Final Approval', 'الموافقة النهائية', 'work_orders', 'Final approval for work orders'),
  ('work_orders.reject', 'Reject Work Order', 'رفض أمر العمل', 'work_orders', 'Reject work orders'),
  ('work_orders.reassign', 'Reassign Work Order', 'إعادة تعيين أمر العمل', 'work_orders', 'Reassign work orders to different users'),
  ('work_orders.cancel', 'Cancel Work Order', 'إلغاء أمر العمل', 'work_orders', 'Cancel work orders'),
  ('work_orders.reopen', 'Reopen Work Order', 'إعادة فتح أمر العمل', 'work_orders', 'Reopen closed work orders'),
  ('work_orders.view_all', 'View All Work Orders', 'عرض جميع أوامر العمل', 'work_orders', 'View all work orders regardless of assignment'),
  ('work_orders.view_team', 'View Team Work Orders', 'عرض أوامر عمل الفريق', 'work_orders', 'View work orders assigned to team'),
  ('work_orders.view_own', 'View Own Work Orders', 'عرض أوامر العمل الخاصة', 'work_orders', 'View only own work orders')
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description;

-- Add dashboard permissions
INSERT INTO permissions (key, name, name_ar, category, description)
VALUES 
  ('dashboard.executive', 'Executive Dashboard', 'لوحة تحكم تنفيذية', 'dashboard', 'Access executive-level dashboard'),
  ('dashboard.manager', 'Manager Dashboard', 'لوحة تحكم إدارية', 'dashboard', 'Access manager-level dashboard'),
  ('dashboard.technician', 'Technician Dashboard', 'لوحة تحكم فنية', 'dashboard', 'Access technician-level dashboard'),
  ('dashboard.reporter', 'Reporter Dashboard', 'لوحة تحكم المبلغ', 'dashboard', 'Access reporter-level dashboard')
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description;

-- Add user management permissions
INSERT INTO permissions (key, name, name_ar, category, description)
VALUES 
  ('users.view', 'View Users', 'عرض المستخدمين', 'users', 'View user list'),
  ('users.manage', 'Manage Users', 'إدارة المستخدمين', 'users', 'Create, edit, delete users'),
  ('users.assign_roles', 'Assign Roles', 'تعيين الأدوار', 'users', 'Assign roles to users'),
  ('users.deactivate', 'Deactivate Users', 'تعطيل المستخدمين', 'users', 'Deactivate user accounts')
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description;

-- Add role management permissions  
INSERT INTO permissions (key, name, name_ar, category, description)
VALUES 
  ('roles.view', 'View Roles', 'عرض الأدوار', 'roles', 'View role definitions'),
  ('roles.manage', 'Manage Roles', 'إدارة الأدوار', 'roles', 'Create and edit custom roles'),
  ('roles.assign_permissions', 'Assign Permissions', 'تعيين الصلاحيات', 'roles', 'Assign permissions to roles')
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description;

-- Assign new permissions to tenant_admin
INSERT INTO role_permissions (role, permission_key, allowed)
SELECT 'tenant_admin', key, true FROM permissions 
WHERE key IN (
  'work_orders.start_work', 'work_orders.complete_work', 'work_orders.supervisor_approve',
  'work_orders.engineer_review', 'work_orders.final_approve', 'work_orders.reject',
  'work_orders.reassign', 'work_orders.cancel', 'work_orders.reopen', 'work_orders.view_all',
  'dashboard.executive', 'dashboard.manager',
  'users.view', 'users.manage', 'users.assign_roles', 'users.deactivate',
  'roles.view', 'roles.manage', 'roles.assign_permissions'
)
ON CONFLICT DO NOTHING;

-- Assign permissions to facility_manager
INSERT INTO role_permissions (role, permission_key, allowed)
SELECT 'facility_manager', key, true FROM permissions 
WHERE key IN (
  'work_orders.supervisor_approve', 'work_orders.final_approve', 'work_orders.reject',
  'work_orders.reassign', 'work_orders.view_all',
  'dashboard.executive', 'dashboard.manager',
  'users.view'
)
ON CONFLICT DO NOTHING;

-- Assign permissions to maintenance_manager
INSERT INTO role_permissions (role, permission_key, allowed)
SELECT 'maintenance_manager', key, true FROM permissions 
WHERE key IN (
  'work_orders.supervisor_approve', 'work_orders.engineer_review', 'work_orders.final_approve',
  'work_orders.reject', 'work_orders.reassign', 'work_orders.cancel', 'work_orders.reopen',
  'work_orders.view_all',
  'dashboard.executive', 'dashboard.manager',
  'users.view', 'users.manage', 'users.assign_roles'
)
ON CONFLICT DO NOTHING;

-- Assign permissions to engineer
INSERT INTO role_permissions (role, permission_key, allowed)
SELECT 'engineer', key, true FROM permissions 
WHERE key IN (
  'work_orders.engineer_review', 'work_orders.reject', 'work_orders.reassign',
  'work_orders.view_all',
  'dashboard.manager'
)
ON CONFLICT DO NOTHING;

-- Assign permissions to supervisor
INSERT INTO role_permissions (role, permission_key, allowed)
SELECT 'supervisor', key, true FROM permissions 
WHERE key IN (
  'work_orders.start_work', 'work_orders.complete_work', 'work_orders.supervisor_approve',
  'work_orders.reject', 'work_orders.reassign', 'work_orders.view_team',
  'dashboard.technician'
)
ON CONFLICT DO NOTHING;

-- Assign permissions to technician
INSERT INTO role_permissions (role, permission_key, allowed)
SELECT 'technician', key, true FROM permissions 
WHERE key IN (
  'work_orders.start_work', 'work_orders.complete_work', 'work_orders.view_team',
  'dashboard.technician'
)
ON CONFLICT DO NOTHING;

-- Assign permissions to reporter
INSERT INTO role_permissions (role, permission_key, allowed)
SELECT 'reporter', key, true FROM permissions 
WHERE key IN (
  'work_orders.view_own',
  'dashboard.reporter'
)
ON CONFLICT DO NOTHING;

-- Update has_permission_v2 function to use new role system
CREATE OR REPLACE FUNCTION has_permission_v3(
  _user_id uuid, 
  _permission_key text, 
  _tenant_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_has_permission boolean := false;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = _user_id;
  
  IF v_profile.is_super_admin = true OR v_profile.role = 'platform_owner' THEN
    RETURN true;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM user_permissions 
    WHERE user_id = _user_id 
    AND permission_key = _permission_key 
    AND effect = 'deny'
    AND (tenant_id IS NULL OR tenant_id = _tenant_id)
  ) THEN
    RETURN false;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM user_permissions 
    WHERE user_id = _user_id 
    AND permission_key = _permission_key 
    AND effect = 'grant'
    AND (tenant_id IS NULL OR tenant_id = _tenant_id)
  ) THEN
    RETURN true;
  END IF;
  
  IF v_profile.role IN ('platform_admin', 'platform_support', 'platform_accountant') THEN
    IF EXISTS (
      SELECT 1 FROM role_permissions 
      WHERE role = v_profile.role 
      AND permission_key = _permission_key 
      AND allowed = true
    ) THEN
      RETURN true;
    END IF;
  END IF;
  
  IF _tenant_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM user_tenant_assignments uta
      INNER JOIN role_permissions rp ON rp.role = uta.role_code
      WHERE uta.user_id = _user_id 
      AND uta.tenant_id = _tenant_id 
      AND uta.is_active = true
      AND (uta.expires_at IS NULL OR uta.expires_at > now())
      AND rp.permission_key = _permission_key
      AND rp.allowed = true
    ) THEN
      RETURN true;
    END IF;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM user_roles ur
    INNER JOIN role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id 
    AND rp.permission_key = _permission_key
    AND rp.allowed = true
    AND (ur.hospital_id IS NULL OR ur.hospital_id = _tenant_id)
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Function to get user's effective permissions in a tenant
CREATE OR REPLACE FUNCTION get_user_effective_permissions(
  _user_id uuid,
  _tenant_id uuid DEFAULT NULL
)
RETURNS TABLE(permission_key text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = _user_id;
  
  IF v_profile.is_super_admin = true OR v_profile.role = 'platform_owner' THEN
    RETURN QUERY SELECT p.key FROM permissions p;
    RETURN;
  END IF;
  
  RETURN QUERY
  WITH denied AS (
    SELECT up.permission_key 
    FROM user_permissions up
    WHERE up.user_id = _user_id 
    AND up.effect = 'deny'
    AND (up.tenant_id IS NULL OR up.tenant_id = _tenant_id)
  ),
  granted AS (
    SELECT up.permission_key
    FROM user_permissions up
    WHERE up.user_id = _user_id 
    AND up.effect = 'grant'
    AND (up.tenant_id IS NULL OR up.tenant_id = _tenant_id)
    
    UNION
    
    SELECT rp.permission_key
    FROM role_permissions rp
    WHERE rp.role = v_profile.role
    AND rp.allowed = true
    
    UNION
    
    SELECT rp.permission_key
    FROM user_tenant_assignments uta
    INNER JOIN role_permissions rp ON rp.role = uta.role_code
    WHERE uta.user_id = _user_id 
    AND uta.tenant_id = _tenant_id 
    AND uta.is_active = true
    AND (uta.expires_at IS NULL OR uta.expires_at > now())
    AND rp.allowed = true
    
    UNION
    
    SELECT rp.permission_key
    FROM user_roles ur
    INNER JOIN role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id 
    AND (ur.hospital_id IS NULL OR ur.hospital_id = _tenant_id)
    AND rp.allowed = true
  )
  SELECT g.permission_key 
  FROM granted g
  WHERE g.permission_key NOT IN (SELECT d.permission_key FROM denied d);
END;
$$;
