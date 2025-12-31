# نظام الصلاحيات - التوثيق التقني الكامل
# Permissions System - Complete Technical Documentation

---

## 📋 نظرة عامة | Overview

نظام الصلاحيات في Mutqan FM يعتمد على نموذج **RBAC (Role-Based Access Control)** مع دعم **استثناءات على مستوى المستخدم** و**صلاحيات خاصة بالمستشفى**.

The Mutqan FM permissions system is built on **RBAC (Role-Based Access Control)** with support for **user-level exceptions** and **hospital-specific permissions**.

---

## 🗄️ هيكل قاعدة البيانات | Database Schema

### 1. جدول الأدوار القديم | Legacy Roles Table (`user_roles`)

```sql
CREATE TYPE public.app_role AS ENUM (
  'global_admin',
  'hospital_admin', 
  'facility_manager',
  'technician',
  'requester',
  'team_leader',
  'engineer',
  'viewer'
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  hospital_id UUID REFERENCES public.hospitals(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role, hospital_id)
);
```

**الغرض**: النظام القديم للأدوار، لا يزال مستخدماً للتوافق مع الإصدارات السابقة.

---

### 2. جدول الأدوار المخصصة | Custom Roles Table (`user_custom_roles`)

```sql
CREATE TABLE public.user_custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role_code TEXT NOT NULL,
  hospital_id UUID REFERENCES public.hospitals(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role_code, hospital_id)
);
```

**الغرض**: النظام الجديد للأدوار المرنة التي يمكن تعريفها من قاعدة البيانات.

---

### 3. جدول تعريف الصلاحيات | Permissions Definition Table (`permissions`)

```sql
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,           -- مفتاح الصلاحية (مثل: assets.view)
  name TEXT NOT NULL,                  -- الاسم بالإنجليزية
  name_ar TEXT NOT NULL,               -- الاسم بالعربية
  category TEXT NOT NULL,              -- التصنيف (Assets, Facilities, etc.)
  description TEXT,                    -- وصف الصلاحية
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**مثال على البيانات**:
```sql
INSERT INTO permissions (key, name, name_ar, category) VALUES
('assets.view', 'View Assets', 'عرض الأصول', 'Assets'),
('assets.create', 'Create Assets', 'إنشاء أصول', 'Assets'),
('assets.edit', 'Edit Assets', 'تعديل الأصول', 'Assets'),
('assets.delete', 'Delete Assets', 'حذف الأصول', 'Assets');
```

---

### 4. جدول صلاحيات الأدوار | Role Permissions Table (`role_permissions`)

```sql
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code TEXT NOT NULL,             -- كود الدور
  permission_key TEXT NOT NULL,        -- مفتاح الصلاحية
  allowed BOOLEAN DEFAULT true,        -- مسموح أم لا
  hospital_id UUID REFERENCES public.hospitals(id), -- NULL = عام
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (role_code, permission_key, hospital_id)
);
```

**الغرض**: تحديد الصلاحيات الافتراضية لكل دور.

---

### 5. جدول صلاحيات المستخدم الاستثنائية | User Permission Overrides (`user_permissions`)

```sql
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission_key TEXT NOT NULL,        -- مفتاح الصلاحية
  effect TEXT NOT NULL CHECK (effect IN ('grant', 'deny')), -- منح أو رفض
  hospital_id UUID REFERENCES public.hospitals(id), -- NULL = عام
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, permission_key, hospital_id)
);
```

**الغرض**: استثناءات على مستوى المستخدم تتجاوز صلاحيات الدور.

---

### 6. جدول أدوار النظام | System Roles Table (`system_roles`)

```sql
CREATE TABLE public.system_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,           -- كود الدور
  name TEXT NOT NULL,                  -- الاسم بالإنجليزية
  name_ar TEXT NOT NULL,               -- الاسم بالعربية
  description TEXT,
  is_system BOOLEAN DEFAULT false,     -- دور نظام لا يمكن حذفه
  hospital_id UUID REFERENCES public.hospitals(id), -- NULL = عام
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🔐 دوال قاعدة البيانات | Database Functions

### 1. دالة التحقق من الدور | Role Check Function

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;
```

**الاستخدام**: يُستخدم في سياسات RLS لتجنب التكرار اللانهائي.

---

### 2. دالة الحصول على الصلاحيات الفعالة | Get Effective Permissions

```sql
CREATE OR REPLACE FUNCTION public.get_effective_permissions(
  _user_id UUID,
  _hospital_id UUID DEFAULT NULL
)
RETURNS TABLE (
  permission_key TEXT,
  allowed BOOLEAN,
  source TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_roles_list AS (
    -- جلب أدوار المستخدم من النظام الجديد
    SELECT ucr.role_code
    FROM user_custom_roles ucr
    WHERE ucr.user_id = _user_id
      AND (ucr.hospital_id IS NULL OR ucr.hospital_id = _hospital_id)
    UNION
    -- جلب أدوار المستخدم من النظام القديم
    SELECT ur.role::TEXT as role_code
    FROM user_roles ur
    WHERE ur.user_id = _user_id
      AND (ur.hospital_id IS NULL OR ur.hospital_id = _hospital_id)
  ),
  role_perms AS (
    -- صلاحيات الأدوار
    SELECT DISTINCT
      rp.permission_key,
      rp.allowed,
      'role' as source
    FROM role_permissions rp
    INNER JOIN user_roles_list url ON url.role_code = rp.role_code
    WHERE rp.hospital_id IS NULL OR rp.hospital_id = _hospital_id
  ),
  user_overrides AS (
    -- استثناءات المستخدم
    SELECT
      up.permission_key,
      (up.effect = 'grant') as allowed,
      'override' as source
    FROM user_permissions up
    WHERE up.user_id = _user_id
      AND (up.hospital_id IS NULL OR up.hospital_id = _hospital_id)
  )
  -- دمج النتائج مع أولوية الاستثناءات
  SELECT COALESCE(uo.permission_key, rp.permission_key),
         COALESCE(uo.allowed, rp.allowed),
         COALESCE(uo.source, rp.source)
  FROM role_perms rp
  FULL OUTER JOIN user_overrides uo ON uo.permission_key = rp.permission_key;
END;
$$;
```

---

### 3. دالة التحقق من صلاحية محددة | Check Specific Permission

```sql
CREATE OR REPLACE FUNCTION public.check_permission(
  _user_id UUID,
  _permission_key TEXT,
  _hospital_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result BOOLEAN;
BEGIN
  -- 1. تحقق من استثناءات المستخدم الخاصة بالمستشفى
  SELECT (effect = 'grant') INTO result
  FROM user_permissions
  WHERE user_id = _user_id
    AND permission_key = _permission_key
    AND hospital_id = _hospital_id;
  
  IF FOUND THEN RETURN result; END IF;
  
  -- 2. تحقق من استثناءات المستخدم العامة
  SELECT (effect = 'grant') INTO result
  FROM user_permissions
  WHERE user_id = _user_id
    AND permission_key = _permission_key
    AND hospital_id IS NULL;
  
  IF FOUND THEN RETURN result; END IF;
  
  -- 3. تحقق من صلاحيات الدور الخاصة بالمستشفى
  SELECT rp.allowed INTO result
  FROM role_permissions rp
  WHERE rp.permission_key = _permission_key
    AND rp.hospital_id = _hospital_id
    AND rp.role_code IN (
      SELECT role_code FROM user_custom_roles WHERE user_id = _user_id
      UNION
      SELECT role::TEXT FROM user_roles WHERE user_id = _user_id
    );
  
  IF FOUND THEN RETURN result; END IF;
  
  -- 4. تحقق من صلاحيات الدور العامة
  SELECT rp.allowed INTO result
  FROM role_permissions rp
  WHERE rp.permission_key = _permission_key
    AND rp.hospital_id IS NULL
    AND rp.role_code IN (
      SELECT role_code FROM user_custom_roles WHERE user_id = _user_id
      UNION
      SELECT role::TEXT FROM user_roles WHERE user_id = _user_id
    );
  
  RETURN COALESCE(result, false);
END;
$$;
```

---

## 🎯 ترتيب الأولويات | Priority Order

```
┌─────────────────────────────────────────────────────────────┐
│  الأولوية الأعلى (الأكثر تحديداً)                            │
├─────────────────────────────────────────────────────────────┤
│  1. استثناء المستخدم + المستشفى المحدد                      │
│     user_permissions WHERE hospital_id = X                  │
├─────────────────────────────────────────────────────────────┤
│  2. استثناء المستخدم العام                                  │
│     user_permissions WHERE hospital_id IS NULL              │
├─────────────────────────────────────────────────────────────┤
│  3. صلاحية الدور + المستشفى المحدد                          │
│     role_permissions WHERE hospital_id = X                  │
├─────────────────────────────────────────────────────────────┤
│  4. صلاحية الدور العامة (الافتراضية)                        │
│     role_permissions WHERE hospital_id IS NULL              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🪝 الـ Hooks | React Hooks

### 1. usePermissions Hook

**الموقع**: `src/hooks/usePermissions.ts`

```typescript
interface UserPermissionsInfo {
  loading: boolean;
  error: Error | null;
  hasPermission: (key: PermissionKey, hospitalId?: string) => boolean;
  hasAnyPermission: (keys: PermissionKey[], hospitalId?: string) => boolean;
  hasAllPermissions: (keys: PermissionKey[], hospitalId?: string) => boolean;
  allPermissions: PermissionKey[];
  refetch: () => Promise<void>;
}

function usePermissions(
  userId: string | null,
  userRoles: string[],
  customRoleCodes: string[],
  hospitalId: string | null
): UserPermissionsInfo
```

**كيفية العمل**:
1. يجلب الصلاحيات الفعالة من `get_effective_permissions` RPC
2. يجلب استثناءات المستخدم من `user_permissions`
3. يبني cache داخلي للوصول السريع
4. يوفر دوال للتحقق من الصلاحيات

---

### 2. useCurrentUser Hook

**الموقع**: `src/hooks/useCurrentUser.ts`

```typescript
interface CurrentUserInfo {
  user: User | null;
  profile: Profile | null;
  roles: UserRole[];
  customRoles: CustomUserRole[];
  customRoleCodes: string[];
  primaryRole: string | null;
  hospitalId: string | null;
  isGlobalAdmin: boolean;
  isHospitalAdmin: boolean;
  isAdmin: boolean;
  canManageUsers: boolean;
  canAccessAdmin: boolean;
  loading: boolean;
  error: Error | null;
  permissions: UserPermissionsInfo;
  refetch: () => Promise<void>;
}

function useCurrentUser(): CurrentUserInfo
```

**كيفية العمل**:
1. يجلب المستخدم الحالي من `auth.getUser()`
2. يجلب البروفايل من `profiles`
3. يجلب الأدوار من `user_roles` و `user_custom_roles`
4. يحسب الخصائص المشتقة (isAdmin, etc.)
5. يستدعي `usePermissions` للحصول على الصلاحيات

---

## 📁 ملفات المكتبة | Library Files

### 1. src/lib/permissions.ts

```typescript
// الثوابت
export const PERMISSIONS = {
  // Assets
  ASSETS_VIEW: 'assets.view',
  ASSETS_CREATE: 'assets.create',
  ASSETS_EDIT: 'assets.edit',
  ASSETS_DELETE: 'assets.delete',
  
  // Facilities
  FACILITIES_VIEW: 'facilities.view',
  FACILITIES_CREATE: 'facilities.create',
  // ... المزيد
};

// دوال المساعدة
export async function hasPermission(
  userId: string, 
  permissionKey: string, 
  hospitalId?: string
): Promise<boolean>;

export async function getUserPermissions(
  userId: string
): Promise<string[]>;
```

---

### 2. src/lib/rolePermissions.ts

```typescript
type RoleCode = 
  | 'global_admin'
  | 'hospital_admin'
  | 'facility_manager'
  | 'technician'
  | 'requester'
  | 'team_leader'
  | 'engineer'
  | 'viewer';

interface RoleConfig {
  code: RoleCode;
  name: string;
  nameAr: string;
  dashboardView: DashboardView;
  modules: {
    assets: { view: boolean; create: boolean; edit: boolean; delete: boolean };
    facilities: { view: boolean; create: boolean; edit: boolean; delete: boolean };
    // ... المزيد
  };
}

export const ROLE_CONFIGS: Record<RoleCode, RoleConfig>;

export function getUserRoleConfig(roleCodes: string[]): RoleConfig | null;
export function hasModuleAccess(
  roleConfig: RoleConfig | null, 
  module: keyof RoleConfig['modules'], 
  action: string
): boolean;
```

---

## 🔒 سياسات RLS | Row Level Security Policies

### مثال: سياسة جدول الأصول

```sql
-- عرض الأصول
CREATE POLICY "Users can view assets based on permissions"
ON public.assets
FOR SELECT
USING (
  -- المسؤول العام يرى كل شيء
  public.has_role(auth.uid(), 'global_admin')
  OR
  -- التحقق من صلاحية العرض
  public.check_permission(auth.uid(), 'assets.view', hospital_id)
);

-- إنشاء الأصول
CREATE POLICY "Users can create assets based on permissions"
ON public.assets
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'global_admin')
  OR
  public.check_permission(auth.uid(), 'assets.create', hospital_id)
);

-- تعديل الأصول
CREATE POLICY "Users can update assets based on permissions"
ON public.assets
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'global_admin')
  OR
  public.check_permission(auth.uid(), 'assets.edit', hospital_id)
);

-- حذف الأصول
CREATE POLICY "Users can delete assets based on permissions"
ON public.assets
FOR DELETE
USING (
  public.has_role(auth.uid(), 'global_admin')
  OR
  public.check_permission(auth.uid(), 'assets.delete', hospital_id)
);
```

---

## 🎨 المكونات | Components

### 1. UserPermissionsSection

**الموقع**: `src/components/admin/UserPermissionsSection.tsx`

**الغرض**: إدارة استثناءات الصلاحيات للمستخدم

```tsx
interface UserPermissionsSectionProps {
  userId: string;
  hospitals: Hospital[];
  userHospitalId: string | null;
  isGlobalAdmin: boolean;
}
```

**الوظائف**:
- عرض الصلاحيات الفعالة للمستخدم
- إضافة استثناء (grant/deny)
- حذف استثناء
- تصفية حسب المستشفى

---

### 2. RolePermissions Page

**الموقع**: `src/pages/admin/RolePermissions.tsx`

**الغرض**: إدارة صلاحيات الأدوار الافتراضية

**الوظائف**:
- عرض مصفوفة الأدوار × الصلاحيات
- تعديل الصلاحيات الافتراضية
- إضافة تجاوزات على مستوى المستشفى
- إنشاء أدوار جديدة

---

## 🔄 تدفق التحقق من الصلاحيات | Permission Check Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    طلب التحقق من الصلاحية                        │
│              hasPermission('assets.view', hospitalId)            │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│              1. التحقق من الكاش المحلي                           │
│                 (usePermissions cache)                           │
└──────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │ موجود؟                │
                    └───────────┬───────────┘
              نعم ◄─────────────┼─────────────► لا
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│         2. استدعاء check_permission RPC                          │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│  3. الترتيب:                                                     │
│     a) استثناء المستخدم + المستشفى                               │
│     b) استثناء المستخدم العام                                    │
│     c) صلاحية الدور + المستشفى                                   │
│     d) صلاحية الدور العامة                                       │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                    إرجاع النتيجة (true/false)                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📋 قائمة الصلاحيات الكاملة | Complete Permissions List

| المفتاح | الوصف | التصنيف |
|---------|-------|---------|
| `assets.view` | عرض الأصول | Assets |
| `assets.create` | إنشاء أصول | Assets |
| `assets.edit` | تعديل الأصول | Assets |
| `assets.delete` | حذف الأصول | Assets |
| `facilities.view` | عرض المرافق | Facilities |
| `facilities.create` | إنشاء مرافق | Facilities |
| `facilities.edit` | تعديل المرافق | Facilities |
| `facilities.delete` | حذف المرافق | Facilities |
| `work_orders.view` | عرض أوامر العمل | Work Orders |
| `work_orders.create` | إنشاء أوامر عمل | Work Orders |
| `work_orders.edit` | تعديل أوامر العمل | Work Orders |
| `work_orders.delete` | حذف أوامر العمل | Work Orders |
| `work_orders.assign` | تعيين أوامر العمل | Work Orders |
| `work_orders.approve` | اعتماد أوامر العمل | Work Orders |
| `inventory.view` | عرض المخزون | Inventory |
| `inventory.create` | إنشاء عناصر مخزون | Inventory |
| `inventory.edit` | تعديل المخزون | Inventory |
| `inventory.delete` | حذف عناصر مخزون | Inventory |
| `inventory.transactions` | إجراء معاملات | Inventory |
| `maintenance.view` | عرض الصيانة | Maintenance |
| `maintenance.create` | إنشاء خطط صيانة | Maintenance |
| `maintenance.edit` | تعديل خطط الصيانة | Maintenance |
| `maintenance.delete` | حذف خطط الصيانة | Maintenance |
| `teams.view` | عرض الفرق | Teams |
| `teams.create` | إنشاء فرق | Teams |
| `teams.edit` | تعديل الفرق | Teams |
| `teams.delete` | حذف الفرق | Teams |
| `operations_log.view` | عرض سجل العمليات | Operations |
| `operations_log.create` | إنشاء سجلات | Operations |
| `users.view` | عرض المستخدمين | Users |
| `users.create` | إنشاء مستخدمين | Users |
| `users.edit` | تعديل المستخدمين | Users |
| `users.delete` | حذف المستخدمين | Users |
| `settings.view` | عرض الإعدادات | Settings |
| `settings.edit` | تعديل الإعدادات | Settings |
| `admin.access` | الوصول للوحة الإدارة | Admin |

---

## 🔧 أمثلة على الاستخدام | Usage Examples

### 1. التحقق من صلاحية في مكون React

```tsx
import { useCurrentUser } from '@/hooks/useCurrentUser';

function AssetsList() {
  const { permissions, hospitalId } = useCurrentUser();
  
  const canView = permissions.hasPermission('assets.view', hospitalId);
  const canCreate = permissions.hasPermission('assets.create', hospitalId);
  const canEdit = permissions.hasPermission('assets.edit', hospitalId);
  
  if (!canView) {
    return <AccessDenied />;
  }
  
  return (
    <div>
      {canCreate && <Button>إضافة أصل جديد</Button>}
      <AssetsTable canEdit={canEdit} />
    </div>
  );
}
```

### 2. التحقق من عدة صلاحيات

```tsx
const { permissions } = useCurrentUser();

// أي صلاحية من القائمة
const canManageAssets = permissions.hasAnyPermission([
  'assets.create',
  'assets.edit',
  'assets.delete'
]);

// كل الصلاحيات مطلوبة
const hasFullAccess = permissions.hasAllPermissions([
  'assets.view',
  'assets.create',
  'assets.edit',
  'assets.delete'
]);
```

### 3. عرض/إخفاء عناصر القائمة

```tsx
// في AppSidebar.tsx
const menuItems = [
  {
    title: 'الأصول',
    href: '/admin/assets',
    permission: 'assets.view',
  },
  {
    title: 'المستخدمين',
    href: '/admin/users',
    permission: 'users.view',
  },
];

{menuItems.map(item => (
  permissions.hasPermission(item.permission) && (
    <SidebarMenuItem key={item.href}>
      <Link to={item.href}>{item.title}</Link>
    </SidebarMenuItem>
  )
))}
```

---

## ⚠️ ملاحظات أمنية مهمة | Security Notes

1. **استخدام SECURITY DEFINER**: دوال التحقق تستخدم `SECURITY DEFINER` لتجاوز RLS وتجنب التكرار اللانهائي.

2. **التحقق في Backend**: الصلاحيات تُفرض في RLS على مستوى قاعدة البيانات، وليس فقط في الواجهة.

3. **عدم تخزين الأدوار في profiles**: الأدوار مخزنة في جداول منفصلة لمنع هجمات تصعيد الصلاحيات.

4. **استثناءات المستخدم تتجاوز صلاحيات الدور**: يمكن منح أو رفض صلاحية لمستخدم معين بغض النظر عن دوره.

5. **الصلاحيات الخاصة بالمستشفى**: يمكن تخصيص صلاحيات مختلفة لنفس المستخدم في مستشفيات مختلفة.

---

## 🔍 استكشاف الأخطاء | Troubleshooting

### مشكلة: المستخدم لا يرى البيانات رغم وجود الصلاحية

1. تحقق من وجود الصلاحية في `role_permissions`
2. تحقق من عدم وجود `deny` في `user_permissions`
3. تحقق من تطابق `hospital_id`
4. راجع سياسات RLS على الجدول

### مشكلة: خطأ "infinite recursion" في RLS

- تأكد من استخدام `SECURITY DEFINER` في دوال التحقق
- لا تستخدم استعلامات على نفس الجدول داخل سياسة RLS

### مشكلة: الصلاحيات لا تتحدث فوراً

- استدعِ `refetch()` من `useCurrentUser` بعد تغيير الصلاحيات
- أو أعد تحميل الصفحة

---

## 📚 المراجع | References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [RBAC Best Practices](https://auth0.com/docs/manage-users/access-control/rbac)
- ملف `PERMISSIONS_SYSTEM_GUIDE.md` للتفاصيل الإضافية
- ملف `DATABASE_SEED.sql` لبيانات البذر الأولية
