/*
  # Complete Role System Implementation
  
  ## Overview
  This migration establishes a comprehensive two-level role system:
  - Platform Level: Roles for managing the entire SaaS platform
  - Tenant/Organization Level: Roles for managing individual organizations
  
  ## Changes Made
  
  ### 1. New Roles Table Structure
  - Creates `platform_roles` table for platform-level role definitions
  - Creates `tenant_roles` table for tenant-level role definitions
  - Each role has: code, name (en/ar), description, level, is_system, is_custom
  
  ### 2. Platform-Level Roles Added
  - platform_owner: Full system control, can create other platform roles
  - platform_admin: Administrative access to all tenants
  - platform_support: Support access with limited modifications
  - platform_accountant: Financial data and billing access
  
  ### 3. Tenant-Level Roles Added
  - tenant_admin: Full control within their organization
  - maintenance_manager: Manages maintenance operations
  - facility_manager: Manages facilities and locations
  - engineer: Technical review and assessments
  - supervisor: Team supervision and work approval
  - technician: Executes maintenance work
  - reporter: Creates reports/tickets only
  
  ### 4. User-Tenant Assignments
  - Creates `user_tenant_assignments` table for linking users to tenants
  - Supports multiple roles per user per tenant
  - Allows platform admins to access specific tenants
  
  ### 5. Security
  - RLS enabled on all new tables
  - Platform roles viewable by platform admins only
  - Tenant roles viewable by assigned users
*/

-- Create enum for role levels
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_level') THEN
    CREATE TYPE role_level AS ENUM ('platform', 'tenant');
  END IF;
END $$;

-- Platform Roles Definition Table
CREATE TABLE IF NOT EXISTS platform_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  description text,
  description_ar text,
  is_system boolean DEFAULT true,
  can_be_deleted boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE platform_roles ENABLE ROW LEVEL SECURITY;

-- Tenant Roles Definition Table
CREATE TABLE IF NOT EXISTS tenant_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  description text,
  description_ar text,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  is_system boolean DEFAULT false,
  can_be_deleted boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(code, tenant_id)
);

ALTER TABLE tenant_roles ENABLE ROW LEVEL SECURITY;

-- User-Tenant Assignments (links users to tenants with specific roles)
CREATE TABLE IF NOT EXISTS user_tenant_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role_code text NOT NULL,
  is_primary boolean DEFAULT false,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tenant_id, role_code)
);

ALTER TABLE user_tenant_assignments ENABLE ROW LEVEL SECURITY;

-- Platform Admin Tenant Access (which tenants can platform admins access)
CREATE TABLE IF NOT EXISTS platform_admin_tenant_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  access_all boolean DEFAULT false,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

ALTER TABLE platform_admin_tenant_access ENABLE ROW LEVEL SECURITY;

-- Insert System Platform Roles
INSERT INTO platform_roles (code, name, name_ar, description, description_ar, is_system, can_be_deleted, display_order)
VALUES 
  ('platform_owner', 'Platform Owner', 'مالك المنصة', 
   'Full system control including creating platform roles and managing all aspects', 
   'تحكم كامل بالنظام بما في ذلك إنشاء أدوار المنصة وإدارة جميع الجوانب', 
   true, false, 1),
  ('platform_admin', 'Platform Administrator', 'مدير المنصة', 
   'Administrative access to all tenants and system settings', 
   'وصول إداري لجميع المستأجرين وإعدادات النظام', 
   true, false, 2),
  ('platform_support', 'Platform Support', 'دعم المنصة', 
   'Support access with ability to view and assist tenants', 
   'وصول الدعم مع القدرة على عرض ومساعدة المستأجرين', 
   true, false, 3),
  ('platform_accountant', 'Platform Accountant', 'محاسب المنصة', 
   'Access to financial data, invoices, and billing', 
   'الوصول إلى البيانات المالية والفواتير والفوترة', 
   true, false, 4)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar;

-- Insert System Tenant Roles (tenant_id = NULL means system default roles)
INSERT INTO tenant_roles (code, name, name_ar, description, description_ar, tenant_id, is_system, can_be_deleted, display_order)
VALUES 
  ('tenant_admin', 'Organization Admin', 'مدير المؤسسة', 
   'Full control within the organization including user and role management', 
   'تحكم كامل داخل المؤسسة بما في ذلك إدارة المستخدمين والأدوار', 
   NULL, true, false, 1),
  ('facility_manager', 'Facility Manager', 'مدير المرافق', 
   'Manages facilities, buildings, and locations', 
   'إدارة المرافق والمباني والمواقع', 
   NULL, true, false, 2),
  ('maintenance_manager', 'Maintenance Manager', 'مدير الصيانة', 
   'Manages maintenance operations, plans, and teams', 
   'إدارة عمليات الصيانة والخطط والفرق', 
   NULL, true, false, 3),
  ('engineer', 'Engineer', 'مهندس', 
   'Technical review, assessments, and engineering approval', 
   'المراجعة الفنية والتقييمات والموافقة الهندسية', 
   NULL, true, false, 4),
  ('supervisor', 'Supervisor', 'مشرف', 
   'Team supervision, work assignment, and approval', 
   'الإشراف على الفريق وتوزيع العمل والموافقة', 
   NULL, true, false, 5),
  ('technician', 'Technician', 'فني', 
   'Executes maintenance work and reports completion', 
   'تنفيذ أعمال الصيانة والإبلاغ عن الإنجاز', 
   NULL, true, false, 6),
  ('reporter', 'Reporter', 'مبلغ', 
   'Can create tickets/reports and view own submissions', 
   'يمكنه إنشاء البلاغات وعرض ما قدمه', 
   NULL, true, false, 7)
ON CONFLICT (code, tenant_id) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar;

-- Add tenant-level role permissions
INSERT INTO role_permissions (role, permission_key, allowed)
SELECT 'tenant_admin', key, true FROM permissions 
WHERE category NOT IN ('platform')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key, allowed)
SELECT 'facility_manager', key, true FROM permissions 
WHERE key IN (
  'facilities.view', 'facilities.manage',
  'assets.view', 'assets.manage', 'assets.export',
  'work_orders.view', 'work_orders.create', 'work_orders.assign', 'work_orders.approve',
  'maintenance.view', 'maintenance.manage',
  'teams.view',
  'inventory.view',
  'calibration.view',
  'operations_log.view',
  'analytics.view'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key, allowed)
SELECT 'maintenance_manager', key, true FROM permissions 
WHERE key IN (
  'facilities.view',
  'assets.view', 'assets.manage', 'assets.export',
  'work_orders.view', 'work_orders.create', 'work_orders.manage', 'work_orders.assign', 'work_orders.approve',
  'maintenance.view', 'maintenance.manage', 'maintenance.execute',
  'teams.view', 'teams.manage',
  'inventory.view', 'inventory.manage', 'inventory.transactions',
  'calibration.view', 'calibration.manage',
  'contracts.view',
  'sla.view',
  'costs.view', 'costs.manage',
  'operations_log.view', 'operations_log.manage',
  'analytics.view'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key, allowed)
SELECT 'engineer', key, true FROM permissions 
WHERE key IN (
  'facilities.view',
  'assets.view',
  'work_orders.view', 'work_orders.create',
  'maintenance.view',
  'teams.view',
  'inventory.view',
  'calibration.view',
  'operations_log.view',
  'analytics.view'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key, allowed)
SELECT 'supervisor', key, true FROM permissions 
WHERE key IN (
  'facilities.view',
  'assets.view',
  'work_orders.view', 'work_orders.create', 'work_orders.assign',
  'maintenance.view', 'maintenance.execute',
  'teams.view',
  'inventory.view', 'inventory.transactions',
  'operations_log.view'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key, allowed)
SELECT 'reporter', key, true FROM permissions 
WHERE key IN (
  'work_orders.create'
)
ON CONFLICT DO NOTHING;

-- RLS Policies for platform_roles
CREATE POLICY "Platform admins can view platform roles"
  ON platform_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.is_super_admin = true OR profiles.role IN ('platform_owner', 'platform_admin'))
    )
  );

CREATE POLICY "Platform owner can manage platform roles"
  ON platform_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'platform_owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'platform_owner'
    )
  );

-- RLS Policies for tenant_roles
CREATE POLICY "Users can view system tenant roles"
  ON tenant_roles FOR SELECT
  TO authenticated
  USING (tenant_id IS NULL OR tenant_id IN (
    SELECT tenant_id FROM user_tenant_assignments WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Tenant admins can manage custom roles"
  ON tenant_roles FOR ALL
  TO authenticated
  USING (
    tenant_id IS NOT NULL AND 
    is_system = false AND
    EXISTS (
      SELECT 1 FROM user_tenant_assignments 
      WHERE user_id = auth.uid() 
      AND tenant_id = tenant_roles.tenant_id 
      AND role_code = 'tenant_admin'
      AND is_active = true
    )
  )
  WITH CHECK (
    tenant_id IS NOT NULL AND 
    is_system = false AND
    EXISTS (
      SELECT 1 FROM user_tenant_assignments 
      WHERE user_id = auth.uid() 
      AND tenant_id = tenant_roles.tenant_id 
      AND role_code = 'tenant_admin'
      AND is_active = true
    )
  );

-- RLS Policies for user_tenant_assignments
CREATE POLICY "Users can view own assignments"
  ON user_tenant_assignments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Platform admins can view all assignments"
  ON user_tenant_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.is_super_admin = true OR profiles.role IN ('platform_owner', 'platform_admin'))
    )
  );

CREATE POLICY "Tenant admins can view tenant assignments"
  ON user_tenant_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_tenant_assignments uta
      WHERE uta.user_id = auth.uid() 
      AND uta.tenant_id = user_tenant_assignments.tenant_id 
      AND uta.role_code = 'tenant_admin'
      AND uta.is_active = true
    )
  );

CREATE POLICY "Platform admins can manage assignments"
  ON user_tenant_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.is_super_admin = true OR profiles.role IN ('platform_owner', 'platform_admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.is_super_admin = true OR profiles.role IN ('platform_owner', 'platform_admin'))
    )
  );

CREATE POLICY "Tenant admins can manage their tenant assignments"
  ON user_tenant_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenant_assignments uta
      WHERE uta.user_id = auth.uid() 
      AND uta.tenant_id = user_tenant_assignments.tenant_id 
      AND uta.role_code = 'tenant_admin'
      AND uta.is_active = true
    )
  );

CREATE POLICY "Tenant admins can update their tenant assignments"
  ON user_tenant_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_tenant_assignments uta
      WHERE uta.user_id = auth.uid() 
      AND uta.tenant_id = user_tenant_assignments.tenant_id 
      AND uta.role_code = 'tenant_admin'
      AND uta.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenant_assignments uta
      WHERE uta.user_id = auth.uid() 
      AND uta.tenant_id = user_tenant_assignments.tenant_id 
      AND uta.role_code = 'tenant_admin'
      AND uta.is_active = true
    )
  );

-- RLS Policies for platform_admin_tenant_access
CREATE POLICY "Platform admins can view own access"
  ON platform_admin_tenant_access FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'platform_owner'
    )
  );

CREATE POLICY "Platform owner can manage admin access"
  ON platform_admin_tenant_access FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'platform_owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'platform_owner'
    )
  );

-- Function to check if user has access to a tenant
CREATE OR REPLACE FUNCTION has_tenant_access(p_user_id uuid, p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  
  IF v_profile.is_super_admin = true OR v_profile.role = 'platform_owner' THEN
    RETURN true;
  END IF;
  
  IF v_profile.role IN ('platform_admin', 'platform_support') THEN
    IF EXISTS (
      SELECT 1 FROM platform_admin_tenant_access 
      WHERE user_id = p_user_id 
      AND (access_all = true OR tenant_id = p_tenant_id)
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    ) THEN
      RETURN true;
    END IF;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM user_tenant_assignments 
    WHERE user_id = p_user_id 
    AND tenant_id = p_tenant_id 
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Function to get user's role in a tenant
CREATE OR REPLACE FUNCTION get_user_tenant_roles(p_user_id uuid, p_tenant_id uuid)
RETURNS TABLE(role_code text, role_name text, role_name_ar text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uta.role_code,
    COALESCE(tr.name, uta.role_code) as role_name,
    COALESCE(tr.name_ar, uta.role_code) as role_name_ar
  FROM user_tenant_assignments uta
  LEFT JOIN tenant_roles tr ON tr.code = uta.role_code AND (tr.tenant_id IS NULL OR tr.tenant_id = p_tenant_id)
  WHERE uta.user_id = p_user_id 
  AND uta.tenant_id = p_tenant_id 
  AND uta.is_active = true
  AND (uta.expires_at IS NULL OR uta.expires_at > now());
END;
$$;

-- Function to get all tenants a user can access
CREATE OR REPLACE FUNCTION get_accessible_tenants(p_user_id uuid)
RETURNS TABLE(
  tenant_id uuid,
  tenant_name text,
  tenant_name_ar text,
  access_type text,
  roles text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  
  IF v_profile.is_super_admin = true OR v_profile.role = 'platform_owner' THEN
    RETURN QUERY
    SELECT 
      t.id as tenant_id,
      t.name as tenant_name,
      t.name_ar as tenant_name_ar,
      'platform_full'::text as access_type,
      ARRAY['all']::text[] as roles
    FROM tenants t
    WHERE t.status != 'deleted'
    ORDER BY t.name;
    RETURN;
  END IF;
  
  IF v_profile.role IN ('platform_admin', 'platform_support', 'platform_accountant') THEN
    IF EXISTS (SELECT 1 FROM platform_admin_tenant_access WHERE user_id = p_user_id AND access_all = true AND is_active = true) THEN
      RETURN QUERY
      SELECT 
        t.id as tenant_id,
        t.name as tenant_name,
        t.name_ar as tenant_name_ar,
        'platform_assigned'::text as access_type,
        ARRAY['all']::text[] as roles
      FROM tenants t
      WHERE t.status != 'deleted'
      ORDER BY t.name;
      RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
      t.id as tenant_id,
      t.name as tenant_name,
      t.name_ar as tenant_name_ar,
      'platform_assigned'::text as access_type,
      ARRAY['assigned']::text[] as roles
    FROM tenants t
    INNER JOIN platform_admin_tenant_access pata ON pata.tenant_id = t.id
    WHERE pata.user_id = p_user_id 
    AND pata.is_active = true
    AND (pata.expires_at IS NULL OR pata.expires_at > now())
    AND t.status != 'deleted'
    ORDER BY t.name;
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    t.name_ar as tenant_name_ar,
    'tenant_member'::text as access_type,
    array_agg(DISTINCT uta.role_code) as roles
  FROM tenants t
  INNER JOIN user_tenant_assignments uta ON uta.tenant_id = t.id
  WHERE uta.user_id = p_user_id 
  AND uta.is_active = true
  AND (uta.expires_at IS NULL OR uta.expires_at > now())
  AND t.status != 'deleted'
  GROUP BY t.id, t.name, t.name_ar
  ORDER BY t.name;
END;
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_tenant_assignments_user ON user_tenant_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenant_assignments_tenant ON user_tenant_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_tenant_assignments_active ON user_tenant_assignments(user_id, tenant_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_platform_admin_tenant_access_user ON platform_admin_tenant_access(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_roles_code ON tenant_roles(code);
CREATE INDEX IF NOT EXISTS idx_tenant_roles_tenant ON tenant_roles(tenant_id);
