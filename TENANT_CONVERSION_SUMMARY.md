# 🏢 ملخص تحويل النظام من Hospitals إلى Tenants

**تاريخ التحويل:** 3 يناير 2026

---

## 📊 نظرة عامة

تم تحويل النظام بنجاح من استخدام مصطلحات "Hospitals" (المستشفيات) إلى "Tenants" (المستأجرين) لجعل النظام عام وقابل للاستخدام في أي قطاع.

---

## ✅ ما تم إنجازه

### 1. قاعدة البيانات ✅

#### أ. نقل البيانات:
- ✅ نقل جميع البيانات من جدول `tenants` القديم إلى `hospitals`
- ✅ إضافة حقول مفقودة: `slug`, `settings`, `name_ar`
- ✅ 2 مستأجرين تم نقلهم بنجاح:
  - Demo Organization (demo)
  - Test (Test)

#### ب. إنشاء View موحد:
- ✅ View: `tenants_unified` - يعرض بيانات `hospitals` بمصطلحات tenant
- ✅ جميع الحقول متاحة بمسميات مزدوجة (hospitals & tenants)

#### ج. الدوال المساعدة (6 دوال):

**1. get_current_tenant()**
- الحصول على معرف المستأجر الحالي من `profiles.tenant_id`
- الاستخدام: `SELECT get_current_tenant();`

**2. get_tenant_info(tenant_id)**
- الحصول على معلومات المستأجر الكاملة
- المخرجات: JSON يحتوي على (id, code, name, name_ar, slug, type, logo_url, status, subscription_status, enabled_modules, colors, contact)
- الاستخدام: `SELECT get_tenant_info();` أو `SELECT get_tenant_info('tenant-uuid');`

**3. is_tenant_active(tenant_id)**
- التحقق من أن المستأجر نشط وله اشتراك فعال
- المخرجات: BOOLEAN (true/false)
- الاستخدام: `SELECT is_tenant_active();`

**4. get_tenant_limits_v2(tenant_id)**
- الحصول على حدود المستأجر (max_users, max_assets, max_work_orders_per_month, max_storage_mb, enabled_modules)
- المخرجات: JSON
- الاستخدام: `SELECT get_tenant_limits_v2();`

**5. calculate_tenant_usage_stats(tenant_id)**
- حساب إحصائيات الاستخدام الحالي مقابل الحدود
- المخرجات: JSON يحتوي على (users, assets, work_orders) مع (current, max, percentage) لكل منها
- الاستخدام: `SELECT calculate_tenant_usage_stats();`

**6. get_tenant_subscription_details(tenant_id)**
- الحصول على تفاصيل الاشتراك الكاملة
- المخرجات: JSON شامل لكل معلومات الاشتراك
- الاستخدام: `SELECT get_tenant_subscription_details();`

---

### 2. الحقول الجديدة في hospitals ✅

تم إضافة حقول جديدة لدعم مفهوم Tenants:

| الحقل | النوع | الوصف | القيمة الافتراضية |
|-------|------|-------|-------------------|
| `slug` | TEXT | معرف فريد للـ URL | - |
| `settings` | JSONB | إعدادات إضافية | {} |
| `name_ar` | TEXT | الاسم بالعربية | - |

**Indexes:**
- ✅ `idx_hospitals_slug` - Unique index على slug

---

### 3. البنية الموحدة ✅

#### الجداول التي تستخدم tenant_id:
1. `profiles` - tenant_id
2. `assets` - tenant_id (مع hospital_id للتوافق)
3. `work_orders` - tenant_id (مع hospital_id للتوافق)
4. `locations` - tenant_id
5. `invoices` - tenant_id
6. `payments` - tenant_id
7. `subscription_history` - tenant_id
8. `tenant_modules` - tenant_id
9. `user_permissions` - tenant_id
10. `tenant_custom_fields` - tenant_id (يشير إلى hospitals)
11. `tenant_workflow_stages` - tenant_id (يشير إلى hospitals)

#### الجداول التي تستخدم hospital_id:
معظم الجداول الأخرى (23 جدول) - ستبقى كما هي حالياً للتوافق.

---

## 🎯 الاستخدام في Frontend

### الحصول على معلومات المستأجر الحالي:

```typescript
// الطريقة القديمة (ما زالت تعمل)
const { data: hospital } = await supabase
  .from('hospitals')
  .select('*')
  .eq('id', hospitalId)
  .single();

// الطريقة الجديدة (موصى بها)
const { data: tenant } = await supabase
  .from('tenants_unified')
  .select('*')
  .eq('id', tenantId)
  .single();

// أو باستخدام الدالة
const { data: tenantInfo } = await supabase
  .rpc('get_tenant_info');
```

### الحصول على إحصائيات الاستخدام:

```typescript
const { data: usage } = await supabase
  .rpc('calculate_tenant_usage_stats');

console.log(usage);
// {
//   users: { current: 5, max: 10, percentage: 50 },
//   assets: { current: 75, max: 100, percentage: 75 },
//   work_orders: { current: 20, max: 500, percentage: 4 }
// }
```

### التحقق من أن المستأجر نشط:

```typescript
const { data: isActive } = await supabase
  .rpc('is_tenant_active');

if (!isActive) {
  // عرض رسالة أن الاشتراك منتهي
}
```

---

## 🔄 التوافق مع الكود القديم

### الجدول الرئيسي:
- ✅ `hospitals` - يبقى كجدول رئيسي (معظم foreign keys تشير إليه)
- ✅ `tenants_unified` - view للوصول السهل بمصطلحات tenant

### الحقول:
- ✅ `hospital_id` - ما زال موجود في معظم الجداول
- ✅ `tenant_id` - موجود في الجداول الجديدة والبعض القديم
- ✅ كلاهما يشير إلى نفس الجدول

### الدوال:
- ✅ الدوال القديمة ما زالت تعمل
- ✅ الدوال الجديدة متاحة للاستخدام

---

## 📝 المصطلحات الجديدة

### قاعدة البيانات:
| القديم | الجديد | الملاحظات |
|--------|--------|----------|
| hospitals | tenants_unified (view) | الجدول الأساسي ما زال hospitals |
| hospital_id | tenant_id | كلاهما يعمل |
| get_user_hospital() | get_current_tenant() | دالة جديدة |
| - | get_tenant_info() | دالة جديدة |
| - | is_tenant_active() | دالة جديدة |
| - | calculate_tenant_usage_stats() | دالة جديدة |

### Frontend (يحتاج تحديث):
| القديم | الجديد |
|--------|--------|
| Hospital | Organization / Tenant |
| المستشفى | المؤسسة / المستأجر |
| Hospital Name | Organization Name |
| اسم المستشفى | اسم المؤسسة |

---

## 🚀 الخطوات القادمة

### 1. تحديث الترجمات (i18n) ⏳
- ✅ تم إنشاء الـ view والدوال
- ⏳ تحديث ملفات الترجمة (ar/en)
- ⏳ استبدال "Hospital" بـ "Organization"
- ⏳ استبدال "المستشفى" بـ "المؤسسة"

### 2. تحديث مكونات Frontend ⏳
```typescript
// قبل
<h1>{language === 'ar' ? 'المستشفيات' : 'Hospitals'}</h1>

// بعد
<h1>{language === 'ar' ? 'المؤسسات' : 'Organizations'}</h1>
```

### 3. تحديث Contexts ⏳
- ⏳ TenantContext - استخدام المصطلحات الجديدة
- ⏳ AuthContext - استخدام tenant_id

### 4. تحديث الصفحات الإدارية ⏳
- ⏳ `/admin/hospitals` → `/admin/organizations`
- ⏳ تحديث جميع Labels والنصوص

---

## 🎓 أمثلة على الاستخدام

### مثال 1: الحصول على معلومات المستأجر في صفحة الداشبورد

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

function Dashboard() {
  const { data: tenant } = useQuery({
    queryKey: ['current-tenant'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tenant_info');
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <h1>Welcome to {tenant?.name}</h1>
      <p>Status: {tenant?.subscription_status}</p>
    </div>
  );
}
```

### مثال 2: عرض إحصائيات الاستخدام

```typescript
function UsageStats() {
  const { data: usage } = useQuery({
    queryKey: ['tenant-usage'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('calculate_tenant_usage_stats');
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <div>
        <span>Users: {usage?.users.current} / {usage?.users.max}</span>
        <ProgressBar value={usage?.users.percentage} />
      </div>
      <div>
        <span>Assets: {usage?.assets.current} / {usage?.assets.max}</span>
        <ProgressBar value={usage?.assets.percentage} />
      </div>
    </div>
  );
}
```

---

## ✅ ملخص التحويل

| الجزء | الحالة | النسبة |
|-------|--------|--------|
| نقل البيانات | ✅ مكتمل | 100% |
| إنشاء View | ✅ مكتمل | 100% |
| الدوال المساعدة | ✅ مكتمل | 100% |
| تحديث Frontend | ⏳ قيد العمل | 20% |
| الترجمات | ⏳ قيد العمل | 0% |
| التوثيق | ✅ مكتمل | 100% |

**إجمالي التحويل:** 🎯 **70%**

---

## 🔐 الأمان

- ✅ جميع الدوال محمية بـ SECURITY DEFINER
- ✅ RLS policies ما زالت تعمل على جدول hospitals
- ✅ View يحترم RLS policies
- ✅ لا تسريب للبيانات بين المستأجرين

---

## 📚 الملفات المُنشأة

### Database Migrations:
1. `supabase/migrations/unify_tenants_and_hospitals_step1.sql`
2. `supabase/migrations/unify_tenants_and_hospitals_step2.sql`

### Documentation:
1. `TENANT_CONVERSION_SUMMARY.md` - هذا الملف

---

**تم بحمد الله ✨**

**آخر تحديث:** 3 يناير 2026

**الحالة:** جاهز للاستخدام في قاعدة البيانات، يحتاج تحديث Frontend
