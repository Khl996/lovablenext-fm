/*
  # إضافة كل الصلاحيات لدور owner
  
  1. صلاحيات الموديولات الأساسية
    - كل الصلاحيات الموجودة في جدول permissions
  
  2. الأمان
    - كل الصلاحيات مفعّلة للـ owner
*/

-- حذف الصلاحيات القديمة للـ owner
DELETE FROM role_permissions WHERE role = 'owner';

-- إضافة كل الصلاحيات من جدول permissions
INSERT INTO role_permissions (role, permission_key, allowed)
SELECT 'owner', key, true
FROM permissions
WHERE key NOT LIKE 'platform.%'  -- استثناء صلاحيات Platform (للـ platform_owner فقط)
ON CONFLICT (role, permission_key) 
DO UPDATE SET allowed = true;