# دليل إعداد قاعدة البيانات ونظام الصلاحيات - Mutqan FM

## الفهرس
1. [نظرة عامة](#نظرة-عامة)
2. [المتطلبات الأساسية](#المتطلبات-الأساسية)
3. [الخطوة 1: إنشاء الأنواع (Enums)](#الخطوة-1-إنشاء-الأنواع-enums)
4. [الخطوة 2: إنشاء الجداول الأساسية](#الخطوة-2-إنشاء-الجداول-الأساسية)
5. [الخطوة 3: إنشاء جداول الصلاحيات](#الخطوة-3-إنشاء-جداول-الصلاحيات)
6. [الخطوة 4: إنشاء الدوال المخزنة](#الخطوة-4-إنشاء-الدوال-المخزنة)
7. [الخطوة 5: إعداد RLS Policies](#الخطوة-5-إعداد-rls-policies)
8. [الخطوة 6: البيانات الأولية](#الخطوة-6-البيانات-الأولية)
9. [الخطوة 7: إعداد الكود Frontend](#الخطوة-7-إعداد-الكود-frontend)
10. [اختبار النظام](#اختبار-النظام)

---

## نظرة عامة

هذا النظام يعتمد على **ثلاث طبقات** للصلاحيات:

```
┌─────────────────────────────────────────────────────────────┐
│                    طبقة 1: الأدوار (Roles)                   │
│  كل مستخدم لديه دور أو أكثر (global_admin, technician, etc) │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              طبقة 2: صلاحيات الدور (Role Permissions)        │
│   كل دور لديه مجموعة صلاحيات افتراضية محددة مسبقاً          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│           طبقة 3: استثناءات المستخدم (User Overrides)        │
│   يمكن منح أو سحب صلاحية محددة لمستخدم معين                 │
└─────────────────────────────────────────────────────────────┘
```

### مبدأ العمل:
```
الصلاحية النهائية = صلاحيات الدور + الاستثناءات الخاصة
```

### أولوية التقييم:
1. **أعلى أولوية**: `user_permissions` مع `hospital_id` محدد و `effect = 'deny'`
2. `user_permissions` مع `hospital_id = NULL` (global) و `effect = 'deny'`
3. `user_permissions` مع `hospital_id` محدد و `effect = 'grant'`
4. `user_permissions` مع `hospital_id = NULL` و `effect = 'grant'`
5. **أدنى أولوية**: `role_permissions` الافتراضية

---

## المتطلبات الأساسية

- Supabase Project (أو Lovable Cloud)
- PostgreSQL 14+
- معرفة أساسية بـ SQL و RLS

---

## الخطوة 1: إنشاء الأنواع (Enums)

```sql
-- =====================================================
-- 1.1 نوع الأدوار القديم (للتوافق مع النظام القديم)
-- =====================================================
CREATE TYPE public.app_role AS ENUM (
  'global_admin',      -- مدير عام النظام
  'hospital_admin',    -- مدير المستشفى
  'facility_manager',  -- مدير المرافق
  'maintenance_manager', -- مدير الصيانة
  'supervisor',        -- مشرف
  'engineer',          -- مهندس
  'technician',        -- فني
  'requester'          -- مقدم طلب
);

-- =====================================================
-- 1.2 حالات أوامر العمل
-- =====================================================
CREATE TYPE public.work_order_status AS ENUM (
  'pending',           -- معلق
  'reviewed',          -- تمت المراجعة
  'assigned',          -- تم التعيين
  'in_progress',       -- قيد التنفيذ
  'completed',         -- مكتمل
  'supervisor_approved', -- موافقة المشرف
  'engineer_approved', -- موافقة المهندس
  'mm_approved',       -- موافقة مدير الصيانة
  'closed',            -- مغلق
  'rejected',          -- مرفوض
  'cancelled'          -- ملغي
);

-- =====================================================
-- 1.3 أنواع الصيانة
-- =====================================================
CREATE TYPE public.maintenance_type AS ENUM (
  'preventive',        -- وقائية
  'corrective',        -- تصحيحية
  'predictive',        -- تنبؤية
  'emergency'          -- طارئة
);

-- =====================================================
-- 1.4 أنواع العمليات
-- =====================================================
CREATE TYPE public.operation_type AS ENUM (
  'shutdown',          -- إيقاف
  'startup',           -- تشغيل
  'maintenance',       -- صيانة
  'inspection',        -- فحص
  'testing',           -- اختبار
  'calibration'        -- معايرة
);

-- =====================================================
-- 1.5 فئات الأصول
-- =====================================================
CREATE TYPE public.asset_category AS ENUM (
  'medical_equipment',
  'hvac',
  'electrical',
  'plumbing',
  'fire_safety',
  'it_network',
  'furniture',
  'vehicle',
  'building_structure',
  'other'
);

-- =====================================================
-- 1.6 حالات الأصول
-- =====================================================
CREATE TYPE public.asset_status AS ENUM (
  'operational',
  'under_maintenance',
  'out_of_service',
  'decommissioned',
  'pending_installation'
);

-- =====================================================
-- 1.7 مستويات الخطورة
-- =====================================================
CREATE TYPE public.criticality_level AS ENUM (
  'critical',
  'high',
  'medium',
  'low'
);
```

---

## الخطوة 2: إنشاء الجداول الأساسية

### 2.1 جدول المستشفيات (الجذر)

```sql
CREATE TABLE public.hospitals (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  type TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  logo_url TEXT,
  notes TEXT,
  suspended_at TIMESTAMPTZ,
  suspended_by UUID,
  suspension_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
```

### 2.2 جدول الملفات الشخصية

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES public.hospitals(id),
  full_name TEXT NOT NULL,
  full_name_ar TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Trigger لإنشاء profile تلقائياً عند تسجيل مستخدم جديد
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### 2.3 جدول المباني

```sql
CREATE TABLE public.buildings (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(hospital_id, code)
);

ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
```

### 2.4 جدول الطوابق

```sql
CREATE TABLE public.floors (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  level INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
```

### 2.5 جدول الأقسام

```sql
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  floor_id UUID NOT NULL REFERENCES public.floors(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
```

### 2.6 جدول الغرف

```sql
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  coordinates_x NUMERIC,
  coordinates_y NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
```

### 2.7 جدول الأصول

```sql
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  category public.asset_category NOT NULL,
  subcategory TEXT,
  type TEXT,
  status public.asset_status NOT NULL DEFAULT 'operational',
  criticality public.criticality_level NOT NULL DEFAULT 'medium',
  
  -- الموقع
  building_id UUID REFERENCES public.buildings(id),
  floor_id UUID REFERENCES public.floors(id),
  department_id UUID REFERENCES public.departments(id),
  room_id UUID REFERENCES public.rooms(id),
  coordinates_x NUMERIC,
  coordinates_y NUMERIC,
  
  -- معلومات الشراء
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  manufacture_year INTEGER,
  purchase_date DATE,
  purchase_cost NUMERIC,
  installation_date DATE,
  warranty_expiry DATE,
  warranty_provider TEXT,
  supplier TEXT,
  
  -- معلومات إضافية
  expected_lifespan_years INTEGER,
  depreciation_annual NUMERIC,
  specifications JSONB,
  image_url TEXT,
  qr_code TEXT,
  parent_asset_id UUID REFERENCES public.assets(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(hospital_id, code)
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
```

### 2.8 جدول الفرق

```sql
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  department TEXT,
  type TEXT NOT NULL DEFAULT 'internal',
  status TEXT NOT NULL DEFAULT 'active',
  shift_start TIME,
  shift_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(hospital_id, code)
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
```

### 2.9 جدول أعضاء الفرق

```sql
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  specialization TEXT[],
  certifications JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
```

### 2.10 جدول أوامر العمل

```sql
CREATE TABLE public.work_orders (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id),
  code TEXT NOT NULL,
  
  -- معلومات البلاغ
  issue_type TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  urgency TEXT,
  photos TEXT[],
  
  -- الموقع
  asset_id UUID REFERENCES public.assets(id),
  building_id UUID REFERENCES public.buildings(id),
  floor_id UUID REFERENCES public.floors(id),
  department_id UUID REFERENCES public.departments(id),
  room_id UUID REFERENCES public.rooms(id),
  
  -- البلاغ
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reporter_notes TEXT,
  
  -- المراجعة
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  
  -- التعيين
  assigned_team UUID REFERENCES public.teams(id),
  assigned_to UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  estimated_duration INTEGER,
  
  -- التنفيذ
  status public.work_order_status NOT NULL DEFAULT 'pending',
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  actual_duration INTEGER,
  work_notes TEXT,
  work_photos TEXT[],
  actions_taken JSONB,
  parts_used JSONB,
  
  -- الموافقات
  technician_completed_at TIMESTAMPTZ,
  technician_notes TEXT,
  
  supervisor_approved_by UUID REFERENCES auth.users(id),
  supervisor_approved_at TIMESTAMPTZ,
  supervisor_notes TEXT,
  
  engineer_approved_by UUID REFERENCES auth.users(id),
  engineer_approved_at TIMESTAMPTZ,
  engineer_notes TEXT,
  
  maintenance_manager_approved_by UUID REFERENCES auth.users(id),
  maintenance_manager_approved_at TIMESTAMPTZ,
  maintenance_manager_notes TEXT,
  
  customer_reviewed_by UUID REFERENCES auth.users(id),
  customer_reviewed_at TIMESTAMPTZ,
  customer_rating INTEGER,
  customer_feedback TEXT,
  
  -- الرفض
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  rejection_stage TEXT,
  
  -- إعادة التوجيه
  is_redirected BOOLEAN DEFAULT false,
  redirected_by UUID REFERENCES auth.users(id),
  redirected_to TEXT,
  redirect_reason TEXT,
  original_issue_type TEXT,
  
  -- إعادة التعيين
  reassignment_count INTEGER DEFAULT 0,
  last_reassigned_at TIMESTAMPTZ,
  last_reassigned_by UUID REFERENCES auth.users(id),
  reassignment_reason TEXT,
  
  -- الإغلاق التلقائي
  pending_closure_since TIMESTAMPTZ,
  auto_closed_at TIMESTAMPTZ,
  
  -- معلومات إضافية
  company_id UUID,
  notify_supervisor BOOLEAN DEFAULT true,
  total_cost NUMERIC,
  labor_time NUMERIC,
  response_time INTEGER,
  resolution_time INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(hospital_id, code)
);

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
```

---

## الخطوة 3: إنشاء جداول الصلاحيات

### 3.1 جدول الأدوار القديم (للتوافق)

```sql
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  hospital_id UUID REFERENCES public.hospitals(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, hospital_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
```

### 3.2 جدول الأدوار المخصصة الجديد

```sql
CREATE TABLE public.system_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_roles ENABLE ROW LEVEL SECURITY;
```

### 3.3 جدول ربط المستخدمين بالأدوار المخصصة

```sql
CREATE TABLE public.user_custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_code TEXT NOT NULL REFERENCES public.system_roles(code),
  hospital_id UUID REFERENCES public.hospitals(id),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_code, hospital_id)
);

ALTER TABLE public.user_custom_roles ENABLE ROW LEVEL SECURITY;
```

### 3.4 جدول تعريف الصلاحيات

```sql
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
```

### 3.5 جدول صلاحيات الأدوار

```sql
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- يمكن استخدام أحدهما (للتوافق مع النظامين)
  role public.app_role,           -- النظام القديم
  role_code TEXT,                  -- النظام الجديد
  
  permission_key TEXT NOT NULL REFERENCES public.permissions(key),
  allowed BOOLEAN NOT NULL DEFAULT true,
  hospital_id UUID REFERENCES public.hospitals(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- التأكد من وجود أحد الأدوار
  CONSTRAINT role_or_role_code CHECK (role IS NOT NULL OR role_code IS NOT NULL)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
```

### 3.6 جدول استثناءات المستخدمين

```sql
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES public.permissions(key),
  effect TEXT NOT NULL CHECK (effect IN ('grant', 'deny')),
  hospital_id UUID REFERENCES public.hospitals(id),  -- NULL = global
  granted_by UUID REFERENCES auth.users(id),
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, permission_key, hospital_id)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
```

---

## الخطوة 4: إنشاء الدوال المخزنة

### 4.1 دالة الحصول على مستشفى المستخدم

```sql
CREATE OR REPLACE FUNCTION public.get_user_hospital(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- أولاً: من الملف الشخصي
    (SELECT hospital_id FROM public.profiles WHERE id = _user_id),
    -- ثانياً: من الأدوار المخصصة
    (SELECT hospital_id FROM public.user_custom_roles 
     WHERE user_id = _user_id AND hospital_id IS NOT NULL 
     LIMIT 1),
    -- ثالثاً: من الأدوار القديمة
    (SELECT hospital_id FROM public.user_roles 
     WHERE user_id = _user_id AND hospital_id IS NOT NULL 
     LIMIT 1)
  )
$$;
```

### 4.2 دالة التحقق من الدور (النظام القديم)

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

### 4.3 دالة التحقق من الدور (النظام الجديد)

```sql
CREATE OR REPLACE FUNCTION public.has_role_by_code(_user_id UUID, _role_code TEXT)
RETURNS BOOLEAN
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
```

### 4.4 دالة الحصول على الصلاحيات الفعّالة

```sql
CREATE OR REPLACE FUNCTION public.get_effective_permissions(
  _user_id UUID,
  _hospital_id UUID DEFAULT NULL
)
RETURNS TABLE(permission_key TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _effective_hospital_id UUID;
BEGIN
  -- تحديد المستشفى
  _effective_hospital_id := COALESCE(_hospital_id, get_user_hospital(_user_id));
  
  RETURN QUERY
  WITH 
  -- جمع أدوار المستخدم (القديمة والجديدة)
  user_roles_combined AS (
    SELECT role::TEXT as role_identifier, 'old' as system
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
    
    UNION ALL
    
    SELECT role_code as role_identifier, 'new' as system
    FROM public.user_custom_roles ucr
    WHERE ucr.user_id = _user_id
  ),
  
  -- صلاحيات الأدوار
  role_perms AS (
    SELECT DISTINCT rp.permission_key
    FROM public.role_permissions rp
    JOIN user_roles_combined urc ON (
      (urc.system = 'old' AND rp.role::TEXT = urc.role_identifier) OR
      (urc.system = 'new' AND rp.role_code = urc.role_identifier)
    )
    WHERE rp.allowed = true
      AND (rp.hospital_id IS NULL OR rp.hospital_id = _effective_hospital_id)
  ),
  
  -- استثناءات المستخدم
  user_overrides AS (
    SELECT 
      up.permission_key,
      up.effect,
      up.hospital_id,
      CASE 
        WHEN up.hospital_id IS NOT NULL THEN 1  -- Hospital-specific أعلى
        ELSE 2                                   -- Global أقل
      END as priority
    FROM public.user_permissions up
    WHERE up.user_id = _user_id
      AND (up.hospital_id IS NULL OR up.hospital_id = _effective_hospital_id)
      AND (up.expires_at IS NULL OR up.expires_at > now())
  ),
  
  -- الصلاحيات المرفوضة صراحة
  denied_perms AS (
    SELECT permission_key
    FROM user_overrides
    WHERE effect = 'deny'
  ),
  
  -- الصلاحيات الممنوحة صراحة
  granted_perms AS (
    SELECT permission_key
    FROM user_overrides
    WHERE effect = 'grant'
  )
  
  -- النتيجة النهائية
  SELECT p.permission_key
  FROM (
    -- صلاحيات الأدوار (غير المرفوضة)
    SELECT rp.permission_key FROM role_perms rp
    WHERE rp.permission_key NOT IN (SELECT permission_key FROM denied_perms)
    
    UNION
    
    -- الصلاحيات الممنوحة صراحة (غير المرفوضة)
    SELECT gp.permission_key FROM granted_perms gp
    WHERE gp.permission_key NOT IN (SELECT permission_key FROM denied_perms)
  ) p;
END;
$$;
```

### 4.5 دالة التحقق من صلاحية محددة

```sql
CREATE OR REPLACE FUNCTION public.has_permission_v2(
  _user_id UUID,
  _permission_key TEXT,
  _hospital_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.get_effective_permissions(_user_id, _hospital_id) ep
    WHERE ep.permission_key = _permission_key
  );
END;
$$;
```

### 4.6 دالة التحقق من صلاحية (مبسطة للـ RLS)

```sql
CREATE OR REPLACE FUNCTION public.check_permission(
  _user_id UUID,
  _permission TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_permission_v2(_user_id, _permission, NULL)
$$;
```

---

## الخطوة 5: إعداد RLS Policies

### 5.1 سياسات جدول المستشفيات

```sql
-- المدير العام يرى كل شيء
CREATE POLICY "Global admins can manage all hospitals"
ON public.hospitals FOR ALL
USING (public.has_role(auth.uid(), 'global_admin'))
WITH CHECK (public.has_role(auth.uid(), 'global_admin'));

-- مدير المستشفى يرى مستشفاه فقط
CREATE POLICY "Hospital admins can view their hospital"
ON public.hospitals FOR SELECT
USING (
  id = public.get_user_hospital(auth.uid()) 
  AND public.has_role(auth.uid(), 'hospital_admin')
);

-- المستخدمون يرون معلومات مستشفاهم الأساسية
CREATE POLICY "Users can view their hospital basic info"
ON public.hospitals FOR SELECT
USING (id = public.get_user_hospital(auth.uid()));
```

### 5.2 سياسات جدول الملفات الشخصية

```sql
-- المستخدم يرى ملفه الشخصي
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (id = auth.uid());

-- المستخدم يعدل ملفه الشخصي
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid());

-- المستخدم ينشئ ملفه الشخصي
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- المدير العام يرى الكل
CREATE POLICY "Global admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'global_admin'));

-- مدير المستشفى يرى ملفات مستشفاه
CREATE POLICY "Hospital admins can view hospital profiles"
ON public.profiles FOR SELECT
USING (
  hospital_id = public.get_user_hospital(auth.uid())
  AND (
    public.has_role(auth.uid(), 'hospital_admin') OR
    public.has_role(auth.uid(), 'facility_manager') OR
    public.has_role(auth.uid(), 'maintenance_manager')
  )
);
```

### 5.3 سياسات جدول أوامر العمل

```sql
-- المديرون يديرون كل أوامر العمل
CREATE POLICY "Admins can manage work orders"
ON public.work_orders FOR ALL
USING (
  hospital_id = public.get_user_hospital(auth.uid())
  AND (
    public.has_role(auth.uid(), 'global_admin') OR
    public.has_role(auth.uid(), 'hospital_admin') OR
    public.has_role(auth.uid(), 'facility_manager') OR
    public.has_role(auth.uid(), 'maintenance_manager') OR
    public.has_role_by_code(auth.uid(), 'global_admin') OR
    public.has_role_by_code(auth.uid(), 'hospital_admin') OR
    public.has_role_by_code(auth.uid(), 'facility_manager') OR
    public.has_role_by_code(auth.uid(), 'maintenance_manager')
  )
);

-- المستخدم يرى أوامر العمل المتعلقة به
CREATE POLICY "Users can view related work orders"
ON public.work_orders FOR SELECT
USING (
  hospital_id = public.get_user_hospital(auth.uid())
  AND (
    reported_by = auth.uid() OR
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = work_orders.assigned_team
        AND tm.user_id = auth.uid()
    ) OR
    public.has_permission_v2(auth.uid(), 'view_work_orders', hospital_id)
  )
);

-- المستخدم ينشئ أمر عمل
CREATE POLICY "Users can create work orders"
ON public.work_orders FOR INSERT
WITH CHECK (
  hospital_id = public.get_user_hospital(auth.uid())
  AND reported_by = auth.uid()
);

-- الفنيون يعدلون أوامر العمل المعينة لهم
CREATE POLICY "Technicians can update assigned work orders"
ON public.work_orders FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = work_orders.assigned_team
      AND tm.user_id = auth.uid()
  )
);
```

### 5.4 سياسات جدول الأصول

```sql
-- المستخدمون يرون أصول مستشفاهم
CREATE POLICY "Users can view hospital assets"
ON public.assets FOR SELECT
USING (
  hospital_id = public.get_user_hospital(auth.uid())
  AND public.has_permission_v2(auth.uid(), 'assets.view', hospital_id)
);

-- المديرون يديرون الأصول
CREATE POLICY "Managers can manage assets"
ON public.assets FOR ALL
USING (
  hospital_id = public.get_user_hospital(auth.uid())
  AND (
    public.has_role(auth.uid(), 'hospital_admin') OR
    public.has_role(auth.uid(), 'facility_manager') OR
    public.has_role_by_code(auth.uid(), 'hospital_admin') OR
    public.has_role_by_code(auth.uid(), 'facility_manager')
  )
);
```

### 5.5 سياسات جداول الصلاحيات

```sql
-- سياسات role_permissions
CREATE POLICY "Global admins can manage all role permissions"
ON public.role_permissions FOR ALL
USING (
  public.has_role(auth.uid(), 'global_admin') OR
  public.has_role_by_code(auth.uid(), 'global_admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'global_admin') OR
  public.has_role_by_code(auth.uid(), 'global_admin')
);

CREATE POLICY "Hospital admins can view relevant permissions"
ON public.role_permissions FOR SELECT
USING (
  (
    public.has_role(auth.uid(), 'hospital_admin') OR
    public.has_role_by_code(auth.uid(), 'hospital_admin')
  )
  AND (
    hospital_id IS NULL OR 
    hospital_id = public.get_user_hospital(auth.uid())
  )
);

-- سياسات user_permissions
CREATE POLICY "Admins can manage user permissions"
ON public.user_permissions FOR ALL
USING (
  public.has_role(auth.uid(), 'global_admin') OR
  public.has_role(auth.uid(), 'hospital_admin') OR
  public.has_role_by_code(auth.uid(), 'global_admin') OR
  public.has_role_by_code(auth.uid(), 'hospital_admin')
);

-- سياسات permissions (للقراءة فقط)
CREATE POLICY "Anyone can view permissions"
ON public.permissions FOR SELECT
USING (true);
```

---

## الخطوة 6: البيانات الأولية

### 6.1 الأدوار الأساسية

```sql
INSERT INTO public.system_roles (code, name, name_ar, is_system, display_order) VALUES
('global_admin', 'Global Admin', 'مدير عام', true, 1),
('hospital_admin', 'Hospital Admin', 'مدير المستشفى', true, 2),
('facility_manager', 'Facility Manager', 'مدير المرافق', true, 3),
('maintenance_manager', 'Maintenance Manager', 'مدير الصيانة', true, 4),
('supervisor', 'Supervisor', 'مشرف', true, 5),
('engineer', 'Engineer', 'مهندس', true, 6),
('technician', 'Technician', 'فني', true, 7),
('requester', 'Requester', 'مقدم طلب', true, 8)
ON CONFLICT (code) DO NOTHING;
```

### 6.2 الصلاحيات

```sql
INSERT INTO public.permissions (key, name, name_ar, category) VALUES
-- الأصول
('assets.view', 'View Assets', 'عرض الأصول', 'assets'),
('assets.create', 'Create Assets', 'إنشاء الأصول', 'assets'),
('assets.edit', 'Edit Assets', 'تعديل الأصول', 'assets'),
('assets.delete', 'Delete Assets', 'حذف الأصول', 'assets'),

-- المرافق
('facilities.view', 'View Facilities', 'عرض المرافق', 'facilities'),
('facilities.create', 'Create Facilities', 'إنشاء المرافق', 'facilities'),
('facilities.edit', 'Edit Facilities', 'تعديل المرافق', 'facilities'),
('facilities.delete', 'Delete Facilities', 'حذف المرافق', 'facilities'),

-- أوامر العمل
('work_orders.view', 'View Work Orders', 'عرض أوامر العمل', 'work_orders'),
('work_orders.create', 'Create Work Orders', 'إنشاء أوامر العمل', 'work_orders'),
('work_orders.edit', 'Edit Work Orders', 'تعديل أوامر العمل', 'work_orders'),
('work_orders.assign', 'Assign Work Orders', 'تعيين أوامر العمل', 'work_orders'),
('work_orders.approve', 'Approve Work Orders', 'اعتماد أوامر العمل', 'work_orders'),
('work_orders.close', 'Close Work Orders', 'إغلاق أوامر العمل', 'work_orders'),

-- المخزون
('inventory.view', 'View Inventory', 'عرض المخزون', 'inventory'),
('inventory.manage', 'Manage Inventory', 'إدارة المخزون', 'inventory'),
('inventory.transactions', 'Inventory Transactions', 'معاملات المخزون', 'inventory'),

-- الفرق
('teams.view', 'View Teams', 'عرض الفرق', 'teams'),
('teams.manage', 'Manage Teams', 'إدارة الفرق', 'teams'),

-- المستخدمين
('users.view', 'View Users', 'عرض المستخدمين', 'users'),
('users.create', 'Create Users', 'إنشاء المستخدمين', 'users'),
('users.edit', 'Edit Users', 'تعديل المستخدمين', 'users'),
('users.delete', 'Delete Users', 'حذف المستخدمين', 'users'),
('users.permissions', 'Manage User Permissions', 'إدارة صلاحيات المستخدمين', 'users'),

-- الإعدادات
('settings.view', 'View Settings', 'عرض الإعدادات', 'settings'),
('settings.manage', 'Manage Settings', 'إدارة الإعدادات', 'settings'),

-- الصيانة
('maintenance.view', 'View Maintenance', 'عرض الصيانة', 'maintenance'),
('maintenance.manage', 'Manage Maintenance', 'إدارة الصيانة', 'maintenance'),

-- التقارير
('reports.view', 'View Reports', 'عرض التقارير', 'reports'),
('reports.export', 'Export Reports', 'تصدير التقارير', 'reports'),

-- لوحة التحكم
('admin_access', 'Admin Panel Access', 'الوصول للوحة الإدارة', 'admin')

ON CONFLICT (key) DO NOTHING;
```

### 6.3 صلاحيات الأدوار الافتراضية

```sql
-- المدير العام - كل الصلاحيات
INSERT INTO public.role_permissions (role_code, permission_key, allowed)
SELECT 'global_admin', key, true FROM public.permissions
ON CONFLICT DO NOTHING;

-- مدير المستشفى
INSERT INTO public.role_permissions (role_code, permission_key, allowed) VALUES
('hospital_admin', 'admin_access', true),
('hospital_admin', 'assets.view', true),
('hospital_admin', 'assets.create', true),
('hospital_admin', 'assets.edit', true),
('hospital_admin', 'assets.delete', true),
('hospital_admin', 'facilities.view', true),
('hospital_admin', 'facilities.create', true),
('hospital_admin', 'facilities.edit', true),
('hospital_admin', 'facilities.delete', true),
('hospital_admin', 'work_orders.view', true),
('hospital_admin', 'work_orders.create', true),
('hospital_admin', 'work_orders.edit', true),
('hospital_admin', 'work_orders.assign', true),
('hospital_admin', 'work_orders.approve', true),
('hospital_admin', 'work_orders.close', true),
('hospital_admin', 'inventory.view', true),
('hospital_admin', 'inventory.manage', true),
('hospital_admin', 'teams.view', true),
('hospital_admin', 'teams.manage', true),
('hospital_admin', 'users.view', true),
('hospital_admin', 'users.create', true),
('hospital_admin', 'users.edit', true),
('hospital_admin', 'users.permissions', true),
('hospital_admin', 'maintenance.view', true),
('hospital_admin', 'maintenance.manage', true),
('hospital_admin', 'reports.view', true),
('hospital_admin', 'reports.export', true)
ON CONFLICT DO NOTHING;

-- مدير المرافق
INSERT INTO public.role_permissions (role_code, permission_key, allowed) VALUES
('facility_manager', 'admin_access', true),
('facility_manager', 'assets.view', true),
('facility_manager', 'assets.create', true),
('facility_manager', 'assets.edit', true),
('facility_manager', 'facilities.view', true),
('facility_manager', 'facilities.create', true),
('facility_manager', 'facilities.edit', true),
('facility_manager', 'work_orders.view', true),
('facility_manager', 'work_orders.create', true),
('facility_manager', 'work_orders.edit', true),
('facility_manager', 'work_orders.assign', true),
('facility_manager', 'work_orders.approve', true),
('facility_manager', 'inventory.view', true),
('facility_manager', 'inventory.manage', true),
('facility_manager', 'teams.view', true),
('facility_manager', 'teams.manage', true),
('facility_manager', 'maintenance.view', true),
('facility_manager', 'maintenance.manage', true),
('facility_manager', 'reports.view', true)
ON CONFLICT DO NOTHING;

-- مدير الصيانة
INSERT INTO public.role_permissions (role_code, permission_key, allowed) VALUES
('maintenance_manager', 'admin_access', true),
('maintenance_manager', 'assets.view', true),
('maintenance_manager', 'work_orders.view', true),
('maintenance_manager', 'work_orders.create', true),
('maintenance_manager', 'work_orders.edit', true),
('maintenance_manager', 'work_orders.assign', true),
('maintenance_manager', 'work_orders.approve', true),
('maintenance_manager', 'work_orders.close', true),
('maintenance_manager', 'teams.view', true),
('maintenance_manager', 'teams.manage', true),
('maintenance_manager', 'maintenance.view', true),
('maintenance_manager', 'maintenance.manage', true),
('maintenance_manager', 'reports.view', true)
ON CONFLICT DO NOTHING;

-- المشرف
INSERT INTO public.role_permissions (role_code, permission_key, allowed) VALUES
('supervisor', 'assets.view', true),
('supervisor', 'work_orders.view', true),
('supervisor', 'work_orders.create', true),
('supervisor', 'work_orders.edit', true),
('supervisor', 'work_orders.assign', true),
('supervisor', 'work_orders.approve', true),
('supervisor', 'teams.view', true),
('supervisor', 'maintenance.view', true),
('supervisor', 'reports.view', true)
ON CONFLICT DO NOTHING;

-- المهندس
INSERT INTO public.role_permissions (role_code, permission_key, allowed) VALUES
('engineer', 'assets.view', true),
('engineer', 'work_orders.view', true),
('engineer', 'work_orders.create', true),
('engineer', 'work_orders.edit', true),
('engineer', 'work_orders.approve', true),
('engineer', 'maintenance.view', true),
('engineer', 'maintenance.manage', true),
('engineer', 'reports.view', true)
ON CONFLICT DO NOTHING;

-- الفني
INSERT INTO public.role_permissions (role_code, permission_key, allowed) VALUES
('technician', 'assets.view', true),
('technician', 'work_orders.view', true),
('technician', 'work_orders.create', true),
('technician', 'work_orders.edit', true),
('technician', 'maintenance.view', true)
ON CONFLICT DO NOTHING;

-- مقدم الطلب
INSERT INTO public.role_permissions (role_code, permission_key, allowed) VALUES
('requester', 'work_orders.view', true),
('requester', 'work_orders.create', true)
ON CONFLICT DO NOTHING;
```

---

## الخطوة 7: إعداد الكود Frontend

### 7.1 Hook الصلاحيات (usePermissions.ts)

```typescript
// src/hooks/usePermissions.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PermissionKey = string;
export type PermissionEffect = 'grant' | 'deny';

export interface UserPermissionsInfo {
  loading: boolean;
  error?: string;
  allPermissions: PermissionKey[];
  hasPermission: (key: PermissionKey, hospitalId?: string | null) => boolean;
  hasAnyPermission: (keys: PermissionKey[], hospitalId?: string | null) => boolean;
  hasAllPermissions: (keys: PermissionKey[], hospitalId?: string | null) => boolean;
  refetch: () => Promise<void>;
}

interface PermissionsCache {
  permissions: Set<PermissionKey>;
  userOverrides: Map<string, PermissionEffect>;
  hospitalOverrides: Map<string, Map<string, PermissionEffect>>;
}

export function usePermissions(
  userId: string | null,
  hospitalId: string | null = null
): UserPermissionsInfo {
  const [cache, setCache] = useState<PermissionsCache>({
    permissions: new Set(),
    userOverrides: new Map(),
    hospitalOverrides: new Map(),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadPermissions = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(undefined);

      // استدعاء الدالة المخزنة للحصول على الصلاحيات الفعّالة
      const [effectivePermsResult, allUserOverridesResult] = await Promise.all([
        supabase.rpc('get_effective_permissions', { 
          _user_id: userId,
          _hospital_id: hospitalId 
        }),
        supabase
          .from('user_permissions')
          .select('permission_key, effect, hospital_id')
          .eq('user_id', userId),
      ]);

      if (effectivePermsResult.error) throw effectivePermsResult.error;
      if (allUserOverridesResult.error) throw allUserOverridesResult.error;

      const newCache: PermissionsCache = {
        permissions: new Set<PermissionKey>(),
        userOverrides: new Map<string, PermissionEffect>(),
        hospitalOverrides: new Map<string, Map<string, PermissionEffect>>(),
      };

      // إضافة الصلاحيات الفعّالة
      (effectivePermsResult.data || []).forEach((row: any) => {
        const key = row.permission_key;
        if (key) {
          newCache.permissions.add(key as PermissionKey);
        }
      });

      // معالجة الاستثناءات
      allUserOverridesResult.data?.forEach((up) => {
        if (!up.hospital_id) {
          newCache.userOverrides.set(up.permission_key, up.effect as PermissionEffect);
        } else {
          if (!newCache.hospitalOverrides.has(up.hospital_id)) {
            newCache.hospitalOverrides.set(up.hospital_id, new Map());
          }
          newCache.hospitalOverrides
            .get(up.hospital_id)!
            .set(up.permission_key, up.effect as PermissionEffect);
        }
      });

      setCache(newCache);
    } catch (err: any) {
      console.error('Error loading permissions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, hospitalId]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const hasPermission = useCallback(
    (key: PermissionKey, hospitalId?: string | null): boolean => {
      // تحقق من الرفض على مستوى المستشفى أولاً
      if (hospitalId) {
        const hospitalOverrides = cache.hospitalOverrides.get(hospitalId);
        if (hospitalOverrides?.get(key) === 'deny') return false;
        if (hospitalOverrides?.get(key) === 'grant') return true;
      }

      // تحقق من الرفض العام
      if (cache.userOverrides.get(key) === 'deny') return false;
      if (cache.userOverrides.get(key) === 'grant') return true;

      // تحقق من الصلاحيات الأساسية
      return cache.permissions.has(key);
    },
    [cache]
  );

  const hasAnyPermission = useCallback(
    (keys: PermissionKey[], hospitalId?: string | null): boolean => {
      return keys.some((key) => hasPermission(key, hospitalId));
    },
    [hasPermission]
  );

  const hasAllPermissions = useCallback(
    (keys: PermissionKey[], hospitalId?: string | null): boolean => {
      return keys.every((key) => hasPermission(key, hospitalId));
    },
    [hasPermission]
  );

  const allPermissions = useMemo(() => Array.from(cache.permissions), [cache.permissions]);

  return {
    loading,
    error,
    allPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refetch: loadPermissions,
  };
}
```

### 7.2 Hook المستخدم الحالي (useCurrentUser.ts)

```typescript
// src/hooks/useCurrentUser.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from './usePermissions';
import type { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  full_name: string;
  full_name_ar?: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  hospital_id?: string;
  is_active: boolean;
}

interface UserRole {
  role: string;
  hospital_id?: string;
}

interface CustomUserRole {
  role_code: string;
  hospital_id?: string;
  is_primary?: boolean;
}

export interface CurrentUserInfo {
  user: User | null;
  profile: Profile | null;
  roles: UserRole[];
  customRoles: CustomUserRole[];
  hospitalId: string | null;
  primaryRole: string | null;
  loading: boolean;
  error?: string;
  
  // الصلاحيات
  permissions: ReturnType<typeof usePermissions>;
  
  // أعلام الأدوار
  isGlobalAdmin: boolean;
  isHospitalAdmin: boolean;
  isFacilityManager: boolean;
  isMaintenanceManager: boolean;
  isSupervisor: boolean;
  isEngineer: boolean;
  isTechnician: boolean;
  
  // أعلام مجمعة
  canManageUsers: boolean;
  canAccessAdmin: boolean;
  
  refetch: () => Promise<void>;
}

export function useCurrentUser(): CurrentUserInfo {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomUserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const hospitalId = profile?.hospital_id || 
    customRoles.find(r => r.hospital_id)?.hospital_id || 
    null;

  const permissions = usePermissions(user?.id || null, hospitalId);

  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);

      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        setUser(null);
        setProfile(null);
        setRoles([]);
        setCustomRoles([]);
        return;
      }

      setUser(authUser);

      // جلب البيانات بالتوازي
      const [profileResult, rolesResult, customRolesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single(),
        supabase
          .from('user_roles')
          .select('role, hospital_id')
          .eq('user_id', authUser.id),
        supabase
          .from('user_custom_roles')
          .select('role_code, hospital_id, is_primary')
          .eq('user_id', authUser.id),
      ]);

      if (profileResult.data) {
        setProfile(profileResult.data as Profile);
      }

      setRoles(rolesResult.data || []);
      setCustomRoles(customRolesResult.data || []);

    } catch (err: any) {
      console.error('Error loading user data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUserData();
    });

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  // حساب الأدوار
  const allRoleCodes = [
    ...roles.map(r => r.role),
    ...customRoles.map(r => r.role_code)
  ];

  const isGlobalAdmin = allRoleCodes.includes('global_admin');
  const isHospitalAdmin = allRoleCodes.includes('hospital_admin');
  const isFacilityManager = allRoleCodes.includes('facility_manager');
  const isMaintenanceManager = allRoleCodes.includes('maintenance_manager');
  const isSupervisor = allRoleCodes.includes('supervisor');
  const isEngineer = allRoleCodes.includes('engineer') || allRoleCodes.includes('eng');
  const isTechnician = allRoleCodes.includes('technician');

  const primaryRole = customRoles.find(r => r.is_primary)?.role_code || 
    customRoles[0]?.role_code || 
    roles[0]?.role || 
    null;

  const canManageUsers = isGlobalAdmin || isHospitalAdmin;
  const canAccessAdmin = permissions.hasPermission('admin_access');

  return {
    user,
    profile,
    roles,
    customRoles,
    hospitalId,
    primaryRole,
    loading: loading || permissions.loading,
    error,
    permissions,
    isGlobalAdmin,
    isHospitalAdmin,
    isFacilityManager,
    isMaintenanceManager,
    isSupervisor,
    isEngineer,
    isTechnician,
    canManageUsers,
    canAccessAdmin,
    refetch: loadUserData,
  };
}
```

### 7.3 استخدام الصلاحيات في المكونات

```tsx
// مثال: حماية مكون
import { useCurrentUser } from '@/hooks/useCurrentUser';

function ProtectedComponent() {
  const { permissions, loading, canAccessAdmin } = useCurrentUser();

  if (loading) return <LoadingSpinner />;
  
  // التحقق من صلاحية محددة
  if (!permissions.hasPermission('assets.view')) {
    return <AccessDenied />;
  }

  // التحقق من أي صلاحية من مجموعة
  if (!permissions.hasAnyPermission(['assets.edit', 'assets.create'])) {
    return <ReadOnlyView />;
  }

  return <FullAccessView />;
}
```

```tsx
// مثال: إخفاء/إظهار عناصر
function ActionButtons() {
  const { permissions } = useCurrentUser();

  return (
    <div>
      {permissions.hasPermission('assets.create') && (
        <Button>إضافة أصل</Button>
      )}
      
      {permissions.hasPermission('assets.edit') && (
        <Button>تعديل</Button>
      )}
      
      {permissions.hasPermission('assets.delete') && (
        <Button variant="destructive">حذف</Button>
      )}
    </div>
  );
}
```

---

## اختبار النظام

### اختبار 1: التحقق من الدوال

```sql
-- اختبار has_role
SELECT public.has_role('USER_UUID', 'global_admin');

-- اختبار has_role_by_code
SELECT public.has_role_by_code('USER_UUID', 'hospital_admin');

-- اختبار get_effective_permissions
SELECT * FROM public.get_effective_permissions('USER_UUID', 'HOSPITAL_UUID');

-- اختبار has_permission_v2
SELECT public.has_permission_v2('USER_UUID', 'assets.view', 'HOSPITAL_UUID');
```

### اختبار 2: التحقق من RLS

```sql
-- تسجيل دخول كمستخدم معين
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "USER_UUID"}';

-- محاولة الوصول للبيانات
SELECT * FROM public.work_orders;  -- يجب أن يعرض فقط المسموح
```

### اختبار 3: سيناريوهات الصلاحيات

```sql
-- إضافة استثناء للمستخدم
INSERT INTO public.user_permissions (user_id, permission_key, effect)
VALUES ('USER_UUID', 'assets.delete', 'deny');

-- التحقق من أن الصلاحية مرفوضة الآن
SELECT public.has_permission_v2('USER_UUID', 'assets.delete', NULL);
-- يجب أن يعود false حتى لو كان المستخدم global_admin
```

---

## ملاحظات أمنية مهمة

1. **لا تخزن الأدوار في localStorage** - استخدم دائماً التحقق من الخادم
2. **استخدم SECURITY DEFINER** بحذر - فقط للدوال التي تحتاجها
3. **لا تعتمد على Frontend فقط** - RLS هي خط الدفاع الحقيقي
4. **راقب الاستثناءات** - وثّق سبب كل استثناء
5. **استخدم تواريخ انتهاء** - للصلاحيات المؤقتة

---

## المراجع

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Security Definer](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [PERMISSIONS_TECHNICAL_DOCS.md](./PERMISSIONS_TECHNICAL_DOCS.md)
- [DATABASE_SEED.sql](./DATABASE_SEED.sql)
