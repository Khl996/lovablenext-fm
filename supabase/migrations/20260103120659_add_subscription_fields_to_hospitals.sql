/*
  # إضافة حقول الاشتراك لجدول hospitals
  
  ## نظرة عامة
  هذا التحديث يضيف جميع الحقول المطلوبة لإدارة الاشتراكات والفوترة والحدود والتخصيصات
  لجدول hospitals بدلاً من إنشاء جدول tenants منفصل.
  
  ## التغييرات
  
  ### 1. حقول الاشتراك (Subscription Fields)
  - `subscription_status` - حالة الاشتراك (active, trial, expired, suspended)
  - `plan_id` - ربط بخطة الاشتراك
  - `subscription_starts_at` - تاريخ بداية الاشتراك
  - `subscription_ends_at` - تاريخ نهاية الاشتراك
  - `trial_ends_at` - تاريخ نهاية الفترة التجريبية
  - `grace_period_days` - عدد أيام السماح بعد انتهاء الاشتراك
  - `grace_period_started_at` - تاريخ بداية فترة السماح
  
  ### 2. حقول الفوترة (Billing Fields)
  - `billing_cycle` - دورة الفوترة (monthly, yearly)
  - `payment_method` - طريقة الدفع
  - `last_payment_date` - تاريخ آخر دفعة
  - `next_billing_date` - تاريخ الفاتورة القادمة
  - `auto_renew` - التجديد التلقائي
  
  ### 3. حقول التسعير (Pricing Fields)
  - `base_price` - السعر الأساسي
  - `custom_pricing` - تسعير مخصص (JSONB)
  - `discount_percentage` - نسبة الخصم
  - `discount_fixed_amount` - مبلغ الخصم الثابت
  
  ### 4. حقول الحدود (Limits Fields)
  - `max_users` - الحد الأقصى للمستخدمين
  - `max_assets` - الحد الأقصى للأصول
  - `max_work_orders_per_month` - الحد الأقصى لأوامر العمل شهرياً
  - `max_storage_mb` - الحد الأقصى للتخزين
  - `custom_limits` - حدود مخصصة (JSONB)
  
  ### 5. حقول التخصيص (Customization Fields)
  - `enabled_modules` - الوحدات المفعلة (JSONB)
  - `module_configurations` - إعدادات الوحدات (JSONB)
  - `workflow_customizations` - تخصيصات التدفق (JSONB)
  
  ### 6. حقول العلامة التجارية (Branding Fields)
  - `primary_color` - اللون الأساسي
  - `secondary_color` - اللون الثانوي
  - `custom_domain` - النطاق المخصص
  - `email_signature_template` - قالب توقيع البريد
  
  ### 7. حقول جهات الاتصال (Contact Fields)
  - `technical_contact_name` - اسم جهة الاتصال التقنية
  - `technical_contact_email` - بريد جهة الاتصال التقنية
  
  ## الأمان
  - جميع الحقول اختيارية مع قيم افتراضية مناسبة
  - RLS policies الموجودة ستطبق تلقائياً
  
  ## الملاحظات
  - هذا النهج يحافظ على جميع Foreign Keys الموجودة
  - لا يتطلب تعديل RLS policies
  - لا يتطلب تعديل الكود الموجود
  - يمكن ترحيل البيانات تدريجياً
*/

-- 1. حقول الاشتراك
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES subscription_plans(id);
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS subscription_starts_at TIMESTAMPTZ;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS grace_period_days INTEGER DEFAULT 7;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS grace_period_started_at TIMESTAMPTZ;

-- 2. حقول الفوترة
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly';
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS last_payment_date DATE;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS next_billing_date DATE;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;

-- 3. حقول التسعير
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS base_price NUMERIC;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS custom_pricing JSONB DEFAULT '{}';
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC DEFAULT 0;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS discount_fixed_amount NUMERIC DEFAULT 0;

-- 4. حقول الحدود
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 10;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS max_assets INTEGER DEFAULT 100;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS max_work_orders_per_month INTEGER;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS max_storage_mb INTEGER DEFAULT 1024;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS custom_limits JSONB DEFAULT '{}';

-- 5. حقول التخصيص
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS enabled_modules JSONB DEFAULT '["work_orders","assets","facilities","inventory","maintenance","teams"]';
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS module_configurations JSONB DEFAULT '{}';
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS workflow_customizations JSONB DEFAULT '{}';

-- 6. حقول العلامة التجارية
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#2563eb';
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#64748b';
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS custom_domain TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS email_signature_template TEXT;

-- 7. حقول جهات الاتصال
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS technical_contact_name TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS technical_contact_email TEXT;

-- إنشاء indexes لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_hospitals_subscription_status ON hospitals(subscription_status);
CREATE INDEX IF NOT EXISTS idx_hospitals_plan_id ON hospitals(plan_id);
CREATE INDEX IF NOT EXISTS idx_hospitals_subscription_ends_at ON hospitals(subscription_ends_at);
CREATE INDEX IF NOT EXISTS idx_hospitals_next_billing_date ON hospitals(next_billing_date);

-- إضافة check constraints
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_subscription_status') THEN
    ALTER TABLE hospitals ADD CONSTRAINT check_subscription_status 
      CHECK (subscription_status IN ('active', 'trial', 'expired', 'suspended', 'cancelled'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_billing_cycle') THEN
    ALTER TABLE hospitals ADD CONSTRAINT check_billing_cycle 
      CHECK (billing_cycle IN ('monthly', 'yearly', 'quarterly'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_discount_percentage') THEN
    ALTER TABLE hospitals ADD CONSTRAINT check_discount_percentage 
      CHECK (discount_percentage >= 0 AND discount_percentage <= 100);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_max_users') THEN
    ALTER TABLE hospitals ADD CONSTRAINT check_max_users 
      CHECK (max_users > 0);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_max_assets') THEN
    ALTER TABLE hospitals ADD CONSTRAINT check_max_assets 
      CHECK (max_assets > 0);
  END IF;
END $$;

-- إضافة comment للتوضيح
COMMENT ON COLUMN hospitals.subscription_status IS 'حالة الاشتراك: active, trial, expired, suspended, cancelled';
COMMENT ON COLUMN hospitals.plan_id IS 'ربط بخطة الاشتراك من جدول subscription_plans';
COMMENT ON COLUMN hospitals.enabled_modules IS 'قائمة الوحدات المفعلة للمستأجر';
COMMENT ON COLUMN hospitals.custom_pricing IS 'تسعير مخصص بصيغة JSON';
COMMENT ON COLUMN hospitals.custom_limits IS 'حدود مخصصة بصيغة JSON';
