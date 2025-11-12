-- ============================================
-- إعادة هيكلة نظام الأدوار والصلاحيات
-- ============================================

-- 1. إنشاء جدول user_custom_roles لربط المستخدمين بالأدوار المخصصة
CREATE TABLE IF NOT EXISTS public.user_custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role_code text NOT NULL,
  hospital_id uuid REFERENCES public.hospitals ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_code, hospital_id)
);

-- Enable RLS
ALTER TABLE public.user_custom_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_custom_roles
CREATE POLICY "Users can view their own custom roles"
ON public.user_custom_roles FOR SELECT
USING (
  user_id = auth.uid() 
  OR has_role(auth.uid(), 'global_admin'::app_role)
  OR (
    hospital_id = get_user_hospital(auth.uid())
    AND (
      has_role(auth.uid(), 'hospital_admin'::app_role)
      OR has_role(auth.uid(), 'facility_manager'::app_role)
    )
  )
);

CREATE POLICY "Admins can manage custom roles"
ON public.user_custom_roles FOR ALL
USING (
  has_role(auth.uid(), 'global_admin'::app_role)
  OR (
    hospital_id = get_user_hospital(auth.uid())
    AND (
      has_role(auth.uid(), 'hospital_admin'::app_role)
      OR has_role(auth.uid(), 'facility_manager'::app_role)
    )
  )
);

-- 2. إضافة عمود role_code لجدول role_permissions
ALTER TABLE public.role_permissions ADD COLUMN IF NOT EXISTS role_code text;

-- ترحيل البيانات الموجودة: تحويل app_role إلى role_code
UPDATE public.role_permissions 
SET role_code = role::text 
WHERE role_code IS NULL;

-- 3. إنشاء index للأداء
CREATE INDEX IF NOT EXISTS idx_user_custom_roles_user_id ON public.user_custom_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_roles_role_code ON public.user_custom_roles(role_code);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_code ON public.role_permissions(role_code);

-- 4. إنشاء function للتحقق من الأدوار المخصصة
CREATE OR REPLACE FUNCTION public.has_custom_role(_user_id uuid, _role_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_custom_roles
    WHERE user_id = _user_id AND role_code = _role_code
  )
$$;

-- 5. إنشاء function محسّنة للتحقق من الصلاحيات (تدعم النظام الجديد والقديم)
CREATE OR REPLACE FUNCTION public.has_permission_v2(_user_id uuid, _permission_key text, _hospital_id uuid DEFAULT NULL)
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
  -- Check for explicit DENY (highest priority)
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

  -- Check for explicit GRANT
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

  -- Check custom role permissions (NEW SYSTEM)
  SELECT EXISTS (
    SELECT 1
    FROM public.user_custom_roles ucr
    JOIN public.role_permissions rp ON rp.role_code = ucr.role_code
    WHERE ucr.user_id = _user_id
      AND rp.permission_key = _permission_key
      AND rp.allowed = true
  ) INTO _has_permission;

  IF _has_permission THEN
    RETURN true;
  END IF;

  -- Fallback: Check old system (app_role based)
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

-- 6. ترحيل الأدوار الموجودة إلى النظام الجديد
-- نقل جميع الأدوار من user_roles (ما عدا global_admin) إلى user_custom_roles
INSERT INTO public.user_custom_roles (user_id, role_code, hospital_id)
SELECT 
  user_id,
  role::text as role_code,
  hospital_id
FROM public.user_roles
WHERE role != 'global_admin'
ON CONFLICT (user_id, role_code, hospital_id) DO NOTHING;

-- 7. تحديث triggered function لإنشاء profile
-- (لا حاجة لتعديله، يعمل بشكل صحيح)

COMMENT ON TABLE public.user_custom_roles IS 'ربط المستخدمين بالأدوار المخصصة من lookup_team_roles';
COMMENT ON FUNCTION public.has_custom_role IS 'التحقق من أن المستخدم لديه دور مخصص معين';
COMMENT ON FUNCTION public.has_permission_v2 IS 'التحقق من صلاحية المستخدم (يدعم النظام القديم والجديد)';