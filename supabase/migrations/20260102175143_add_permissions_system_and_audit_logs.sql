/*
  # Add Permissions System and Audit Logs
  
  1. Permissions Tables
    - `permissions` - All system permissions
    - `role_permissions` - Default role permissions
    - `user_permissions` - User-specific overrides
  
  2. New Functions
    - `suspend_tenant` - Suspend tenant account
    - `activate_tenant` - Activate tenant account
    - `has_permission_v2` - Check user permissions
  
  3. Audit Logs
    - `platform_audit_logs` - Platform operations tracking
  
  4. Security
    - RLS policies for all tables
*/

-- =====================================================
-- 1. PERMISSIONS TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  allowed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role, permission_key)
);

CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  effect TEXT NOT NULL CHECK (effect IN ('grant', 'deny')),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, permission_key, tenant_id)
);

-- Add foreign key after permissions table is created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'role_permissions_permission_key_fkey'
  ) THEN
    ALTER TABLE role_permissions 
    ADD CONSTRAINT role_permissions_permission_key_fkey 
    FOREIGN KEY (permission_key) REFERENCES permissions(key) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_permissions_permission_key_fkey'
  ) THEN
    ALTER TABLE user_permissions 
    ADD CONSTRAINT user_permissions_permission_key_fkey 
    FOREIGN KEY (permission_key) REFERENCES permissions(key) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Everyone can view permissions" ON permissions;
DROP POLICY IF EXISTS "Platform admins can manage permissions" ON permissions;
DROP POLICY IF EXISTS "Everyone can view role permissions" ON role_permissions;
DROP POLICY IF EXISTS "Platform admins can manage role permissions" ON role_permissions;
DROP POLICY IF EXISTS "Users can view their permissions" ON user_permissions;
DROP POLICY IF EXISTS "Platform admins can manage user permissions" ON user_permissions;

-- Create RLS Policies
CREATE POLICY "Everyone can view permissions" 
  ON permissions FOR SELECT 
  USING (true);

CREATE POLICY "Platform admins can manage permissions" 
  ON permissions FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('platform_owner', 'platform_admin')
    )
  );

CREATE POLICY "Everyone can view role permissions" 
  ON role_permissions FOR SELECT 
  USING (true);

CREATE POLICY "Platform admins can manage role permissions" 
  ON role_permissions FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('platform_owner', 'platform_admin')
    )
  );

CREATE POLICY "Users can view their permissions" 
  ON user_permissions FOR SELECT 
  USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('platform_owner', 'platform_admin')
    )
  );

CREATE POLICY "Platform admins can manage user permissions" 
  ON user_permissions FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('platform_owner', 'platform_admin')
    )
  );

-- =====================================================
-- 2. INSERT PERMISSIONS
-- =====================================================

INSERT INTO permissions (key, name, name_ar, category, description) VALUES
  -- Platform Owner permissions
  ('platform.view_all_tenants', 'View All Tenants', 'عرض جميع المستأجرين', 'platform', 'View all tenant accounts'),
  ('platform.manage_tenants', 'Manage Tenants', 'إدارة المستأجرين', 'platform', 'Create, edit, suspend tenants'),
  ('platform.create_tenant', 'Create Tenant', 'إنشاء مستأجر', 'platform', 'Create new tenant accounts'),
  ('platform.delete_tenant', 'Delete Tenant', 'حذف مستأجر', 'platform', 'Delete tenant accounts'),
  ('platform.suspend_tenant', 'Suspend Tenant', 'تعليق مستأجر', 'platform', 'Suspend tenant subscriptions'),
  ('platform.manage_subscriptions', 'Manage Subscriptions', 'إدارة الاشتراكات', 'platform', 'Manage tenant subscriptions'),
  ('platform.manage_plans', 'Manage Plans', 'إدارة الخطط', 'platform', 'Create and edit subscription plans'),
  ('platform.view_financials', 'View Financials', 'عرض المالية', 'platform', 'View financial data'),
  ('platform.manage_invoices', 'Manage Invoices', 'إدارة الفواتير', 'platform', 'Create and manage invoices'),
  ('platform.manage_payments', 'Manage Payments', 'إدارة المدفوعات', 'platform', 'Record and manage payments'),
  ('platform.impersonate_users', 'Impersonate Users', 'تسجيل دخول كمستخدم', 'platform', 'Login as any user'),
  ('platform.view_audit_logs', 'View Audit Logs', 'عرض سجل التدقيق', 'platform', 'View platform audit logs'),
  ('platform.manage_platform_settings', 'Manage Platform Settings', 'إدارة إعدادات المنصة', 'platform', 'Configure platform settings'),
  ('platform.access_advanced_analytics', 'Access Advanced Analytics', 'الوصول للتحليلات المتقدمة', 'platform', 'View advanced analytics'),
  
  -- Tenant Admin permissions
  ('tenants.manage_users', 'Manage Users', 'إدارة المستخدمين', 'tenants', 'Create and manage users'),
  ('tenants.manage_roles', 'Manage Roles', 'إدارة الأدوار', 'tenants', 'Assign roles to users'),
  ('tenants.view_subscription', 'View Subscription', 'عرض الاشتراك', 'tenants', 'View subscription details'),
  ('tenants.manage_modules', 'Manage Modules', 'إدارة الوحدات', 'tenants', 'Enable/disable modules'),
  ('tenants.customize_workflows', 'Customize Workflows', 'تخصيص التدفقات', 'tenants', 'Customize work order workflows'),
  
  -- Work Orders
  ('work_orders.view', 'View Work Orders', 'عرض أوامر العمل', 'work_orders', 'View work orders'),
  ('work_orders.create', 'Create Work Orders', 'إنشاء أوامر العمل', 'work_orders', 'Create work orders'),
  ('work_orders.manage', 'Manage Work Orders', 'إدارة أوامر العمل', 'work_orders', 'Edit and delete work orders'),
  ('work_orders.assign', 'Assign Work Orders', 'تعيين أوامر العمل', 'work_orders', 'Assign to technicians'),
  ('work_orders.approve', 'Approve Work Orders', 'اعتماد أوامر العمل', 'work_orders', 'Approve completion'),
  
  -- Assets
  ('assets.view', 'View Assets', 'عرض الأصول', 'assets', 'View assets'),
  ('assets.manage', 'Manage Assets', 'إدارة الأصول', 'assets', 'Create, edit, delete assets'),
  ('assets.export', 'Export Assets', 'تصدير الأصول', 'assets', 'Export asset data'),
  
  -- Facilities
  ('facilities.view', 'View Facilities', 'عرض المرافق', 'facilities', 'View facilities'),
  ('facilities.manage', 'Manage Facilities', 'إدارة المرافق', 'facilities', 'Manage facilities'),
  
  -- Maintenance
  ('maintenance.view', 'View Maintenance', 'عرض الصيانة', 'maintenance', 'View maintenance plans'),
  ('maintenance.manage', 'Manage Maintenance', 'إدارة الصيانة', 'maintenance', 'Manage maintenance plans'),
  ('maintenance.execute', 'Execute Maintenance', 'تنفيذ الصيانة', 'maintenance', 'Perform maintenance'),
  
  -- Teams
  ('teams.view', 'View Teams', 'عرض الفرق', 'teams', 'View teams'),
  ('teams.manage', 'Manage Teams', 'إدارة الفرق', 'teams', 'Manage teams'),
  
  -- Inventory
  ('inventory.view', 'View Inventory', 'عرض المخزون', 'inventory', 'View inventory'),
  ('inventory.manage', 'Manage Inventory', 'إدارة المخزون', 'inventory', 'Manage inventory'),
  ('inventory.transactions', 'Inventory Transactions', 'عمليات المخزون', 'inventory', 'Record transactions'),
  
  -- Analytics
  ('analytics.view', 'View Analytics', 'عرض التحليلات', 'analytics', 'View analytics'),
  ('analytics.export', 'Export Analytics', 'تصدير التحليلات', 'analytics', 'Export reports'),
  
  -- Operations Log
  ('operations_log.view', 'View Operations Log', 'عرض سجل العمليات', 'operations', 'View operations log'),
  ('operations_log.manage', 'Manage Operations Log', 'إدارة سجل العمليات', 'operations', 'Create operations log'),
  
  -- Settings
  ('settings.access', 'Access Settings', 'الوصول للإعدادات', 'settings', 'Access settings'),
  ('settings.manage', 'Manage Settings', 'إدارة الإعدادات', 'settings', 'Manage system settings')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 3. INSERT ROLE PERMISSIONS
-- =====================================================

INSERT INTO role_permissions (role, permission_key, allowed) VALUES
  -- Platform Owner - all platform permissions
  ('platform_owner', 'platform.view_all_tenants', true),
  ('platform_owner', 'platform.manage_tenants', true),
  ('platform_owner', 'platform.create_tenant', true),
  ('platform_owner', 'platform.delete_tenant', true),
  ('platform_owner', 'platform.suspend_tenant', true),
  ('platform_owner', 'platform.manage_subscriptions', true),
  ('platform_owner', 'platform.manage_plans', true),
  ('platform_owner', 'platform.view_financials', true),
  ('platform_owner', 'platform.manage_invoices', true),
  ('platform_owner', 'platform.manage_payments', true),
  ('platform_owner', 'platform.impersonate_users', true),
  ('platform_owner', 'platform.view_audit_logs', true),
  ('platform_owner', 'platform.manage_platform_settings', true),
  ('platform_owner', 'platform.access_advanced_analytics', true),
  
  -- Platform Admin
  ('platform_admin', 'platform.view_all_tenants', true),
  ('platform_admin', 'platform.manage_tenants', true),
  ('platform_admin', 'platform.create_tenant', true),
  ('platform_admin', 'platform.suspend_tenant', true),
  ('platform_admin', 'platform.manage_subscriptions', true),
  ('platform_admin', 'platform.view_financials', true),
  ('platform_admin', 'platform.manage_invoices', true),
  ('platform_admin', 'platform.manage_payments', true),
  ('platform_admin', 'platform.view_audit_logs', true),
  
  -- Platform Support
  ('platform_support', 'platform.view_all_tenants', true),
  ('platform_support', 'platform.impersonate_users', true),
  ('platform_support', 'platform.view_audit_logs', true),
  
  -- Platform Accountant
  ('platform_accountant', 'platform.view_all_tenants', true),
  ('platform_accountant', 'platform.view_financials', true),
  ('platform_accountant', 'platform.manage_invoices', true),
  ('platform_accountant', 'platform.manage_payments', true),
  
  -- Tenant Admin
  ('admin', 'tenants.manage_users', true),
  ('admin', 'tenants.manage_roles', true),
  ('admin', 'tenants.view_subscription', true),
  ('admin', 'tenants.manage_modules', true),
  ('admin', 'work_orders.view', true),
  ('admin', 'work_orders.create', true),
  ('admin', 'work_orders.manage', true),
  ('admin', 'work_orders.assign', true),
  ('admin', 'work_orders.approve', true),
  ('admin', 'assets.view', true),
  ('admin', 'assets.manage', true),
  ('admin', 'facilities.view', true),
  ('admin', 'facilities.manage', true),
  ('admin', 'maintenance.view', true),
  ('admin', 'maintenance.manage', true),
  ('admin', 'teams.view', true),
  ('admin', 'teams.manage', true),
  ('admin', 'inventory.view', true),
  ('admin', 'inventory.manage', true),
  ('admin', 'analytics.view', true),
  ('admin', 'settings.access', true),
  ('admin', 'settings.manage', true),
  
  -- Owner (same as admin for tenant level)
  ('owner', 'tenants.manage_users', true),
  ('owner', 'tenants.manage_roles', true),
  ('owner', 'tenants.view_subscription', true),
  ('owner', 'work_orders.view', true),
  ('owner', 'work_orders.create', true),
  ('owner', 'work_orders.manage', true),
  ('owner', 'assets.view', true),
  ('owner', 'assets.manage', true),
  ('owner', 'analytics.view', true),
  
  -- Technician
  ('technician', 'work_orders.view', true),
  ('technician', 'work_orders.create', true),
  ('technician', 'assets.view', true),
  ('technician', 'maintenance.view', true),
  ('technician', 'maintenance.execute', true),
  ('technician', 'operations_log.view', true),
  ('technician', 'operations_log.manage', true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- =====================================================
-- 4. TENANT MANAGEMENT FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION suspend_tenant(
  tenant_uuid UUID,
  reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only platform owner/admin can suspend
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('platform_owner', 'platform_admin')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  UPDATE tenants
  SET 
    subscription_status = 'suspended',
    suspended_at = now(),
    suspended_by = auth.uid(),
    suspension_reason = reason,
    updated_at = now()
  WHERE id = tenant_uuid;
  
  -- Log to audit if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_audit_logs') THEN
    INSERT INTO platform_audit_logs (
      action,
      resource_type,
      resource_id,
      performed_by,
      details
    ) VALUES (
      'suspend_tenant',
      'tenant',
      tenant_uuid,
      auth.uid(),
      jsonb_build_object('reason', reason)
    );
  END IF;
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION activate_tenant(tenant_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only platform owner/admin can activate
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('platform_owner', 'platform_admin')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  UPDATE tenants
  SET 
    subscription_status = 'active',
    suspended_at = NULL,
    suspended_by = NULL,
    suspension_reason = NULL,
    updated_at = now()
  WHERE id = tenant_uuid;
  
  -- Log to audit if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_audit_logs') THEN
    INSERT INTO platform_audit_logs (
      action,
      resource_type,
      resource_id,
      performed_by
    ) VALUES (
      'activate_tenant',
      'tenant',
      tenant_uuid,
      auth.uid()
    );
  END IF;
  
  RETURN true;
END;
$$;

-- =====================================================
-- 5. PERMISSION CHECK FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION has_permission_v2(
  user_uuid UUID,
  permission_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  has_perm BOOLEAN;
  user_effect TEXT;
BEGIN
  -- Get user role
  SELECT role INTO user_role
  FROM profiles
  WHERE id = user_uuid;
  
  IF user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check for explicit deny
  SELECT effect INTO user_effect
  FROM user_permissions
  WHERE user_id = user_uuid
  AND permission_key = has_permission_v2.permission_key
  AND effect = 'deny'
  LIMIT 1;
  
  IF user_effect = 'deny' THEN
    RETURN false;
  END IF;
  
  -- Check for explicit grant
  SELECT effect INTO user_effect
  FROM user_permissions
  WHERE user_id = user_uuid
  AND permission_key = has_permission_v2.permission_key
  AND effect = 'grant'
  LIMIT 1;
  
  IF user_effect = 'grant' THEN
    RETURN true;
  END IF;
  
  -- Check role permissions
  SELECT EXISTS (
    SELECT 1
    FROM role_permissions
    WHERE role = user_role
    AND permission_key = has_permission_v2.permission_key
    AND allowed = true
  ) INTO has_perm;
  
  RETURN has_perm;
END;
$$;

-- =====================================================
-- 6. AUDIT LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS platform_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  performed_by UUID REFERENCES auth.users(id),
  ip_address TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE platform_audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Platform admins can view audit logs" ON platform_audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON platform_audit_logs;

-- Create RLS Policies
CREATE POLICY "Platform admins can view audit logs" 
  ON platform_audit_logs FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('platform_owner', 'platform_admin', 'platform_support')
    )
  );

CREATE POLICY "System can insert audit logs" 
  ON platform_audit_logs FOR INSERT 
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON platform_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON platform_audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON platform_audit_logs(performed_by);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE permissions IS 'System-wide permissions for platform and tenant operations';
COMMENT ON TABLE role_permissions IS 'Default permissions assigned to each role';
COMMENT ON TABLE user_permissions IS 'User-specific permission overrides';
COMMENT ON TABLE platform_audit_logs IS 'Audit trail for platform-level operations';

COMMENT ON FUNCTION suspend_tenant IS 'Suspend a tenant account';
COMMENT ON FUNCTION activate_tenant IS 'Activate a suspended tenant';
COMMENT ON FUNCTION has_permission_v2 IS 'Check if user has specific permission';
