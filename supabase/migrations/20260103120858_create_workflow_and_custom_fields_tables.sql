/*
  # إنشاء جداول التخصيص المتقدم
  
  ## نظرة عامة
  هذا الملف ينشئ الجداول المطلوبة للتخصيص العميق للمستأجرين:
  1. tenant_workflow_stages - مراحل تدفق مخصصة
  2. tenant_custom_fields - حقول مخصصة
  3. tenant_custom_field_values - قيم الحقول المخصصة
  
  ## الجداول الجديدة
  
  ### 1. tenant_workflow_stages
  يسمح لكل مستأجر بتخصيص مراحل أوامر العمل الخاصة به
  
  الميزات:
  - مراحل مخصصة لكل نوع workflow (work_order, maintenance_task)
  - ترتيب المراحل
  - شروط الانتقال بين المراحل
  - متطلبات الموافقة
  
  ### 2. tenant_custom_fields
  يسمح لكل مستأجر بإضافة حقول مخصصة للكيانات المختلفة
  
  الميزات:
  - حقول مخصصة للأصول، أوامر العمل، مهام الصيانة
  - أنواع مختلفة: text, number, date, select, multiselect
  - حقول إجبارية واختيارية
  - ترتيب العرض
  
  ## الأمان
  - RLS policies لضمان عزل البيانات بين المستأجرين
  - جميع الجداول مرتبطة بـ hospital_id
  
  ## الملاحظات
  - هذه الجداول تدعم التخصيص العميق للنظام
  - يمكن للمستأجرين تخصيص التدفقات والحقول حسب احتياجاتهم
*/

-- 1. جدول tenant_workflow_stages
CREATE TABLE IF NOT EXISTS tenant_workflow_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  workflow_type TEXT NOT NULL,
  stage_code TEXT NOT NULL,
  stage_name TEXT NOT NULL,
  stage_name_ar TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  stage_color TEXT DEFAULT '#64748b',
  stage_icon TEXT,
  requires_approval BOOLEAN DEFAULT false,
  approval_role TEXT,
  can_edit BOOLEAN DEFAULT true,
  can_delete BOOLEAN DEFAULT false,
  next_stage_conditions JSONB DEFAULT '{}',
  notification_settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_final_stage BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  UNIQUE(tenant_id, workflow_type, stage_code)
);

-- 2. جدول tenant_custom_fields
CREATE TABLE IF NOT EXISTS tenant_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  field_code TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_name_ar TEXT NOT NULL,
  field_type TEXT NOT NULL,
  field_options JSONB,
  default_value TEXT,
  validation_rules JSONB DEFAULT '{}',
  is_required BOOLEAN DEFAULT false,
  is_searchable BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  help_text TEXT,
  help_text_ar TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  UNIQUE(tenant_id, entity_type, field_code)
);

-- 3. جدول tenant_custom_field_values (لتخزين قيم الحقول المخصصة)
CREATE TABLE IF NOT EXISTS tenant_custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID NOT NULL REFERENCES tenant_custom_fields(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL,
  field_value TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(field_id, entity_id)
);

-- إنشاء indexes
CREATE INDEX IF NOT EXISTS idx_workflow_stages_tenant ON tenant_workflow_stages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_stages_type ON tenant_workflow_stages(workflow_type);
CREATE INDEX IF NOT EXISTS idx_workflow_stages_active ON tenant_workflow_stages(is_active);

CREATE INDEX IF NOT EXISTS idx_custom_fields_tenant ON tenant_custom_fields(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_entity_type ON tenant_custom_fields(entity_type);
CREATE INDEX IF NOT EXISTS idx_custom_fields_active ON tenant_custom_fields(is_active);

CREATE INDEX IF NOT EXISTS idx_custom_field_values_field ON tenant_custom_field_values(field_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_entity ON tenant_custom_field_values(entity_id);

-- إضافة check constraints
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_workflow_type') THEN
    ALTER TABLE tenant_workflow_stages ADD CONSTRAINT check_workflow_type 
      CHECK (workflow_type IN ('work_order', 'maintenance_task', 'asset', 'inventory'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_entity_type') THEN
    ALTER TABLE tenant_custom_fields ADD CONSTRAINT check_entity_type 
      CHECK (entity_type IN ('asset', 'work_order', 'maintenance_task', 'inventory_item', 'contract'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_field_type') THEN
    ALTER TABLE tenant_custom_fields ADD CONSTRAINT check_field_type 
      CHECK (field_type IN ('text', 'textarea', 'number', 'date', 'datetime', 'select', 'multiselect', 'checkbox', 'radio', 'email', 'phone', 'url'));
  END IF;
END $$;

-- تفعيل RLS
ALTER TABLE tenant_workflow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_custom_field_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies لـ tenant_workflow_stages
CREATE POLICY "Users can view workflow stages in their tenant"
  ON tenant_workflow_stages FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can manage workflow stages"
  ON tenant_workflow_stages FOR ALL
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id() 
    AND has_permission_v2(auth.uid(), 'tenants.customize_workflows')
  )
  WITH CHECK (
    tenant_id = get_user_tenant_id() 
    AND has_permission_v2(auth.uid(), 'tenants.customize_workflows')
  );

-- RLS Policies لـ tenant_custom_fields
CREATE POLICY "Users can view custom fields in their tenant"
  ON tenant_custom_fields FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can manage custom fields"
  ON tenant_custom_fields FOR ALL
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id() 
    AND (has_permission_v2(auth.uid(), 'tenants.customize_workflows') OR has_permission_v2(auth.uid(), 'settings.access'))
  )
  WITH CHECK (
    tenant_id = get_user_tenant_id() 
    AND (has_permission_v2(auth.uid(), 'tenants.customize_workflows') OR has_permission_v2(auth.uid(), 'settings.access'))
  );

-- RLS Policies لـ tenant_custom_field_values
CREATE POLICY "Users can view custom field values in their tenant"
  ON tenant_custom_field_values FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_custom_fields cf
      WHERE cf.id = field_id
      AND cf.tenant_id = get_user_tenant_id()
    )
  );

CREATE POLICY "Users can manage custom field values"
  ON tenant_custom_field_values FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_custom_fields cf
      WHERE cf.id = field_id
      AND cf.tenant_id = get_user_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_custom_fields cf
      WHERE cf.id = field_id
      AND cf.tenant_id = get_user_tenant_id()
    )
  );

-- دالة للحصول على قيم الحقول المخصصة لكيان معين
CREATE OR REPLACE FUNCTION get_custom_field_values(p_entity_id UUID, p_entity_type TEXT)
RETURNS TABLE (
  field_id UUID,
  field_code TEXT,
  field_name TEXT,
  field_type TEXT,
  field_value TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cf.id,
    cf.field_code,
    cf.field_name,
    cf.field_type,
    cfv.field_value
  FROM tenant_custom_fields cf
  LEFT JOIN tenant_custom_field_values cfv ON cf.id = cfv.field_id AND cfv.entity_id = p_entity_id
  WHERE cf.tenant_id = get_user_tenant_id()
    AND cf.entity_type = p_entity_type
    AND cf.is_active = true
  ORDER BY cf.display_order, cf.field_name;
END;
$$;

-- Comments
COMMENT ON TABLE tenant_workflow_stages IS 'مراحل تدفق مخصصة لكل مستأجر';
COMMENT ON TABLE tenant_custom_fields IS 'حقول مخصصة لكل مستأجر';
COMMENT ON TABLE tenant_custom_field_values IS 'قيم الحقول المخصصة للكيانات';

COMMENT ON COLUMN tenant_workflow_stages.workflow_type IS 'نوع التدفق: work_order, maintenance_task, asset, inventory';
COMMENT ON COLUMN tenant_custom_fields.entity_type IS 'نوع الكيان: asset, work_order, maintenance_task, inventory_item, contract';
COMMENT ON COLUMN tenant_custom_fields.field_type IS 'نوع الحقل: text, number, date, select, etc.';
