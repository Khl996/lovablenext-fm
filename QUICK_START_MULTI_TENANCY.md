# 🚀 Quick Start - Multi-Tenancy System

This guide will help you get started with the newly implemented Multi-Tenancy features.

---

## 🎯 What's New

1. **Platform Owner Dashboard** - Manage all tenants from one place
2. **Subscription Management** - Track plans, usage, and billing
3. **Modules Management** - Enable/disable features per tenant
4. **Advanced Permissions** - 47 granular permissions
5. **Audit Logging** - Complete trail of platform operations

---

## 👤 User Roles

### Platform Roles (Cross-Tenant):
- **`platform_owner`** - Full platform access (all features)
- **`platform_admin`** - Manage tenants and subscriptions
- **`platform_support`** - View access + user impersonation
- **`platform_accountant`** - Financial management only

### Tenant Roles (Within Organization):
- **`admin`** / **`owner`** - Full tenant admin
- **`technician`** - Operational work
- **Other roles** - As defined in system

---

## 🔑 Becoming Platform Owner

### Option 1: Database Setup (First Time)
```sql
-- Update your user to be platform owner
UPDATE profiles
SET role = 'platform_owner',
    is_super_admin = true
WHERE email = 'your-email@example.com';
```

### Option 2: Use Setup Script
```bash
# Run the setup script
node setup-owner.js

# Or use SQL file
psql -f create-first-owner.sql
```

---

## 📍 Key Routes

### Platform Admin:
```
/platform/dashboard        → Overview of all tenants
/platform/tenants          → Manage tenant accounts
/platform/tenants/:id      → Tenant details & settings
/platform/plans            → Subscription plan management
/platform/invoices         → Billing and invoices
```

### Tenant Admin:
```
/subscription              → View subscription status
/modules                   → Enable/disable modules
/settings                  → General settings
```

---

## 🎛️ Module Management

### Access Modules Page:
1. Login as tenant admin
2. Navigate to **"Modules"** (الوحدات) in sidebar
3. Toggle modules on/off as needed

### Module Categories:

#### ✅ Core Modules (Always Active):
- Work Orders
- Assets
- Locations
- Maintenance

#### 🔧 Advanced Modules (Optional):
- Teams
- Inventory
- Operations Log
- Contracts
- Calibration

#### ⭐ Premium Modules (Optional):
- Advanced Analytics

---

## 📊 Managing Tenants

### Create New Tenant:
1. Go to `/platform/tenants`
2. Click **"Add Tenant"**
3. Fill in details:
   - Name (English & Arabic)
   - Subscription plan
   - Contact info
4. Save

### Suspend Tenant:
```sql
SELECT suspend_tenant(
  'tenant-uuid-here',
  'Reason for suspension'
);
```

Or use the UI:
1. Go to tenant details
2. Click **"Suspend"**
3. Enter reason
4. Confirm

### Activate Tenant:
```sql
SELECT activate_tenant('tenant-uuid-here');
```

---

## 💰 Subscription Plans

### Default Plans:

| Plan | Users | Assets | Work Orders | Storage | Price/Month |
|------|-------|--------|-------------|---------|-------------|
| **Starter** | 5 | 100 | 500 | 1 GB | $99 |
| **Professional** | 20 | 500 | 2000 | 5 GB | $299 |
| **Enterprise** | 100 | 2000 | 10000 | 20 GB | $999 |
| **Custom** | Unlimited | Unlimited | Unlimited | Unlimited | Custom |

### View Usage:
```sql
SELECT get_tenant_remaining_quota('tenant-uuid');
```

Returns JSON:
```json
{
  "users": {
    "used": 3,
    "limit": 5,
    "remaining": 2,
    "percentage": 60
  },
  "assets": {...},
  "work_orders": {...},
  "storage": {...}
}
```

---

## 🔐 Permissions System

### Check User Permission:
```typescript
import { supabase } from '@/integrations/supabase/client';

const { data } = await supabase.rpc('has_permission_v2', {
  user_uuid: userId,
  permission_key: 'platform.manage_tenants'
});

if (data) {
  // User has permission
}
```

### Permission Categories:

**Platform:**
- `platform.view_all_tenants`
- `platform.manage_tenants`
- `platform.suspend_tenant`
- `platform.manage_subscriptions`
- etc.

**Tenant:**
- `tenants.manage_users`
- `tenants.manage_modules`
- `work_orders.view`
- `assets.manage`
- etc.

### Grant Custom Permission:
```sql
INSERT INTO user_permissions (user_id, permission_key, effect, tenant_id)
VALUES (
  'user-uuid',
  'work_orders.approve',
  'grant',
  'tenant-uuid'
);
```

### Deny Permission:
```sql
INSERT INTO user_permissions (user_id, permission_key, effect, tenant_id)
VALUES (
  'user-uuid',
  'assets.delete',
  'deny',
  'tenant-uuid'
);
```

---

## 📝 Audit Logs

### View Audit Trail:
```sql
SELECT *
FROM platform_audit_logs
WHERE resource_type = 'tenant'
ORDER BY created_at DESC
LIMIT 50;
```

### Log Custom Action:
```sql
INSERT INTO platform_audit_logs (
  action,
  resource_type,
  resource_id,
  performed_by,
  details
) VALUES (
  'custom_action',
  'tenant',
  'tenant-uuid',
  auth.uid(),
  '{"note": "Custom action performed"}'::jsonb
);
```

---

## 🔧 Functions Reference

### Subscription Functions:
```sql
-- Check if tenant is active
SELECT check_tenant_active('tenant-uuid');

-- Check if module is enabled
SELECT check_tenant_feature_enabled('tenant-uuid', 'analytics');

-- Calculate usage
SELECT calculate_tenant_usage('tenant-uuid');

-- Get remaining quota
SELECT get_tenant_remaining_quota('tenant-uuid');

-- Suspend tenant
SELECT suspend_tenant('tenant-uuid', 'Non-payment');

-- Activate tenant
SELECT activate_tenant('tenant-uuid');
```

### Permission Functions:
```sql
-- Check permission
SELECT has_permission_v2('user-uuid', 'platform.manage_tenants');
```

---

## 🎨 UI Components

### Display Subscription Badge:
```tsx
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge';

<SubscriptionBadge status="active" />
<SubscriptionBadge status="trial" />
<SubscriptionBadge status="suspended" />
```

### Show Usage Indicator:
```tsx
import { UsageIndicator } from '@/components/subscription/UsageIndicator';

<UsageIndicator
  used={75}
  limit={100}
  label="Assets"
  type="assets"
/>
```

### Display Plan Card:
```tsx
import { PlanCard } from '@/components/subscription/PlanCard';

<PlanCard
  plan={subscriptionPlan}
  onSelect={handlePlanSelect}
/>
```

---

## 🔄 Edge Functions (Cron Jobs)

### Scheduled Functions:

1. **`daily-subscription-check`** (Daily 00:00)
   - Checks expired subscriptions
   - Moves to grace period
   - Suspends after grace period

2. **`send-subscription-reminder`** (Daily 09:00)
   - Sends expiration reminders
   - 7 days before expiry
   - 3 days before expiry
   - On expiry day

3. **`check-maintenance-tasks`** (Daily 06:00)
   - Checks due maintenance tasks
   - Creates notifications

4. **`auto-close-work-orders`** (Daily 23:00)
   - Auto-closes pending closure work orders
   - After 7 days

---

## 🛠️ Common Tasks

### 1. Add New Permission:
```sql
INSERT INTO permissions (key, name, name_ar, category, description)
VALUES (
  'custom.permission',
  'Custom Permission',
  'صلاحية مخصصة',
  'custom',
  'Description of permission'
);

-- Assign to role
INSERT INTO role_permissions (role, permission_key, allowed)
VALUES ('admin', 'custom.permission', true);
```

### 2. Create Custom Plan:
```sql
INSERT INTO subscription_plans (
  code, name, name_ar, price_monthly,
  included_users, included_assets
) VALUES (
  'custom_plan',
  'Custom Plan',
  'خطة مخصصة',
  500,
  50,
  1000
);
```

### 3. Override Tenant Limits:
```sql
UPDATE tenants
SET
  max_users = 200,
  max_assets = 5000,
  max_work_orders_per_month = 20000
WHERE id = 'tenant-uuid';
```

### 4. Enable All Modules:
```sql
UPDATE tenants
SET enabled_modules = '[
  "work_orders",
  "assets",
  "locations",
  "maintenance",
  "teams",
  "inventory",
  "operations_log",
  "contracts",
  "calibration",
  "analytics"
]'::jsonb
WHERE id = 'tenant-uuid';
```

---

## 🐛 Troubleshooting

### Issue: User can't access platform dashboard
**Solution:**
```sql
UPDATE profiles
SET role = 'platform_admin'
WHERE id = 'user-uuid';
```

### Issue: Tenant shows as suspended
**Solution:**
```sql
SELECT activate_tenant('tenant-uuid');
```

### Issue: Module not showing
**Solution:**
```sql
-- Check enabled modules
SELECT enabled_modules FROM tenants WHERE id = 'tenant-uuid';

-- Add module
UPDATE tenants
SET enabled_modules = enabled_modules || '["missing_module"]'::jsonb
WHERE id = 'tenant-uuid';
```

### Issue: Permission denied
**Solution:**
```sql
-- Check user permissions
SELECT * FROM role_permissions
WHERE role = (SELECT role FROM profiles WHERE id = 'user-uuid');

-- Grant permission override
INSERT INTO user_permissions (user_id, permission_key, effect)
VALUES ('user-uuid', 'needed.permission', 'grant');
```

---

## 📚 Additional Resources

- **Complete Documentation:** `MULTI_TENANCY_COMPLETED.md`
- **Database Schema:** `DATABASE_COMPLETE_SCHEMA.md`
- **Permissions Guide:** `PERMISSIONS_SYSTEM_GUIDE.md`
- **Platform Setup:** `PLATFORM_OWNER_SETUP.md`

---

## 🎉 You're Ready!

The Multi-Tenancy system is fully operational. Explore the Platform Dashboard and start managing your tenants!

**Questions?** Check the complete documentation or the codebase comments.

---

**Built with ❤️ for Mutqan CMMS**
