/*
  # توحيد جداول tenants و hospitals - المرحلة 2
  
  ## نظرة عامة
  إنشاء view موحد يجمع البيانات وتحديث المراجع
  
  ## الخطوات:
  1. التحقق من الأعمدة الموجودة في كل جدول
  2. تحديث المراجع حسب الحاجة
  3. إنشاء دوال مساعدة
  
  ## ملاحظات
  - آمن على البيانات
  - يتعامل مع الاختلافات بين الجداول
*/

-- 1. إنشاء view موحد باسم tenants_unified
CREATE OR REPLACE VIEW tenants_unified AS
SELECT 
  h.id,
  h.id as tenant_id,
  h.code,
  h.code as tenant_code,
  h.name,
  h.name as tenant_name,
  h.name_ar,
  h.name_ar as tenant_name_ar,
  h.slug,
  h.type,
  h.type as tenant_type,
  h.logo_url,
  h.logo_url as tenant_logo,
  h.settings,
  h.status,
  h.status as tenant_status,
  h.address,
  h.phone,
  h.email,
  h.notes,
  h.subscription_status,
  h.plan_id,
  h.subscription_starts_at,
  h.subscription_ends_at,
  h.trial_ends_at,
  h.grace_period_days,
  h.grace_period_started_at,
  h.billing_cycle,
  h.payment_method,
  h.last_payment_date,
  h.next_billing_date,
  h.auto_renew,
  h.base_price,
  h.custom_pricing,
  h.discount_percentage,
  h.discount_fixed_amount,
  h.max_users,
  h.max_assets,
  h.max_work_orders_per_month,
  h.max_storage_mb,
  h.custom_limits,
  h.enabled_modules,
  h.module_configurations,
  h.workflow_customizations,
  h.primary_color,
  h.secondary_color,
  h.custom_domain,
  h.email_signature_template,
  h.technical_contact_name,
  h.technical_contact_email,
  h.suspended_at,
  h.suspended_by,
  h.suspension_reason,
  h.created_at,
  h.updated_at
FROM hospitals h;

-- 2. إنشاء دالة get_current_tenant (تستخدم tenant_id من profiles)
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN v_tenant_id;
END;
$$;

-- 3. إنشاء دالة للحصول على معلومات المستأجر
CREATE OR REPLACE FUNCTION get_tenant_info(p_tenant_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_result JSON;
BEGIN
  v_tenant_id := COALESCE(p_tenant_id, get_current_tenant());
  
  SELECT json_build_object(
    'id', id,
    'code', code,
    'name', name,
    'name_ar', name_ar,
    'slug', slug,
    'type', type,
    'logo_url', logo_url,
    'status', status,
    'subscription_status', subscription_status,
    'plan_id', plan_id,
    'enabled_modules', enabled_modules,
    'primary_color', primary_color,
    'secondary_color', secondary_color,
    'phone', phone,
    'email', email,
    'address', address
  ) INTO v_result
  FROM hospitals
  WHERE id = v_tenant_id;
  
  RETURN v_result;
END;
$$;

-- 4. إنشاء دالة للتحقق من أن المستأجر نشط
CREATE OR REPLACE FUNCTION is_tenant_active(p_tenant_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_is_active BOOLEAN;
BEGIN
  v_tenant_id := COALESCE(p_tenant_id, get_current_tenant());
  
  IF v_tenant_id IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT 
    (subscription_status IN ('active', 'trial') AND status = 'active')
  INTO v_is_active
  FROM hospitals
  WHERE id = v_tenant_id;
  
  RETURN COALESCE(v_is_active, false);
END;
$$;

-- 5. إنشاء دالة للحصول على حدود المستأجر
CREATE OR REPLACE FUNCTION get_tenant_limits_v2(p_tenant_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_result JSON;
BEGIN
  v_tenant_id := COALESCE(p_tenant_id, get_current_tenant());
  
  SELECT json_build_object(
    'max_users', max_users,
    'max_assets', max_assets,
    'max_work_orders_per_month', max_work_orders_per_month,
    'max_storage_mb', max_storage_mb,
    'custom_limits', custom_limits,
    'enabled_modules', enabled_modules
  ) INTO v_result
  FROM hospitals
  WHERE id = v_tenant_id;
  
  RETURN v_result;
END;
$$;

-- 6. إنشاء دالة لحساب استخدام المستأجر
CREATE OR REPLACE FUNCTION calculate_tenant_usage_stats(p_tenant_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_result JSON;
  v_total_users INTEGER;
  v_total_assets INTEGER;
  v_total_work_orders_this_month INTEGER;
  v_max_users INTEGER;
  v_max_assets INTEGER;
  v_max_work_orders INTEGER;
BEGIN
  v_tenant_id := COALESCE(p_tenant_id, get_current_tenant());
  
  IF v_tenant_id IS NULL THEN
    RETURN json_build_object('error', 'No tenant found');
  END IF;
  
  -- حساب عدد المستخدمين
  SELECT COUNT(*) INTO v_total_users
  FROM profiles
  WHERE tenant_id = v_tenant_id
    AND is_active = true;
  
  -- حساب عدد الأصول (التحقق من العمود الموجود)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assets' AND column_name = 'tenant_id'
  ) THEN
    SELECT COUNT(*) INTO v_total_assets
    FROM assets
    WHERE tenant_id = v_tenant_id;
  ELSE
    SELECT COUNT(*) INTO v_total_assets
    FROM assets
    WHERE hospital_id = v_tenant_id;
  END IF;
  
  -- حساب عدد أوامر العمل هذا الشهر
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'tenant_id'
  ) THEN
    SELECT COUNT(*) INTO v_total_work_orders_this_month
    FROM work_orders
    WHERE tenant_id = v_tenant_id
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);
  ELSE
    SELECT COUNT(*) INTO v_total_work_orders_this_month
    FROM work_orders
    WHERE hospital_id = v_tenant_id
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);
  END IF;
  
  -- الحصول على الحدود
  SELECT 
    max_users,
    max_assets,
    max_work_orders_per_month
  INTO 
    v_max_users,
    v_max_assets,
    v_max_work_orders
  FROM hospitals
  WHERE id = v_tenant_id;
  
  -- بناء النتيجة
  v_result := json_build_object(
    'users', json_build_object(
      'current', v_total_users,
      'max', v_max_users,
      'percentage', CASE 
        WHEN v_max_users > 0 THEN ROUND((v_total_users::NUMERIC / v_max_users::NUMERIC * 100)::NUMERIC, 2)
        ELSE 0 
      END
    ),
    'assets', json_build_object(
      'current', v_total_assets,
      'max', v_max_assets,
      'percentage', CASE 
        WHEN v_max_assets > 0 THEN ROUND((v_total_assets::NUMERIC / v_max_assets::NUMERIC * 100)::NUMERIC, 2)
        ELSE 0 
      END
    ),
    'work_orders', json_build_object(
      'current', v_total_work_orders_this_month,
      'max', v_max_work_orders,
      'percentage', CASE 
        WHEN v_max_work_orders > 0 THEN ROUND((v_total_work_orders_this_month::NUMERIC / v_max_work_orders::NUMERIC * 100)::NUMERIC, 2)
        ELSE 0 
      END
    )
  );
  
  RETURN v_result;
END;
$$;

-- Comments
COMMENT ON VIEW tenants_unified IS 'عرض موحد يجمع بيانات المستأجرين من hospitals بمصطلحات tenant';
COMMENT ON FUNCTION get_current_tenant() IS 'الحصول على معرف المستأجر الحالي من profiles.tenant_id';
COMMENT ON FUNCTION get_tenant_info(UUID) IS 'الحصول على معلومات المستأجر الكاملة';
COMMENT ON FUNCTION is_tenant_active(UUID) IS 'التحقق من أن المستأجر نشط وله اشتراك فعال';
COMMENT ON FUNCTION get_tenant_limits_v2(UUID) IS 'الحصول على حدود المستأجر';
COMMENT ON FUNCTION calculate_tenant_usage_stats(UUID) IS 'حساب إحصائيات الاستخدام مقابل الحدود';

-- تقرير النتائج
DO $$
DECLARE
  v_hospitals_count INTEGER;
  v_profiles_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_hospitals_count FROM hospitals;
  SELECT COUNT(*) INTO v_profiles_count FROM profiles WHERE tenant_id IS NOT NULL;
  
  RAISE NOTICE 'Migration Step 2 completed:';
  RAISE NOTICE '- Total tenants in hospitals: %', v_hospitals_count;
  RAISE NOTICE '- Profiles with tenant_id: %', v_profiles_count;
  RAISE NOTICE '- Unified view created: tenants_unified';
  RAISE NOTICE '- Helper functions created successfully';
END $$;
