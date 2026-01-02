/*
  # إضافة كل الصلاحيات لدور platform_owner
  
  1. صلاحيات Platform
    - إدارة المؤسسات
    - إدارة الاشتراكات
    - إدارة الفواتير
    - عرض التحليلات المتقدمة
  
  2. صلاحيات المؤسسات (كل الموديولات)
    - يقدر يدخل على أي مؤسسة
    - صلاحيات كاملة على كل الموديولات
  
  3. الأمان
    - كل الصلاحيات مفعّلة
*/

-- حذف الصلاحيات القديمة للـ platform_owner
DELETE FROM role_permissions WHERE role = 'platform_owner';

-- إضافة كل الصلاحيات (Platform + Tenant)
INSERT INTO role_permissions (role, permission_key, allowed)
SELECT 'platform_owner', key, true
FROM permissions
ON CONFLICT (role, permission_key) 
DO UPDATE SET allowed = true;