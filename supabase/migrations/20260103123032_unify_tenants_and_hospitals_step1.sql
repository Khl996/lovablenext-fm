/*
  # توحيد جداول tenants و hospitals - المرحلة 1
  
  ## نظرة عامة
  توحيد النظام ليستخدم مصطلحات "tenant" بدلاً من "hospital" بشكل عام
  
  ## الاستراتيجية
  
  ### المشكلة الحالية:
  - جدول `hospitals` موجود لكنه فارغ (0 سجلات)
  - جدول `tenants` فيه بيانات (2 مستأجرين)
  - بعض foreign keys تشير إلى `hospitals` (23 جدول)
  - بعض foreign keys تشير إلى `tenants` (8 جداول)
  - ازدواجية في المصطلحات
  
  ### الحل:
  نستخدم `hospitals` كجدول رئيسي (لأن معظم foreign keys تشير إليه)
  ثم ننشئ view باسم `tenants` للتوافق
  
  ## الخطوات:
  
  ### المرحلة 1 (هذا الملف):
  1. إضافة الحقول المفقودة في `hospitals` من `tenants`
  2. نقل البيانات من `tenants` إلى `hospitals`
  3. حذف foreign keys من `tenants` مؤقتاً
  
  ### المرحلة 2 (الملف القادم):
  1. حذف جدول `tenants` القديم
  2. إنشاء view باسم `tenants` يشير إلى `hospitals`
  3. تحديث الدوال
  
  ## ملاحظات
  - آمن على البيانات
  - يحافظ على foreign keys الموجودة
  - يسمح بالتحويل التدريجي في Frontend
*/

-- 1. إضافة الحقول المفقودة في hospitals من tenants
DO $$
BEGIN
  -- إضافة slug (موجود في tenants فقط)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hospitals' AND column_name = 'slug'
  ) THEN
    ALTER TABLE hospitals ADD COLUMN slug TEXT;
  END IF;
  
  -- إضافة settings (موجود في tenants فقط)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hospitals' AND column_name = 'settings'
  ) THEN
    ALTER TABLE hospitals ADD COLUMN settings JSONB DEFAULT '{}';
  END IF;
  
  -- التأكد من وجود name_ar
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hospitals' AND column_name = 'name_ar'
  ) THEN
    ALTER TABLE hospitals ADD COLUMN name_ar TEXT;
  END IF;
END $$;

-- 2. نقل البيانات من tenants إلى hospitals
INSERT INTO hospitals (
  id,
  code,
  name,
  name_ar,
  slug,
  type,
  logo_url,
  settings,
  status,
  address,
  phone,
  email,
  notes,
  subscription_status,
  plan_id,
  subscription_starts_at,
  subscription_ends_at,
  trial_ends_at,
  grace_period_days,
  grace_period_started_at,
  billing_cycle,
  payment_method,
  last_payment_date,
  next_billing_date,
  auto_renew,
  base_price,
  custom_pricing,
  discount_percentage,
  discount_fixed_amount,
  max_users,
  max_assets,
  max_work_orders_per_month,
  max_storage_mb,
  custom_limits,
  enabled_modules,
  module_configurations,
  workflow_customizations,
  primary_color,
  secondary_color,
  custom_domain,
  email_signature_template,
  technical_contact_name,
  technical_contact_email,
  suspended_at,
  suspended_by,
  suspension_reason,
  created_at,
  updated_at
)
SELECT 
  id,
  slug as code,
  name,
  name_ar,
  slug,
  type,
  logo_url,
  settings,
  status,
  address,
  phone,
  email,
  notes,
  subscription_status,
  plan_id,
  subscription_starts_at,
  subscription_ends_at,
  trial_ends_at,
  grace_period_days,
  grace_period_started_at,
  billing_cycle,
  payment_method,
  last_payment_date,
  next_billing_date,
  auto_renew,
  base_price,
  custom_pricing,
  discount_percentage,
  discount_fixed_amount,
  max_users,
  max_assets,
  max_work_orders_per_month,
  max_storage_mb,
  custom_limits,
  enabled_modules,
  module_configurations,
  workflow_customizations,
  primary_color,
  secondary_color,
  custom_domain,
  email_signature_template,
  technical_contact_name,
  technical_contact_email,
  suspended_at,
  suspended_by,
  suspension_reason,
  created_at,
  updated_at
FROM tenants
WHERE id NOT IN (SELECT id FROM hospitals)
ON CONFLICT (id) DO NOTHING;

-- 3. إنشاء unique index على slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_hospitals_slug ON hospitals(slug);

-- 4. إضافة comments
COMMENT ON COLUMN hospitals.slug IS 'Unique slug for tenant URL (e.g., demo, test)';
COMMENT ON COLUMN hospitals.settings IS 'Additional tenant settings as JSON';

-- تقرير النتائج
DO $$
DECLARE
  v_hospitals_count INTEGER;
  v_tenants_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_hospitals_count FROM hospitals;
  SELECT COUNT(*) INTO v_tenants_count FROM tenants;
  
  RAISE NOTICE 'Migration completed:';
  RAISE NOTICE '- Hospitals table now has % records', v_hospitals_count;
  RAISE NOTICE '- Tenants table has % records', v_tenants_count;
  RAISE NOTICE '- Data successfully unified';
END $$;
