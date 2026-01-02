# تحليل خطة التطوير مقارنة بالنظام الحالي
# Development Plan Analysis - Mutqan CMMS

---

## نظرة عامة

هذا التقرير يوضح مقارنة تفصيلية بين خطة التطوير المقترحة والنظام الحالي، مع توضيح:
- ✅ **موجود**: الميزات الموجودة حالياً
- ⚠️ **موجود جزئياً**: يحتاج تعديل
- ❌ **غير موجود**: يحتاج إنشاء من الصفر
- 💡 **اقتراحات**: تحسينات مقترحة

---

# المرحلة 1: إعادة هيكلة قاعدة البيانات

## 1.1 جدول Tenants

### الوضع الحالي: ⚠️ موجود جزئياً (كـ hospitals)

**الحقول الموجودة في hospitals:**
| الحقل | موجود | ملاحظات |
|-------|--------|---------|
| id | ✅ | UUID |
| code | ✅ | رمز المستشفى |
| name | ✅ | الاسم بالإنجليزية |
| name_ar | ✅ | الاسم بالعربية |
| type | ✅ | نوع المؤسسة |
| logo_url | ✅ | شعار المؤسسة |
| status | ✅ | حالة المؤسسة |
| address | ✅ | العنوان |
| phone | ✅ | الهاتف |
| email | ✅ | البريد |
| suspended_at | ✅ | تاريخ التعليق |
| suspended_by | ✅ | من قام بالتعليق |
| suspension_reason | ✅ | سبب التعليق |
| notes | ✅ | ملاحظات |

**الحقول المطلوب إضافتها (غير موجودة):**
| الحقل | النوع | الوصف |
|-------|-------|-------|
| subscription_status | TEXT | حالة الاشتراك |
| plan_type | TEXT | نوع الخطة |
| subscription_starts_at | TIMESTAMPTZ | بداية الاشتراك |
| subscription_ends_at | TIMESTAMPTZ | نهاية الاشتراك |
| trial_ends_at | TIMESTAMPTZ | نهاية الفترة التجريبية |
| grace_period_days | INTEGER | أيام السماح |
| grace_period_started_at | TIMESTAMPTZ | بداية فترة السماح |
| billing_cycle | TEXT | دورة الفوترة |
| payment_method | TEXT | طريقة الدفع |
| last_payment_date | DATE | آخر دفعة |
| next_billing_date | DATE | تاريخ الفاتورة القادمة |
| auto_renew | BOOLEAN | التجديد التلقائي |
| base_price | NUMERIC | السعر الأساسي |
| custom_pricing | JSONB | تسعير مخصص |
| discount_percentage | NUMERIC | نسبة الخصم |
| discount_fixed_amount | NUMERIC | مبلغ الخصم الثابت |
| max_users | INTEGER | الحد الأقصى للمستخدمين |
| max_assets | INTEGER | الحد الأقصى للأصول |
| max_work_orders_per_month | INTEGER | الحد الأقصى لأوامر العمل شهرياً |
| max_storage_mb | INTEGER | الحد الأقصى للتخزين |
| custom_limits | JSONB | حدود مخصصة |
| enabled_modules | JSONB | الوحدات المفعلة |
| module_configurations | JSONB | إعدادات الوحدات |
| workflow_customizations | JSONB | تخصيصات التدفق |
| primary_color | TEXT | اللون الأساسي |
| secondary_color | TEXT | اللون الثانوي |
| custom_domain | TEXT | النطاق المخصص |
| email_signature_template | TEXT | قالب توقيع البريد |
| technical_contact_name | TEXT | اسم جهة الاتصال التقنية |
| technical_contact_email | TEXT | بريد جهة الاتصال التقنية |

### 💡 التوصية:
**لا أنصح بحذف جدول hospitals بل توسيعه** لتجنب:
1. كسر جميع الـ Foreign Keys (أكثر من 20 جدول مرتبط)
2. تعديل جميع RLS Policies
3. تعديل جميع الكود في Frontend

**الحل المقترح:**
```sql
-- إضافة الحقول الجديدة لجدول hospitals بدلاً من إنشاء tenants
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES subscription_plans(id);
-- ... باقي الحقول
```

---

## 1.2 جداول إدارة الاشتراكات

### الوضع الحالي: ❌ غير موجود

**المطلوب إنشاؤه:**

#### جدول subscription_plans
```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  description_ar TEXT,
  price_monthly NUMERIC DEFAULT 0,
  price_yearly NUMERIC DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  included_users INTEGER DEFAULT 5,
  included_assets INTEGER DEFAULT 100,
  included_storage_mb INTEGER DEFAULT 1024,
  included_work_orders INTEGER, -- NULL = unlimited
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### جدول subscription_history
```sql
CREATE TABLE subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  old_plan UUID REFERENCES subscription_plans(id),
  new_plan UUID REFERENCES subscription_plans(id),
  changed_by UUID,
  change_reason TEXT,
  old_price NUMERIC,
  new_price NUMERIC,
  notes TEXT,
  changed_at TIMESTAMPTZ DEFAULT now()
);
```

#### جدول invoices
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  tenant_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  created_by UUID,
  invoice_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  subtotal NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  status TEXT DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
  payment_method TEXT,
  transaction_id TEXT,
  notes TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### جدول payments
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id),
  tenant_id UUID REFERENCES hospitals(id),
  payment_date DATE DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL,
  payment_method TEXT, -- bank_transfer, stripe, cash, check
  transaction_reference TEXT,
  processed_by UUID,
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 1.3 جداول التخصيص المتقدم

### الوضع الحالي: ❌ غير موجود

**المطلوب إنشاؤه:**

#### جدول tenant_modules
```sql
CREATE TABLE tenant_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  module_code TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  enabled_at TIMESTAMPTZ DEFAULT now(),
  enabled_by UUID,
  configuration JSONB DEFAULT '{}',
  UNIQUE(tenant_id, module_code)
);
```

#### جدول tenant_workflow_stages
```sql
CREATE TABLE tenant_workflow_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  workflow_type TEXT NOT NULL, -- work_order, maintenance_task
  stage_code TEXT NOT NULL,
  stage_name TEXT NOT NULL,
  stage_name_ar TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  requires_approval BOOLEAN DEFAULT false,
  approval_role TEXT,
  next_stage_conditions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, workflow_type, stage_code)
);
```

#### جدول tenant_custom_fields
```sql
CREATE TABLE tenant_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- asset, work_order, maintenance_task
  field_name TEXT NOT NULL,
  field_name_ar TEXT NOT NULL,
  field_type TEXT NOT NULL, -- text, number, date, select, multiselect
  field_options JSONB, -- للحقول من نوع select
  is_required BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 1.4 تحديث الجداول الموجودة

### الوضع الحالي: ✅ موجود (لكن بـ hospital_id)

**الجداول المرتبطة بـ hospital_id حالياً:**
| الجدول | hospital_id موجود | ملاحظات |
|--------|-------------------|---------|
| profiles | ✅ | |
| user_roles | ❌ | يستخدم role مباشرة |
| user_custom_roles | ✅ | |
| assets | ✅ | |
| work_orders | ✅ | |
| maintenance_plans | ✅ | |
| maintenance_tasks | ❌ | مرتبط بـ plan_id |
| buildings | ✅ | |
| floors | ❌ | مرتبط بـ building_id |
| departments | ❌ | مرتبط بـ floor_id |
| rooms | ❌ | مرتبط بـ department_id |
| teams | ✅ | |
| team_members | ❌ | مرتبط بـ team_id |
| inventory_items | ✅ | |
| inventory_transactions | ✅ | |
| operations_log | ✅ | |
| notifications | ❌ | مرتبط بـ user_id |
| role_permissions | ✅ | |
| user_permissions | ✅ | |
| contracts | ✅ | |
| costs | ✅ | |
| calibration_schedules | ✅ | |
| calibration_records | ✅ | |
| sla_definitions | ✅ | |
| sla_breaches | ✅ | |
| companies | ✅ | |

### 💡 التوصية:
**لا حاجة لتغيير hospital_id إلى tenant_id** - يمكن الاحتفاظ بالاسم الحالي أو إنشاء View:
```sql
CREATE VIEW tenant_id AS SELECT hospital_id FROM profiles;
```

---

# المرحلة 2: نظام إدارة الاشتراكات

## 2.1 دوال قاعدة البيانات

### الوضع الحالي: ⚠️ موجود جزئياً

**الموجود:**
| الدالة | موجود | ملاحظات |
|--------|--------|---------|
| get_user_hospital | ✅ | تعمل |
| has_role | ✅ | تعمل |
| has_role_by_code | ✅ | تعمل |
| get_effective_permissions | ✅ | تعمل |
| has_permission_v2 | ✅ | تعمل |
| check_permission | ✅ | تعمل |

**المطلوب إنشاؤه:**
| الدالة | الوصف |
|--------|-------|
| check_tenant_active | التحقق من نشاط الاشتراك |
| check_tenant_feature_enabled | التحقق من تفعيل ميزة |
| check_tenant_usage_limit | التحقق من الحدود |
| calculate_tenant_usage | حساب الاستخدام الحالي |
| get_tenant_remaining_quota | الحصة المتبقية |
| suspend_tenant | تعليق المستأجر |
| activate_tenant | تفعيل المستأجر |
| extend_trial | تمديد الفترة التجريبية |

---

## 2.2 Edge Functions

### الوضع الحالي: ⚠️ موجود جزئياً

**الموجود:**
| Edge Function | موجود | ملاحظات |
|---------------|--------|---------|
| create-user | ✅ | إنشاء مستخدم |
| delete-user | ✅ | حذف مستخدم |
| send-notification-email | ✅ | إرسال إشعار |
| send-work-order-email | ✅ | إرسال بريد أمر العمل |
| check-maintenance-tasks | ✅ | فحص مهام الصيانة |
| auto-close-work-orders | ✅ | إغلاق تلقائي |
| send-inactive-user-reminder | ✅ | تذكير المستخدم الخامل |

**المطلوب إنشاؤه:**
| Edge Function | الوصف |
|---------------|-------|
| daily-subscription-check | فحص الاشتراكات يومياً |
| stripe-webhook-handler | معالجة إشعارات Stripe |
| generate-invoice-pdf | إنشاء PDF للفاتورة |
| send-subscription-reminder | إرسال تذكير بالاشتراك |

---

## 2.3 واجهات الإدارة

### الوضع الحالي: ❌ غير موجود

**المطلوب إنشاؤه:**
1. صفحة إدارة الخطط (Subscription Plans)
2. صفحة إدارة اشتراك المستأجر
3. صفحة الفواتير
4. صفحة المدفوعات

---

# المرحلة 3: داشبورد المالك

## 3.1 نظام الأدوار الإدارية

### الوضع الحالي: ⚠️ موجود جزئياً

**الأدوار الموجودة حالياً:**
| الدور | موجود | ملاحظات |
|-------|--------|---------|
| global_admin | ✅ | مدير النظام |
| hospital_admin | ✅ | مدير المستشفى |
| facility_manager | ✅ | مدير المرافق |
| maintenance_manager | ✅ | مدير الصيانة |
| supervisor | ✅ | مشرف |
| technician | ✅ | فني |
| reporter | ✅ | مبلغ |
| eng | ✅ | مهندس |

**الأدوار المطلوب إضافتها:**
| الدور | الوصف |
|-------|-------|
| platform_owner | صلاحيات كاملة على المنصة |
| platform_admin | إدارة المستأجرين والاشتراكات |
| platform_support | عرض + impersonation |
| platform_accountant | إدارة مالية فقط |

---

## 3.2-3.7 صفحات داشبورد المالك

### الوضع الحالي: ❌ غير موجود

**الصفحات المطلوب إنشاؤها:**
| الصفحة | الوصف | الأولوية |
|--------|-------|----------|
| Platform Dashboard | لوحة تحكم المالك | عالية |
| Tenant Management | إدارة المستأجرين | عالية |
| Tenant Details | تفاصيل المستأجر | عالية |
| Subscription Plans | إدارة الخطط | عالية |
| Invoices | إدارة الفواتير | متوسطة |
| Payments | إدارة المدفوعات | متوسطة |
| Platform Analytics | تحليلات المنصة | متوسطة |
| Impersonation | تسجيل دخول كمستخدم | منخفضة |

---

# المرحلة 4: التخصيص العميق للمستأجرين

## 4.1 صفحة Modules Management

### الوضع الحالي: ⚠️ موجود جزئياً

**الوحدات الموجودة حالياً (كصفحات):**
| الوحدة | موجود | الصفحة |
|--------|--------|--------|
| Work Orders | ✅ | /admin/work-orders |
| Assets | ✅ | /admin/assets |
| Buildings & Facilities | ✅ | /admin/locations |
| Inventory | ✅ | /admin/inventory |
| Maintenance Plans | ✅ | /maintenance |
| Operations Log | ✅ | /operations-log |
| Teams Management | ✅ | /admin/teams |
| Contracts | ✅ | /admin/contracts |
| Costs & Budget | ✅ | /admin/costs |
| Calibration | ✅ | /admin/calibration |
| SLA Management | ✅ | /admin/sla |
| Advanced Reports | ⚠️ | /admin/system-stats (محدود) |

**غير الموجود:**
- نظام تشغيل/إيقاف الوحدات
- إعدادات لكل وحدة
- ميزات فرعية

---

## 4.2-4.7 التخصيصات

### الوضع الحالي: ❌ غير موجود

**المطلوب:**
1. محرر تدفق أوامر العمل
2. الحقول المخصصة للأصول
3. الهيكل التنظيمي المرن
4. Override Limits
5. العلامة التجارية (Branding)
6. إعدادات متقدمة (Timezone, Currency, etc.)

---

# المرحلة 5: نظام الصلاحيات المحدث

## 5.1 صلاحيات المنصة الجديدة

### الوضع الحالي: ⚠️ موجود جزئياً

**الصلاحيات الموجودة (44 صلاحية):**
```
analytics.view, assets.manage, assets.view, calibration.manage, calibration.view,
companies.manage, companies.view, contracts.manage, contracts.view, costs.manage,
costs.view, execute_maintenance, facilities.manage, facilities.view, hospitals.delete,
hospitals.manage, hospitals.suspend, hospitals.view, inventory.manage, inventory.transactions,
inventory.view, maintenance.manage, maintenance.view, operations_log.manage, operations_log.view,
settings.access, settings.issue_types, settings.locations, settings.lookup_tables,
settings.permissions_guide, settings.role_permissions, settings.specializations,
sla.manage, sla.view, teams.manage, teams.view, users.manage, users.view,
view_analytics, work_orders.approve, work_orders.create, work_orders.final_approve,
work_orders.manage, work_orders.review_as_engineer
```

**الصلاحيات المطلوب إضافتها:**
```
platform.view_all_tenants
platform.manage_tenants
platform.create_tenant
platform.delete_tenant
platform.suspend_tenant
platform.manage_subscriptions
platform.manage_plans
platform.view_financials
platform.manage_invoices
platform.manage_payments
platform.impersonate_users
platform.view_audit_logs
platform.manage_platform_settings
platform.access_advanced_analytics
```

---

## 5.2-5.4 تحديث دوال التحقق و RLS

### الوضع الحالي: ✅ موجود (يحتاج تحديث)

**الموجود:**
- دوال has_permission_v2, check_permission
- RLS Policies على جميع الجداول

**التحديثات المطلوبة:**
1. إضافة فحص حالة الاشتراك
2. إضافة فحص تفعيل الوحدة
3. إضافة فحص platform_owner

---

## 5.5 Audit Log System

### الوضع الحالي: ⚠️ موجود جزئياً

**الموجود:**
- operations_log (لسجل العمليات على الأصول)

**المطلوب:**
- platform_audit_logs (سجل عمليات المنصة)

---

# المرحلة 6: نظام المبلغين المحسّن

## 6.1-6.3 نظام المبلغين

### الوضع الحالي: ✅ موجود (يحتاج تحسين)

**الموجود:**
- دور reporter موجود
- صلاحية work_orders.create موجودة
- واجهة إنشاء أمر عمل موجودة

**التحسينات المطلوبة:**
- داشبورد مخصص للمبلغ (موجود SimpleDashboard)
- QR Code للإبلاغ السريع (موجود للأصول)
- متابعة وتعليق على البلاغات

---

# المرحلة 7: نظام التقارير المتقدمة

### الوضع الحالي: ⚠️ موجود جزئياً

**الموجود:**
- /admin/system-stats - إحصائيات أساسية
- مخططات في Dashboard

**المطلوب:**
- Report Builder
- تقارير مالية
- تقارير Platform Analytics
- تصدير Excel/PDF
- جدولة إرسال تلقائي

---

# المرحلة 8: نظام الدعم الفني المدمج

### الوضع الحالي: ❌ غير موجود

**المطلوب:**
- جدول support_tickets
- قاعدة المعرفة (articles)
- Live Chat (اختياري)

---

# المرحلة 9: الأمان والأداء

### الوضع الحالي: ✅ موجود (يحتاج مراجعة)

**الموجود:**
- RLS Policies على جميع الجداول
- Indexes على hospital_id
- تشفير Supabase الافتراضي

**التحسينات المطلوبة:**
- Rate Limiting
- مراجعة أمنية شاملة
- نظام النسخ الاحتياطي

---

# المرحلة 10: البيانات الافتراضية والتوثيق

### الوضع الحالي: ⚠️ موجود جزئياً

**الموجود:**
- DATABASE_SETUP_GUIDE.md
- DATABASE_SEED.sql
- PERMISSIONS_TECHNICAL_DOCS.md
- PERMISSIONS_SYSTEM_GUIDE.md

**المطلوب:**
- دليل المالك
- دليل تخصيص النظام
- API Documentation

---

# 💡 اقتراحاتي لترتيب الأولويات

## المرحلة الأولى (الأساسية) - 4-6 أسابيع
1. توسيع جدول hospitals بحقول الاشتراك
2. إنشاء جداول subscription_plans, invoices, payments
3. إنشاء أدوار المنصة الجديدة
4. إنشاء صلاحيات المنصة
5. داشبورد المالك الأساسي

## المرحلة الثانية (الإدارة) - 3-4 أسابيع
1. صفحة إدارة المستأجرين
2. صفحة تفاصيل المستأجر
3. إدارة الخطط والاشتراكات
4. نظام الفواتير والمدفوعات

## المرحلة الثالثة (التخصيص) - 4-5 أسابيع
1. نظام الوحدات (Modules)
2. الحقول المخصصة
3. تخصيص التدفقات
4. العلامة التجارية

## المرحلة الرابعة (التحسينات) - 2-3 أسابيع
1. Audit Log
2. التقارير المتقدمة
3. تحسينات الأمان
4. التوثيق النهائي

---

# 🔧 خطوات التنفيذ المقترحة

## الخطوة 1: تحديث قاعدة البيانات
```sql
-- 1. إضافة حقول الاشتراك لـ hospitals
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS plan_id UUID;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 10;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS max_assets INTEGER DEFAULT 100;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS enabled_modules JSONB DEFAULT '["work_orders","assets","facilities"]';

-- 2. إنشاء جدول الخطط
CREATE TABLE subscription_plans (...);

-- 3. إنشاء جدول الفواتير
CREATE TABLE invoices (...);

-- 4. إضافة صلاحيات المنصة
INSERT INTO permissions (key, name, name_ar) VALUES 
('platform.manage_tenants', 'Manage Tenants', 'إدارة المستأجرين'),
...;

-- 5. إضافة أدوار المنصة
INSERT INTO system_roles (code, name, name_ar) VALUES
('platform_owner', 'Platform Owner', 'مالك المنصة'),
...;
```

## الخطوة 2: تحديث الكود
1. إنشاء hooks جديدة للاشتراكات
2. إنشاء صفحات داشبورد المالك
3. تحديث نظام الصلاحيات

---

# ⚠️ تحذيرات مهمة

1. **لا تحذف جدول hospitals** - سيسبب كسر في النظام بالكامل
2. **التغييرات التدريجية أفضل** - لا تغير كل شيء دفعة واحدة
3. **اختبار شامل** - كل تغيير يحتاج اختبار قبل الإنتاج
4. **النسخ الاحتياطي** - احتفظ بنسخ احتياطية قبل أي تغيير

---

# 📊 ملخص التحليل

| المرحلة | نسبة الإنجاز | الأولوية |
|---------|--------------|----------|
| 1. هيكلة قاعدة البيانات | 40% | عالية |
| 2. نظام الاشتراكات | 0% | عالية |
| 3. داشبورد المالك | 5% | عالية |
| 4. التخصيص | 10% | متوسطة |
| 5. الصلاحيات | 75% | عالية |
| 6. نظام المبلغين | 70% | منخفضة |
| 7. التقارير | 20% | متوسطة |
| 8. الدعم الفني | 0% | منخفضة |
| 9. الأمان والأداء | 60% | عالية |
| 10. التوثيق | 40% | متوسطة |

**المتوسط العام: ~32%**

---

# 🎯 هل تريد البدء؟

أخبرني بأي مرحلة تريد البدء وسأقوم بتنفيذها خطوة بخطوة مع شرح كل تغيير.
