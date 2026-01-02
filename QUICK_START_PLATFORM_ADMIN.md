# البداية السريعة - Platform Admin

## الخطوات للبدء

### 1. إنشاء مستخدم Platform Admin

افتح Supabase SQL Editor ونفذ:

```sql
-- إنشاء platform owner
UPDATE profiles
SET
  role = 'platform_owner',
  is_super_admin = true
WHERE email = 'your-email@example.com';

-- أو فقط is_super_admin
UPDATE profiles
SET is_super_admin = true
WHERE email = 'your-email@example.com';
```

---

### 2. إضافة Routes

في `src/App.tsx`، أضف:

```tsx
// الاستيرادات
import PlatformDashboard from '@/pages/platform/PlatformDashboard';
import TenantsManagement from '@/pages/platform/TenantsManagement';
import TenantDetails from '@/pages/platform/TenantDetails';

// في Routes:
<Routes>
  {/* Platform Admin Routes */}
  <Route path="/platform">
    <Route index element={<PlatformDashboard />} />
    <Route path="dashboard" element={<PlatformDashboard />} />
    <Route path="tenants" element={<TenantsManagement />} />
    <Route path="tenants/:tenantId" element={<TenantDetails />} />
  </Route>

  {/* باقي Routes... */}
</Routes>
```

---

### 3. تحديث AppSidebar

في `src/components/AppSidebar.tsx`:

```tsx
import { Building2, LayoutDashboard, CreditCard, Package } from 'lucide-react';

// في Component:
const { user, profile } = useAuth();
const isPlatformAdmin = profile?.is_super_admin || profile?.role === 'platform_owner';

// أضف في القائمة:
{isPlatformAdmin && (
  <>
    <SidebarMenuHeader className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
      {language === 'ar' ? 'إدارة المنصة' : 'Platform Admin'}
    </SidebarMenuHeader>

    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <NavLink to="/platform/dashboard">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            {language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <NavLink to="/platform/tenants">
            <Building2 className="mr-2 h-4 w-4" />
            {language === 'ar' ? 'المستأجرون' : 'Tenants'}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>

    <Separator className="my-2" />
  </>
)}
```

---

### 4. تشغيل التطبيق

```bash
npm run dev
```

---

### 5. الوصول للصفحات

افتح المتصفح:

- `http://localhost:5173/platform/dashboard` - لوحة التحكم
- `http://localhost:5173/platform/tenants` - قائمة المستأجرين
- `http://localhost:5173/platform/tenants/[id]` - تفاصيل مستأجر

---

## اختبار الوظائف

### عرض الخطط المتاحة

```tsx
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';

function PlansPage() {
  const { plans, loading } = useSubscriptionPlans();

  if (loading) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-3 gap-6">
      {plans.map(plan => (
        <PlanCard key={plan.id} plan={plan} />
      ))}
    </div>
  );
}
```

### التحقق من الاستخدام

```tsx
import { useTenantUsage } from '@/hooks/useTenantUsage';

function UsagePage() {
  const { checkLimit } = useTenantUsage(tenantId);

  const handleAddUser = async () => {
    const { canAdd, current, max } = await checkLimit('users');

    if (!canAdd) {
      alert(`تجاوزت الحد! ${current} من ${max}`);
      return;
    }

    // متابعة إضافة المستخدم
  };
}
```

### تغيير الخطة

```tsx
import { useTenantSubscription } from '@/hooks/useTenantSubscription';

function UpgradePage() {
  const { changePlan } = useTenantSubscription();

  const handleUpgrade = async () => {
    const success = await changePlan(
      tenantId,
      newPlanId,
      'Upgrade to Pro',
      currentUserId
    );

    if (success) {
      alert('تم الترقية بنجاح!');
    }
  };
}
```

---

## البيانات التجريبية

### إضافة مستأجر تجريبي

```sql
INSERT INTO tenants (name, slug, email, phone, subscription_status, plan_id)
VALUES (
  'Test Hospital',
  'test-hospital',
  'test@example.com',
  '0501234567',
  'trial',
  (SELECT id FROM subscription_plans WHERE code = 'free_trial')
);
```

### إضافة فاتورة تجريبية

```sql
INSERT INTO invoices (
  invoice_number,
  tenant_id,
  invoice_date,
  due_date,
  subtotal,
  tax,
  total,
  status
)
VALUES (
  'INV-2026-001',
  (SELECT id FROM tenants WHERE slug = 'test-hospital'),
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '7 days',
  499.00,
  74.85,
  573.85,
  'draft'
);
```

---

## المكونات المتاحة

### 1. SubscriptionBadge

```tsx
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge';

<SubscriptionBadge status="active" />
<SubscriptionBadge status="trial" />
<SubscriptionBadge status="suspended" />
```

### 2. UsageIndicator

```tsx
import { UsageIndicator } from '@/components/subscription/UsageIndicator';

<UsageIndicator
  label="المستخدمون"
  current={5}
  max={10}
  unit=""
  showPercentage={true}
/>
```

### 3. PlanCard

```tsx
import { PlanCard } from '@/components/subscription/PlanCard';

<PlanCard
  plan={plan}
  currentPlanId={currentPlanId}
  onSelect={(planId) => handleSelect(planId)}
  billingCycle="monthly"
/>
```

---

## الدوال المتاحة في قاعدة البيانات

```sql
-- التحقق من نشاط المستأجر
SELECT check_tenant_active('tenant-id');

-- التحقق من تفعيل وحدة
SELECT check_tenant_feature_enabled('tenant-id', 'inventory');

-- التحقق من حد الاستخدام
SELECT check_tenant_usage_limit('tenant-id', 'users', 5);

-- معلومات الاشتراك الكاملة
SELECT * FROM get_tenant_subscription_info('tenant-id');

-- حساب الاستخدام
SELECT * FROM calculate_tenant_usage('tenant-id');

-- التحقق من platform admin
SELECT is_platform_admin('user-id');
```

---

## نصائح مهمة

### 🔐 الأمان
- لا تعرض أبداً الصفحات بدون فحص `isPlatformAdmin`
- استخدم RLS في قاعدة البيانات دائماً
- لا تثق بالواجهة الأمامية فقط

### 🎨 UX
- اعرض Loading states دائماً
- أضف Toast notifications للتأكيد
- اعرض رسائل خطأ واضحة

### 🌍 i18n
- استخدم `useLanguage()` لدعم العربية والإنجليزية
- نسق التواريخ حسب اللغة
- نسق الأرقام حسب اللغة

---

## استكشاف الأخطاء

### لا أرى قائمة Platform Admin

```tsx
// تحقق من:
1. هل user.is_super_admin = true؟
2. هل user.role = 'platform_owner'؟
3. هل أضفت الكود في AppSidebar؟

// اختبر:
console.log('Profile:', profile);
console.log('Is Platform Admin:', profile?.is_super_admin);
```

### "Failed to fetch tenants"

```sql
-- تحقق من RLS policies:
SELECT * FROM pg_policies WHERE tablename = 'tenants';

-- تحقق من صلاحياتك:
SELECT is_platform_admin(auth.uid());
```

### البناء يفشل

```bash
# امسح cache وأعد البناء
rm -rf node_modules dist
npm install
npm run build
```

---

## الموارد

- **التوثيق الكامل:** `SUBSCRIPTION_SYSTEM_IMPLEMENTATION.md`
- **الأمثلة:** `SUBSCRIPTION_USAGE_EXAMPLES.md`
- **المرحلة 2:** `PHASE_2_COMPLETED.md`

---

**نتمنى لك تجربة ممتعة! 🚀**
