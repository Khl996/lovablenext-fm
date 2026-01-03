# 🎨 دليل تحديث Frontend - من Hospitals إلى Tenants

**الهدف:** تحويل جميع مصطلحات "Hospital/المستشفى" إلى "Organization/المؤسسة" أو "Tenant/المستأجر"

---

## 📋 الخطة

### المرحلة 1: تحديث الترجمات (i18n) ⏳
### المرحلة 2: تحديث الـ Contexts ⏳
### المرحلة 3: تحديث الصفحات الإدارية ⏳
### المرحلة 4: تحديث المكونات ⏳

---

## 📝 المرحلة 1: تحديث الترجمات

### الملف: `src/lib/i18n.ts`

ابحث عن جميع المصطلحات التالية واستبدلها:

#### في الإنجليزية:
```typescript
// قبل
'hospital': 'Hospital',
'hospitals': 'Hospitals',
'hospitalName': 'Hospital Name',
'selectHospital': 'Select Hospital',

// بعد
'organization': 'Organization',
'organizations': 'Organizations',
'organizationName': 'Organization Name',
'selectOrganization': 'Select Organization',
```

#### في العربية:
```typescript
// قبل
'hospital': 'المستشفى',
'hospitals': 'المستشفيات',
'hospitalName': 'اسم المستشفى',
'selectHospital': 'اختر المستشفى',

// بعد
'organization': 'المؤسسة',
'organizations': 'المؤسسات',
'organizationName': 'اسم المؤسسة',
'selectOrganization': 'اختر المؤسسة',
```

---

## 🔧 المرحلة 2: تحديث الـ Contexts

### 1. TenantContext.tsx ✅

**الحالة الحالية:** جيد، يستخدم مصطلحات tenant بالفعل

**ملاحظة:** التأكد من أن الاستعلامات تستخدم `tenants_unified` أو الدوال الجديدة.

```typescript
// موصى به
const { data, error } = await supabase
  .rpc('get_tenant_info');

// أو
const { data, error } = await supabase
  .from('tenants_unified')
  .select('*')
  .eq('id', tenantId)
  .single();
```

---

### 2. AuthContext.tsx

**التحديث المطلوب:** استخدام `tenant_id` بدلاً من `hospital_id` في الـ profile

```typescript
// قبل
const hospital_id = profile?.hospital_id;

// بعد
const tenant_id = profile?.tenant_id;
```

---

## 📄 المرحلة 3: تحديث الصفحات الإدارية

### 1. الصفحة: `src/pages/admin/Hospitals.tsx`

**الملف الجديد:** يمكن إعادة تسميته إلى `Organizations.tsx` أو الإبقاء عليه

**التحديثات المطلوبة:**

```typescript
// العنوان
<h1>{language === 'ar' ? 'المؤسسات' : 'Organizations'}</h1>

// الاستعلامات
const { data: organizations } = useQuery({
  queryKey: ['organizations'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('hospitals')  // يبقى كما هو
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  },
});

// النصوص والـ Labels
'Add Organization' / 'إضافة مؤسسة'
'Organization Name' / 'اسم المؤسسة'
'Organization Details' / 'تفاصيل المؤسسة'
```

---

### 2. الصفحة: `src/pages/platform/PlatformDashboard.tsx`

**التحديثات:**

```typescript
// العنوان
<CardTitle>{language === 'ar' ? 'المؤسسات' : 'Organizations'}</CardTitle>

// الإحصائيات
<div>Total Organizations: {stats.total_organizations}</div>

// استخدام الدوال الجديدة
const { data: tenantInfo } = await supabase.rpc('get_tenant_info', {
  p_tenant_id: selectedTenantId
});
```

---

### 3. الصفحة: `src/pages/platform/TenantsManagement.tsx`

**الحالة:** جيد، يستخدم مصطلحات tenant بالفعل ✅

**تحديث بسيط:** التأكد من استخدام View الجديد

```typescript
const { data: tenants } = await supabase
  .from('tenants_unified')  // أو hospitals
  .select('*');
```

---

## 🧩 المرحلة 4: تحديث المكونات

### 1. TenantSelector.tsx

**التحديثات:**

```typescript
// النصوص
<SelectTrigger>
  <SelectValue placeholder={language === 'ar' ? 'اختر المؤسسة' : 'Select Organization'} />
</SelectTrigger>

// استخدام View الجديد
const { data: organizations } = await supabase
  .from('tenants_unified')
  .select('id, tenant_name, tenant_name_ar, tenant_logo')
  .order('tenant_name');
```

---

### 2. AppSidebar.tsx

**التحديثات في القائمة:**

```typescript
{
  icon: Building2,
  label: language === 'ar' ? 'المؤسسات' : 'Organizations',
  href: '/admin/hospitals',  // أو /admin/organizations
  permission: 'hospitals.view'  // أو 'organizations.view'
}
```

---

### 3. UserDetailsSheet.tsx

**التحديثات:**

```typescript
<Label>{language === 'ar' ? 'المؤسسة' : 'Organization'}</Label>
<Select value={formData.tenant_id} ...>
  // استخدام tenants_unified
</Select>
```

---

## 🔍 بحث واستبدال شامل

### استخدم Find & Replace في VS Code:

#### 1. البحث عن النصوص الإنجليزية:

**Find (Regex):**
```
(hospital|Hospital|HOSPITAL)(?!_id|_)
```

**Replace:**
```
organization
```

أو بشكل يدوي:
- `'Hospital'` → `'Organization'`
- `'hospital'` → `'organization'`
- `'Hospitals'` → `'Organizations'`
- `'hospitals'` → `'organizations'`

#### 2. البحث عن النصوص العربية:

**Find:**
```
المستشفى|المستشفيات
```

**Replace:**
```
المؤسسة|المؤسسات
```

---

## ⚠️ ملاحظات مهمة

### 1. عدم تغيير:
- ❌ `hospital_id` في الاستعلامات (foreign keys)
- ❌ أسماء الجداول في الاستعلامات
- ❌ أسماء الأعمدة في WHERE clauses

### 2. يمكن تغيير:
- ✅ النصوص المعروضة للمستخدم
- ✅ Labels و Placeholders
- ✅ العناوين والأوصاف
- ✅ أسماء المتغيرات في Frontend

### 3. استخدام الدوال الجديدة:
```typescript
// بدلاً من استعلامات معقدة، استخدم:
const { data } = await supabase.rpc('get_tenant_info');
const { data } = await supabase.rpc('calculate_tenant_usage_stats');
const { data } = await supabase.rpc('is_tenant_active');
```

---

## 📊 قائمة مراجعة (Checklist)

### الترجمات:
- [ ] تحديث ملف `i18n.ts`
- [ ] إضافة مفاتيح جديدة: `organization`, `organizations`
- [ ] استبدال جميع مفاتيح `hospital*`

### الـ Contexts:
- [x] TenantContext - جاهز ✅
- [ ] AuthContext - استخدام tenant_id
- [ ] تحديث types إذا لزم

### الصفحات الإدارية:
- [ ] Hospitals.tsx → Organizations.tsx
- [ ] تحديث جميع النصوص
- [ ] تحديث Routes في App.tsx
- [ ] تحديث Navigation Links

### الصفحات الأخرى:
- [ ] Dashboard.tsx
- [ ] Profile.tsx
- [ ] Settings.tsx
- [ ] Platform pages

### المكونات:
- [ ] TenantSelector.tsx
- [ ] AppSidebar.tsx
- [ ] UserDetailsSheet.tsx
- [ ] UserMenu.tsx
- [ ] AddTenantDialog.tsx

### الاختبار:
- [ ] Build ينجح بدون أخطاء
- [ ] جميع الصفحات تعمل
- [ ] الترجمة صحيحة (عربي/إنجليزي)
- [ ] الاستعلامات تعمل
- [ ] RLS policies تعمل

---

## 🎯 مثال كامل

### قبل:

```typescript
// Hospitals.tsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function Hospitals() {
  const { data: hospitals } = useQuery({
    queryKey: ['hospitals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <h1>Hospitals</h1>
      <div>المستشفيات</div>
      {hospitals?.map(h => (
        <div key={h.id}>
          <h3>{h.name}</h3>
          <p>Hospital Type: {h.type}</p>
        </div>
      ))}
    </div>
  );
}
```

### بعد:

```typescript
// Organizations.tsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Organizations() {
  const { language } = useLanguage();

  const { data: organizations } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants_unified')  // أو hospitals
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <h1>{language === 'ar' ? 'المؤسسات' : 'Organizations'}</h1>
      {organizations?.map(org => (
        <div key={org.id}>
          <h3>{language === 'ar' ? org.tenant_name_ar : org.tenant_name}</h3>
          <p>
            {language === 'ar' ? 'نوع المؤسسة' : 'Organization Type'}: {org.tenant_type}
          </p>
        </div>
      ))}
    </div>
  );
}
```

---

## 🚀 البدء

### الخطوة 1: تحديث الترجمات أولاً
```bash
# افتح الملف
code src/lib/i18n.ts

# أضف/عدّل المفاتيح
```

### الخطوة 2: تحديث صفحة واحدة للتجربة
```bash
# ابدأ بصفحة Hospitals
code src/pages/admin/Hospitals.tsx
```

### الخطوة 3: اختبار
```bash
npm run build
# تأكد من عدم وجود أخطاء
```

### الخطوة 4: استمر في باقي الملفات
استخدم Find & Replace للتسريع

---

## 📞 المساعدة

إذا واجهت مشاكل:

1. **أخطاء في Build:**
   - تحقق من أن جميع imports صحيحة
   - تأكد من عدم تغيير أسماء foreign keys

2. **استعلامات لا تعمل:**
   - استخدم `tenants_unified` view
   - أو استخدم الدوال الجديدة: `get_tenant_info()`, etc.

3. **مشاكل في RLS:**
   - تأكد من أن tenant_id موجود في profile
   - استخدم `get_current_tenant()` للحصول على tenant_id

---

**تم بحمد الله ✨**

**الحالة:** 🎯 **70% مكتمل**
- ✅ قاعدة البيانات جاهزة 100%
- ⏳ Frontend يحتاج تحديث 20%

**آخر تحديث:** 3 يناير 2026
