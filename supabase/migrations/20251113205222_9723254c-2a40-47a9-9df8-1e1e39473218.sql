-- إضافة عمود شعار المستشفى
ALTER TABLE public.hospitals
ADD COLUMN IF NOT EXISTS logo_url text;

-- إنشاء جدول الشركات المتعاقدة
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text NOT NULL,
  logo_url text,
  contact_person text,
  phone text,
  email text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- تمكين RLS على جدول الشركات
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- السماح للمستخدمين بعرض الشركات في مستشفاهم
CREATE POLICY "Users can view companies in their hospital"
ON public.companies
FOR SELECT
USING (hospital_id = get_user_hospital(auth.uid()));

-- السماح للإداريين بإدارة الشركات
CREATE POLICY "Admins can manage companies in their hospital"
ON public.companies
FOR ALL
USING (
  hospital_id = get_user_hospital(auth.uid()) AND (
    has_role(auth.uid(), 'hospital_admin'::app_role) OR 
    has_role(auth.uid(), 'facility_manager'::app_role) OR
    has_role(auth.uid(), 'global_admin'::app_role)
  )
);

-- إضافة عمود company_id لجدول work_orders
ALTER TABLE public.work_orders
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);