-- Create permissions table
CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  category text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create role_permissions table (base permissions per role)
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  allowed boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(role, permission_key)
);

-- Create user_permissions table (per-user overrides)
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  effect text NOT NULL CHECK (effect IN ('grant', 'deny')),
  hospital_id uuid REFERENCES public.hospitals(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission_key, hospital_id)
);

-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for permissions table
CREATE POLICY "Everyone can view permissions"
  ON public.permissions FOR SELECT
  USING (true);

CREATE POLICY "Global admins can manage permissions"
  ON public.permissions FOR ALL
  USING (has_role(auth.uid(), 'global_admin'));

-- RLS Policies for role_permissions
CREATE POLICY "Everyone can view role permissions"
  ON public.role_permissions FOR SELECT
  USING (true);

CREATE POLICY "Global admins can manage role permissions"
  ON public.role_permissions FOR ALL
  USING (has_role(auth.uid(), 'global_admin'));

-- RLS Policies for user_permissions
CREATE POLICY "Users can view their own permissions"
  ON public.user_permissions FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'global_admin') OR 
    (hospital_id = get_user_hospital(auth.uid()) AND 
     (has_role(auth.uid(), 'hospital_admin') OR has_role(auth.uid(), 'facility_manager'))));

CREATE POLICY "Global admins can manage all user permissions"
  ON public.user_permissions FOR ALL
  USING (has_role(auth.uid(), 'global_admin'));

CREATE POLICY "Hospital admins can manage user permissions in their hospital"
  ON public.user_permissions FOR ALL
  USING (hospital_id = get_user_hospital(auth.uid()) AND 
    (has_role(auth.uid(), 'hospital_admin') OR has_role(auth.uid(), 'facility_manager')));

-- Create has_permission function
CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id uuid,
  _permission_key text,
  _hospital_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _has_permission boolean := false;
  _user_override text;
BEGIN
  -- Check for explicit DENY override (highest priority)
  SELECT effect INTO _user_override
  FROM public.user_permissions
  WHERE user_id = _user_id
    AND permission_key = _permission_key
    AND (hospital_id = _hospital_id OR (hospital_id IS NULL AND _hospital_id IS NULL))
    AND effect = 'deny'
  LIMIT 1;
  
  IF _user_override = 'deny' THEN
    RETURN false;
  END IF;

  -- Check for explicit GRANT override
  SELECT effect INTO _user_override
  FROM public.user_permissions
  WHERE user_id = _user_id
    AND permission_key = _permission_key
    AND (hospital_id = _hospital_id OR (hospital_id IS NULL AND _hospital_id IS NULL))
    AND effect = 'grant'
  LIMIT 1;
  
  IF _user_override = 'grant' THEN
    RETURN true;
  END IF;

  -- Check base role permissions
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id
      AND rp.permission_key = _permission_key
      AND rp.allowed = true
  ) INTO _has_permission;

  RETURN _has_permission;
END;
$$;

-- Seed initial permissions
INSERT INTO public.permissions (key, name, name_ar, category, description) VALUES
  -- Admin permissions
  ('manage_hospitals', 'Manage Hospitals', 'إدارة المستشفيات', 'admin', 'Create, edit, and delete hospitals'),
  ('manage_users', 'Manage Users', 'إدارة المستخدمين', 'admin', 'Create, edit users and assign roles'),
  ('manage_roles', 'Manage Roles', 'إدارة الأدوار', 'admin', 'Assign and modify user roles'),
  ('manage_permissions', 'Manage Permissions', 'إدارة الصلاحيات', 'admin', 'Configure role and user permissions'),
  
  -- Work Orders permissions
  ('view_work_orders', 'View Work Orders', 'عرض أوامر العمل', 'work_orders', 'View work orders'),
  ('create_work_orders', 'Create Work Orders', 'إنشاء أوامر العمل', 'work_orders', 'Create new work orders'),
  ('edit_work_orders', 'Edit Work Orders', 'تعديل أوامر العمل', 'work_orders', 'Edit existing work orders'),
  ('assign_work_orders', 'Assign Work Orders', 'تعيين أوامر العمل', 'work_orders', 'Assign work orders to technicians'),
  ('approve_work_orders', 'Approve Work Orders', 'اعتماد أوامر العمل', 'work_orders', 'Approve completed work orders'),
  ('delete_work_orders', 'Delete Work Orders', 'حذف أوامر العمل', 'work_orders', 'Delete work orders'),
  
  -- Assets permissions
  ('view_assets', 'View Assets', 'عرض الأصول', 'assets', 'View assets inventory'),
  ('manage_assets', 'Manage Assets', 'إدارة الأصول', 'assets', 'Create, edit, and delete assets'),
  ('export_assets', 'Export Assets', 'تصدير الأصول', 'assets', 'Export assets data'),
  
  -- Facilities permissions
  ('view_facilities', 'View Facilities', 'عرض المرافق', 'facilities', 'View buildings, floors, departments, rooms'),
  ('manage_facilities', 'Manage Facilities', 'إدارة المرافق', 'facilities', 'Create, edit facilities structure'),
  
  -- Maintenance Plans permissions
  ('view_maintenance_plans', 'View Maintenance Plans', 'عرض خطط الصيانة', 'maintenance', 'View maintenance plans'),
  ('manage_maintenance_plans', 'Manage Maintenance Plans', 'إدارة خطط الصيانة', 'maintenance', 'Create and edit maintenance plans'),
  ('execute_maintenance', 'Execute Maintenance', 'تنفيذ الصيانة', 'maintenance', 'Perform maintenance tasks'),
  
  -- Teams permissions
  ('view_teams', 'View Teams', 'عرض الفرق', 'teams', 'View maintenance teams'),
  ('manage_teams', 'Manage Teams', 'إدارة الفرق', 'teams', 'Create and manage teams'),
  
  -- Reports permissions
  ('view_reports', 'View Reports', 'عرض التقارير', 'reports', 'View reports and analytics'),
  ('export_reports', 'Export Reports', 'تصدير التقارير', 'reports', 'Export reports data'),
  ('view_analytics', 'View Analytics', 'عرض التحليلات', 'analytics', 'View analytics dashboards'),
  
  -- Operations Log permissions
  ('view_operations_log', 'View Operations Log', 'عرض سجل العمليات', 'operations', 'View operations log'),
  ('create_operations_log', 'Create Operations Log', 'إنشاء سجل عمليات', 'operations', 'Create operations log entries');

-- Seed role permissions (base permissions per role)
-- Global Admin: all permissions
INSERT INTO public.role_permissions (role, permission_key, allowed)
SELECT 'global_admin', key, true FROM public.permissions;

-- Hospital Admin: most permissions within hospital
INSERT INTO public.role_permissions (role, permission_key, allowed) VALUES
  ('hospital_admin', 'manage_users', true),
  ('hospital_admin', 'manage_roles', true),
  ('hospital_admin', 'view_work_orders', true),
  ('hospital_admin', 'create_work_orders', true),
  ('hospital_admin', 'edit_work_orders', true),
  ('hospital_admin', 'assign_work_orders', true),
  ('hospital_admin', 'approve_work_orders', true),
  ('hospital_admin', 'view_assets', true),
  ('hospital_admin', 'manage_assets', true),
  ('hospital_admin', 'export_assets', true),
  ('hospital_admin', 'view_facilities', true),
  ('hospital_admin', 'manage_facilities', true),
  ('hospital_admin', 'view_maintenance_plans', true),
  ('hospital_admin', 'manage_maintenance_plans', true),
  ('hospital_admin', 'view_teams', true),
  ('hospital_admin', 'manage_teams', true),
  ('hospital_admin', 'view_reports', true),
  ('hospital_admin', 'export_reports', true),
  ('hospital_admin', 'view_analytics', true),
  ('hospital_admin', 'view_operations_log', true);

-- Facility Manager
INSERT INTO public.role_permissions (role, permission_key, allowed) VALUES
  ('facility_manager', 'manage_users', true),
  ('facility_manager', 'view_work_orders', true),
  ('facility_manager', 'create_work_orders', true),
  ('facility_manager', 'edit_work_orders', true),
  ('facility_manager', 'assign_work_orders', true),
  ('facility_manager', 'approve_work_orders', true),
  ('facility_manager', 'view_assets', true),
  ('facility_manager', 'manage_assets', true),
  ('facility_manager', 'export_assets', true),
  ('facility_manager', 'view_facilities', true),
  ('facility_manager', 'manage_facilities', true),
  ('facility_manager', 'view_maintenance_plans', true),
  ('facility_manager', 'manage_maintenance_plans', true),
  ('facility_manager', 'view_teams', true),
  ('facility_manager', 'manage_teams', true),
  ('facility_manager', 'view_reports', true),
  ('facility_manager', 'export_reports', true),
  ('facility_manager', 'view_analytics', true),
  ('facility_manager', 'view_operations_log', true);

-- Maintenance Manager
INSERT INTO public.role_permissions (role, permission_key, allowed) VALUES
  ('maintenance_manager', 'view_work_orders', true),
  ('maintenance_manager', 'create_work_orders', true),
  ('maintenance_manager', 'edit_work_orders', true),
  ('maintenance_manager', 'assign_work_orders', true),
  ('maintenance_manager', 'approve_work_orders', true),
  ('maintenance_manager', 'view_assets', true),
  ('maintenance_manager', 'manage_assets', true),
  ('maintenance_manager', 'view_facilities', true),
  ('maintenance_manager', 'view_maintenance_plans', true),
  ('maintenance_manager', 'manage_maintenance_plans', true),
  ('maintenance_manager', 'execute_maintenance', true),
  ('maintenance_manager', 'view_teams', true),
  ('maintenance_manager', 'manage_teams', true),
  ('maintenance_manager', 'view_reports', true),
  ('maintenance_manager', 'view_operations_log', true),
  ('maintenance_manager', 'create_operations_log', true);

-- Supervisor
INSERT INTO public.role_permissions (role, permission_key, allowed) VALUES
  ('supervisor', 'view_work_orders', true),
  ('supervisor', 'create_work_orders', true),
  ('supervisor', 'edit_work_orders', true),
  ('supervisor', 'assign_work_orders', true),
  ('supervisor', 'view_assets', true),
  ('supervisor', 'view_facilities', true),
  ('supervisor', 'view_maintenance_plans', true),
  ('supervisor', 'execute_maintenance', true),
  ('supervisor', 'view_teams', true),
  ('supervisor', 'view_operations_log', true),
  ('supervisor', 'create_operations_log', true);

-- Technician
INSERT INTO public.role_permissions (role, permission_key, allowed) VALUES
  ('technician', 'view_work_orders', true),
  ('technician', 'edit_work_orders', true),
  ('technician', 'view_assets', true),
  ('technician', 'view_facilities', true),
  ('technician', 'view_maintenance_plans', true),
  ('technician', 'execute_maintenance', true),
  ('technician', 'view_operations_log', true),
  ('technician', 'create_operations_log', true);

-- Reporter
INSERT INTO public.role_permissions (role, permission_key, allowed) VALUES
  ('reporter', 'view_work_orders', true),
  ('reporter', 'create_work_orders', true),
  ('reporter', 'view_assets', true),
  ('reporter', 'view_facilities', true);

-- Add trigger for updated_at
CREATE TRIGGER update_permissions_updated_at
  BEFORE UPDATE ON public.permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();