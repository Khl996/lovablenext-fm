-- 2. إضافة حالة المستشفيات (active, suspended, archived)
ALTER TABLE public.hospitals 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE public.hospitals 
ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS suspended_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS suspension_reason text,
ADD COLUMN IF NOT EXISTS notes text;

-- 3. إنشاء جدول لربط المشرفين بالمباني
CREATE TABLE IF NOT EXISTS public.supervisor_buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(supervisor_id, building_id)
);

ALTER TABLE public.supervisor_buildings ENABLE ROW LEVEL SECURITY;

-- RLS Policies لجدول supervisor_buildings
CREATE POLICY "Users can view supervisor buildings in their hospital"
ON public.supervisor_buildings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.buildings
    WHERE buildings.id = supervisor_buildings.building_id
    AND buildings.hospital_id = get_user_hospital(auth.uid())
  )
);

CREATE POLICY "Admins can manage supervisor buildings"
ON public.supervisor_buildings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.buildings
    WHERE buildings.id = supervisor_buildings.building_id
    AND buildings.hospital_id = get_user_hospital(auth.uid())
    AND (
      has_role(auth.uid(), 'hospital_admin'::app_role) 
      OR has_role(auth.uid(), 'facility_manager'::app_role)
      OR has_role(auth.uid(), 'global_admin'::app_role)
    )
  )
);

-- 4. تحديث RLS policies للمستشفيات لإضافة صلاحيات الحذف والتعليق
DROP POLICY IF EXISTS "Global admins can insert hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Admins can update their hospital" ON public.hospitals;

CREATE POLICY "Global admins can manage all hospitals"
ON public.hospitals
FOR ALL
USING (has_role(auth.uid(), 'global_admin'::app_role));

CREATE POLICY "Hospital admins can update their own hospital"
ON public.hospitals
FOR UPDATE
USING (
  id = get_user_hospital(auth.uid()) 
  AND has_role(auth.uid(), 'hospital_admin'::app_role)
);

-- 5. إضافة notification preferences لـ work orders
ALTER TABLE public.work_orders
ADD COLUMN IF NOT EXISTS notify_supervisor boolean DEFAULT true;

-- 6. تحديث permissions لإضافة صلاحيات جديدة
INSERT INTO public.permissions (key, name, name_ar, category, description)
VALUES 
  ('hospitals.suspend', 'Suspend Hospital', 'تعليق مستشفى', 'Hospitals', 'Can suspend/activate hospitals'),
  ('hospitals.delete', 'Delete Hospital', 'حذف مستشفى', 'Hospitals', 'Can delete hospitals'),
  ('users.create', 'Create Users', 'إنشاء مستخدمين', 'Users', 'Can create new users'),
  ('teams.manage', 'Manage Teams', 'إدارة الفرق', 'Teams', 'Can manage teams and team members'),
  ('work_orders.approve', 'Approve Work Orders', 'اعتماد أوامر العمل', 'Work Orders', 'Can approve completed work orders'),
  ('buildings.supervise', 'Supervise Buildings', 'الإشراف على المباني', 'Buildings', 'Can supervise specific buildings')
ON CONFLICT (key) DO NOTHING;

-- 7. منح صلاحيات للأدوار
INSERT INTO public.role_permissions (role, permission_key, allowed)
VALUES 
  -- Global Admin - كل الصلاحيات
  ('global_admin', 'hospitals.suspend', true),
  ('global_admin', 'hospitals.delete', true),
  ('global_admin', 'users.create', true),
  ('global_admin', 'teams.manage', true),
  ('global_admin', 'work_orders.approve', true),
  ('global_admin', 'buildings.supervise', true),
  
  -- Hospital Admin
  ('hospital_admin', 'users.create', true),
  ('hospital_admin', 'teams.manage', true),
  ('hospital_admin', 'work_orders.approve', true),
  
  -- Facility Manager
  ('facility_manager', 'users.create', true),
  ('facility_manager', 'teams.manage', true),
  ('facility_manager', 'work_orders.approve', true),
  ('facility_manager', 'buildings.supervise', true),
  
  -- Maintenance Manager
  ('maintenance_manager', 'teams.manage', true),
  ('maintenance_manager', 'work_orders.approve', true),
  
  -- Supervisor
  ('supervisor', 'work_orders.approve', true),
  ('supervisor', 'buildings.supervise', true),
  
  -- Engineer
  ('engineer', 'work_orders.approve', true)
ON CONFLICT (role, permission_key) DO UPDATE SET allowed = EXCLUDED.allowed;