-- =============================================
-- نظام متقن CMMS - هيكل Multi-Tenancy الجديد
-- =============================================

-- 1. إعادة تسمية hospitals إلى organizations
ALTER TABLE public.hospitals RENAME TO organizations;

-- 2. إضافة أعمدة جديدة للمنظمات
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT (now() + interval '30 days'),
ADD COLUMN IF NOT EXISTS max_users integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_storage_gb numeric DEFAULT 5,
ADD COLUMN IF NOT EXISTS max_assets integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS max_work_orders_per_month integer DEFAULT 500,
ADD COLUMN IF NOT EXISTS custom_pricing jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS enabled_modules text[] DEFAULT ARRAY['dashboard', 'work_orders', 'assets'],
ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS billing_email text,
ADD COLUMN IF NOT EXISTS billing_contact text;

-- 3. تحديث الـ Foreign Keys للإشارة إلى organizations
-- (الاسم الجديد سيعمل تلقائياً لأنه rename)

-- 4. جدول أدوار المنصة (Platform Roles)
CREATE TABLE IF NOT EXISTS public.platform_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  description text,
  is_system boolean DEFAULT false,
  can_access_all_orgs boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إدخال الأدوار الأساسية للمنصة
INSERT INTO public.platform_roles (code, name, name_ar, is_system, can_access_all_orgs) VALUES
('owner', 'Platform Owner', 'مالك المنصة', true, true),
('platform_admin', 'Platform Admin', 'مدير المنصة', true, true),
('platform_support', 'Support', 'الدعم الفني', true, false),
('platform_finance', 'Finance', 'المالية', true, false)
ON CONFLICT (code) DO NOTHING;

-- 5. جدول صلاحيات أدوار المنصة
CREATE TABLE IF NOT EXISTS public.platform_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code text REFERENCES public.platform_roles(code) ON DELETE CASCADE,
  permission_key text NOT NULL,
  allowed boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_code, permission_key)
);

-- 6. جدول ربط المستخدمين بأدوار المنصة
CREATE TABLE IF NOT EXISTS public.platform_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role_code text REFERENCES public.platform_roles(code) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_code)
);

-- 7. جدول المنظمات المسموح بها لمستخدمي المنصة
CREATE TABLE IF NOT EXISTS public.platform_user_org_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid NOT NULL,
  permissions jsonb DEFAULT '{"view": true, "edit": false, "admin": false}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- 8. جدول أدوار المنظمة (Organization Roles)
CREATE TABLE IF NOT EXISTS public.org_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  description text,
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, code)
);

-- 9. جدول صلاحيات أدوار المنظمة
CREATE TABLE IF NOT EXISTS public.org_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_role_id uuid REFERENCES public.org_roles(id) ON DELETE CASCADE NOT NULL,
  permission_key text NOT NULL,
  allowed boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_role_id, permission_key)
);

-- 10. جدول ربط المستخدمين بالمنظمات وأدوارهم
CREATE TABLE IF NOT EXISTS public.org_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid NOT NULL,
  org_role_id uuid REFERENCES public.org_roles(id) ON DELETE SET NULL,
  is_org_admin boolean DEFAULT false,
  is_active boolean DEFAULT true,
  custom_permissions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- 11. جدول الموديولات المتاحة
CREATE TABLE IF NOT EXISTS public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  description text,
  icon text,
  is_core boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- إدخال الموديولات الأساسية
INSERT INTO public.modules (code, name, name_ar, is_core, display_order) VALUES
('dashboard', 'Dashboard', 'لوحة التحكم', true, 1),
('facilities', 'Facilities', 'المرافق', false, 2),
('assets', 'Assets', 'الأصول', false, 3),
('inventory', 'Inventory', 'المخزون', false, 4),
('work_orders', 'Work Orders', 'أوامر العمل', false, 5),
('maintenance', 'Maintenance', 'الصيانة', false, 6),
('calibration', 'Calibration', 'المعايرة', false, 7),
('contracts', 'Contracts', 'العقود', false, 8),
('sla', 'SLA', 'اتفاقيات الخدمة', false, 9),
('costs', 'Costs', 'التكاليف', false, 10),
('operations_log', 'Operations Log', 'سجل العمليات', false, 11),
('teams', 'Teams', 'الفرق', false, 12),
('reports', 'Reports', 'التقارير', false, 13),
('settings', 'Settings', 'الإعدادات', true, 99)
ON CONFLICT (code) DO NOTHING;

-- 12. جدول الموديولات المفعلة لكل منظمة
CREATE TABLE IF NOT EXISTS public.org_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  module_code text REFERENCES public.modules(code) ON DELETE CASCADE NOT NULL,
  is_enabled boolean DEFAULT true,
  feature_flags jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, module_code)
);

-- 13. جدول إعدادات المنظمة
CREATE TABLE IF NOT EXISTS public.org_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE,
  theme jsonb DEFAULT '{}',
  dashboard_config jsonb DEFAULT '{}',
  notification_settings jsonb DEFAULT '{}',
  workflow_settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 14. جدول سجل الاستخدام
CREATE TABLE IF NOT EXISTS public.org_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  month date NOT NULL,
  users_count integer DEFAULT 0,
  storage_used_gb numeric DEFAULT 0,
  assets_count integer DEFAULT 0,
  work_orders_count integer DEFAULT 0,
  api_calls integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, month)
);

-- 15. تفعيل RLS على الجداول الجديدة
ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_user_org_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_usage ENABLE ROW LEVEL SECURITY;

-- 16. دالة للتحقق من دور المنصة
CREATE OR REPLACE FUNCTION public.has_platform_role(_user_id uuid, _role_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_user_roles
    WHERE user_id = _user_id AND role_code = _role_code
  )
$$;

-- 17. دالة للتحقق من صلاحية المنصة
CREATE OR REPLACE FUNCTION public.is_platform_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_user_roles
    WHERE user_id = _user_id
  )
$$;

-- 18. دالة للتحقق من الوصول للمنظمة
CREATE OR REPLACE FUNCTION public.can_access_organization(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- المالك ومدير المنصة يصلون لكل المنظمات
  IF EXISTS (
    SELECT 1 FROM public.platform_user_roles pur
    JOIN public.platform_roles pr ON pr.code = pur.role_code
    WHERE pur.user_id = _user_id AND pr.can_access_all_orgs = true
  ) THEN
    RETURN true;
  END IF;
  
  -- التحقق من الوصول المحدد للمنظمة (لمستخدمي المنصة)
  IF EXISTS (
    SELECT 1 FROM public.platform_user_org_access
    WHERE user_id = _user_id AND organization_id = _org_id
  ) THEN
    RETURN true;
  END IF;
  
  -- التحقق من عضوية المنظمة
  IF EXISTS (
    SELECT 1 FROM public.org_users
    WHERE user_id = _user_id AND organization_id = _org_id AND is_active = true
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- 19. دالة للحصول على منظمة المستخدم
CREATE OR REPLACE FUNCTION public.get_user_organization(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT organization_id FROM public.org_users WHERE user_id = _user_id AND is_active = true LIMIT 1),
    (SELECT organization_id FROM public.platform_user_org_access WHERE user_id = _user_id LIMIT 1)
  )
$$;

-- 20. RLS Policies للجداول الجديدة

-- Platform Roles - القراءة للجميع
CREATE POLICY "Anyone can view platform roles" ON public.platform_roles
FOR SELECT USING (true);

-- Platform Roles - الإدارة للمالك فقط
CREATE POLICY "Only owner can manage platform roles" ON public.platform_roles
FOR ALL USING (has_platform_role(auth.uid(), 'owner'));

-- Platform User Roles
CREATE POLICY "Platform admins can view platform user roles" ON public.platform_user_roles
FOR SELECT USING (
  has_platform_role(auth.uid(), 'owner') OR 
  has_platform_role(auth.uid(), 'platform_admin')
);

CREATE POLICY "Only owner can manage platform user roles" ON public.platform_user_roles
FOR ALL USING (has_platform_role(auth.uid(), 'owner'));

-- Org Users
CREATE POLICY "Users can view their org members" ON public.org_users
FOR SELECT USING (can_access_organization(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage members" ON public.org_users
FOR ALL USING (
  has_platform_role(auth.uid(), 'owner') OR
  has_platform_role(auth.uid(), 'platform_admin') OR
  EXISTS (
    SELECT 1 FROM public.org_users 
    WHERE user_id = auth.uid() 
    AND organization_id = org_users.organization_id 
    AND is_org_admin = true
  )
);

-- Org Roles
CREATE POLICY "Users can view their org roles" ON public.org_roles
FOR SELECT USING (can_access_organization(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage roles" ON public.org_roles
FOR ALL USING (
  has_platform_role(auth.uid(), 'owner') OR
  has_platform_role(auth.uid(), 'platform_admin') OR
  EXISTS (
    SELECT 1 FROM public.org_users 
    WHERE user_id = auth.uid() 
    AND organization_id = org_roles.organization_id 
    AND is_org_admin = true
  )
);

-- Modules - القراءة للجميع
CREATE POLICY "Anyone can view modules" ON public.modules
FOR SELECT USING (true);

-- Org Modules
CREATE POLICY "Users can view their org modules" ON public.org_modules
FOR SELECT USING (can_access_organization(auth.uid(), organization_id));

CREATE POLICY "Platform admins can manage org modules" ON public.org_modules
FOR ALL USING (
  has_platform_role(auth.uid(), 'owner') OR
  has_platform_role(auth.uid(), 'platform_admin')
);

-- Org Settings
CREATE POLICY "Users can view their org settings" ON public.org_settings
FOR SELECT USING (can_access_organization(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage settings" ON public.org_settings
FOR ALL USING (
  has_platform_role(auth.uid(), 'owner') OR
  has_platform_role(auth.uid(), 'platform_admin') OR
  EXISTS (
    SELECT 1 FROM public.org_users 
    WHERE user_id = auth.uid() 
    AND organization_id = org_settings.organization_id 
    AND is_org_admin = true
  )
);

-- Organizations (formerly hospitals)
DROP POLICY IF EXISTS "Users can view their hospital basic info" ON public.organizations;
DROP POLICY IF EXISTS "Admins can view full hospital details" ON public.organizations;
DROP POLICY IF EXISTS "Global admins can manage all hospitals" ON public.organizations;
DROP POLICY IF EXISTS "Hospital admins can update their own hospital" ON public.organizations;

CREATE POLICY "Users can view their organization" ON public.organizations
FOR SELECT USING (can_access_organization(auth.uid(), id));

CREATE POLICY "Platform admins can manage organizations" ON public.organizations
FOR ALL USING (
  has_platform_role(auth.uid(), 'owner') OR
  has_platform_role(auth.uid(), 'platform_admin')
);

CREATE POLICY "Org admins can update their organization" ON public.organizations
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.org_users 
    WHERE user_id = auth.uid() 
    AND organization_id = organizations.id 
    AND is_org_admin = true
  )
);