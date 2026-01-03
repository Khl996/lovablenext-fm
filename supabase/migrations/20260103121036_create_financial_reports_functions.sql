/*
  # إنشاء دوال التقارير المالية
  
  ## نظرة عامة
  هذا الملف ينشئ الدوال المطلوبة لحساب وعرض التقارير المالية للمنصة
  
  ## الدوال الجديدة
  
  ### 1. get_financial_metrics
  تحسب المقاييس المالية الأساسية:
  - MRR (Monthly Recurring Revenue)
  - ARR (Annual Recurring Revenue)
  - Churn Rate
  - Average Revenue Per Tenant
  - Growth Rate
  
  ### 2. get_revenue_trend
  تحسب اتجاه الإيرادات عبر الزمن
  
  ### 3. get_tenant_revenue_breakdown
  توزيع الإيرادات حسب المستأجر
  
  ## الأمان
  - جميع الدوال محمية بـ SECURITY DEFINER
  - تحقق من صلاحيات platform owner
*/

-- 1. دالة حساب المقاييس المالية
CREATE OR REPLACE FUNCTION get_financial_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_total_active_tenants INTEGER;
  v_mrr NUMERIC;
  v_arr NUMERIC;
  v_total_revenue_this_month NUMERIC;
  v_total_revenue_last_month NUMERIC;
  v_growth_rate NUMERIC;
  v_average_revenue_per_tenant NUMERIC;
  v_churn_rate NUMERIC;
  v_churned_tenants INTEGER;
BEGIN
  -- التحقق من صلاحيات platform owner
  IF NOT has_permission_v2(auth.uid(), 'platform.view_financials') THEN
    RAISE EXCEPTION 'Unauthorized access';
  END IF;

  -- حساب عدد المستأجرين النشطين
  SELECT COUNT(*) INTO v_total_active_tenants
  FROM hospitals
  WHERE subscription_status = 'active';

  -- حساب MRR (المستأجرين النشطين * متوسط السعر الشهري)
  SELECT COALESCE(SUM(
    CASE 
      WHEN billing_cycle = 'yearly' THEN base_price / 12
      WHEN billing_cycle = 'quarterly' THEN base_price / 3
      ELSE base_price
    END
  ), 0) INTO v_mrr
  FROM hospitals
  WHERE subscription_status = 'active'
    AND base_price IS NOT NULL;

  -- حساب ARR
  v_arr := v_mrr * 12;

  -- حساب إيرادات هذا الشهر
  SELECT COALESCE(SUM(total), 0) INTO v_total_revenue_this_month
  FROM invoices
  WHERE status = 'paid'
    AND DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', CURRENT_DATE);

  -- حساب إيرادات الشهر الماضي
  SELECT COALESCE(SUM(total), 0) INTO v_total_revenue_last_month
  FROM invoices
  WHERE status = 'paid'
    AND DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month');

  -- حساب معدل النمو
  IF v_total_revenue_last_month > 0 THEN
    v_growth_rate := (v_total_revenue_this_month - v_total_revenue_last_month) / v_total_revenue_last_month;
  ELSE
    v_growth_rate := 0;
  END IF;

  -- حساب متوسط الإيراد لكل مستأجر
  IF v_total_active_tenants > 0 THEN
    v_average_revenue_per_tenant := v_mrr / v_total_active_tenants;
  ELSE
    v_average_revenue_per_tenant := 0;
  END IF;

  -- حساب معدل التوقف (Churn Rate) - المستأجرين الذين توقفوا في آخر 30 يوم
  SELECT COUNT(*) INTO v_churned_tenants
  FROM hospitals
  WHERE subscription_status IN ('cancelled', 'expired')
    AND suspended_at >= CURRENT_DATE - INTERVAL '30 days';

  IF v_total_active_tenants + v_churned_tenants > 0 THEN
    v_churn_rate := v_churned_tenants::NUMERIC / (v_total_active_tenants + v_churned_tenants)::NUMERIC;
  ELSE
    v_churn_rate := 0;
  END IF;

  -- بناء النتيجة
  v_result := json_build_object(
    'mrr', v_mrr,
    'arr', v_arr,
    'churn_rate', v_churn_rate,
    'average_revenue_per_tenant', v_average_revenue_per_tenant,
    'total_active_tenants', v_total_active_tenants,
    'total_revenue_this_month', v_total_revenue_this_month,
    'total_revenue_last_month', v_total_revenue_last_month,
    'growth_rate', v_growth_rate
  );

  RETURN v_result;
END;
$$;

-- 2. دالة اتجاه الإيرادات
CREATE OR REPLACE FUNCTION get_revenue_trend(time_range TEXT DEFAULT '6months')
RETURNS TABLE (
  month TEXT,
  revenue NUMERIC,
  expenses NUMERIC,
  profit NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_months INTEGER;
BEGIN
  -- التحقق من الصلاحيات
  IF NOT has_permission_v2(auth.uid(), 'platform.view_financials') THEN
    RAISE EXCEPTION 'Unauthorized access';
  END IF;

  -- تحديد عدد الأشهر
  v_months := CASE time_range
    WHEN '3months' THEN 3
    WHEN '6months' THEN 6
    WHEN '12months' THEN 12
    ELSE 12
  END;

  RETURN QUERY
  WITH monthly_data AS (
    SELECT 
      TO_CHAR(DATE_TRUNC('month', paid_at), 'YYYY-MM') as month_key,
      TO_CHAR(DATE_TRUNC('month', paid_at), 'Mon YYYY') as month_label,
      SUM(total) as total_revenue
    FROM invoices
    WHERE status = 'paid'
      AND paid_at >= CURRENT_DATE - (v_months || ' months')::INTERVAL
    GROUP BY DATE_TRUNC('month', paid_at)
    ORDER BY DATE_TRUNC('month', paid_at)
  )
  SELECT 
    month_label::TEXT,
    COALESCE(total_revenue, 0),
    0::NUMERIC as expenses,
    COALESCE(total_revenue, 0) as profit
  FROM monthly_data;
END;
$$;

-- 3. دالة توزيع الإيرادات حسب المستأجر
CREATE OR REPLACE FUNCTION get_tenant_revenue_breakdown()
RETURNS TABLE (
  tenant_name TEXT,
  revenue NUMERIC,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- التحقق من الصلاحيات
  IF NOT has_permission_v2(auth.uid(), 'platform.view_financials') THEN
    RAISE EXCEPTION 'Unauthorized access';
  END IF;

  RETURN QUERY
  SELECT 
    h.name::TEXT,
    COALESCE(SUM(i.total), 0) as total_revenue,
    h.subscription_status::TEXT
  FROM hospitals h
  LEFT JOIN invoices i ON i.tenant_id = h.id AND i.status = 'paid'
  WHERE h.subscription_status IN ('active', 'trial')
  GROUP BY h.id, h.name, h.subscription_status
  ORDER BY total_revenue DESC;
END;
$$;

-- 4. دالة للحصول على إحصائيات الفواتير
CREATE OR REPLACE FUNCTION get_invoice_statistics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_total_invoices INTEGER;
  v_paid_invoices INTEGER;
  v_overdue_invoices INTEGER;
  v_draft_invoices INTEGER;
  v_total_amount NUMERIC;
  v_paid_amount NUMERIC;
  v_overdue_amount NUMERIC;
BEGIN
  -- التحقق من الصلاحيات
  IF NOT has_permission_v2(auth.uid(), 'platform.view_financials') THEN
    RAISE EXCEPTION 'Unauthorized access';
  END IF;

  -- حساب الإحصائيات
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'paid'),
    COUNT(*) FILTER (WHERE status = 'overdue'),
    COUNT(*) FILTER (WHERE status = 'draft'),
    COALESCE(SUM(total), 0),
    COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0),
    COALESCE(SUM(total) FILTER (WHERE status = 'overdue'), 0)
  INTO
    v_total_invoices,
    v_paid_invoices,
    v_overdue_invoices,
    v_draft_invoices,
    v_total_amount,
    v_paid_amount,
    v_overdue_amount
  FROM invoices
  WHERE invoice_date >= CURRENT_DATE - INTERVAL '12 months';

  v_result := json_build_object(
    'total_invoices', v_total_invoices,
    'paid_invoices', v_paid_invoices,
    'overdue_invoices', v_overdue_invoices,
    'draft_invoices', v_draft_invoices,
    'total_amount', v_total_amount,
    'paid_amount', v_paid_amount,
    'overdue_amount', v_overdue_amount
  );

  RETURN v_result;
END;
$$;

-- Comments
COMMENT ON FUNCTION get_financial_metrics() IS 'حساب المقاييس المالية الأساسية للمنصة';
COMMENT ON FUNCTION get_revenue_trend(TEXT) IS 'حساب اتجاه الإيرادات عبر الزمن';
COMMENT ON FUNCTION get_tenant_revenue_breakdown() IS 'توزيع الإيرادات حسب المستأجر';
COMMENT ON FUNCTION get_invoice_statistics() IS 'إحصائيات الفواتير';
