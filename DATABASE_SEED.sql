-- =====================================================
-- Mutqan FM System - Database Seed Script
-- =====================================================
-- هذا الملف يحتوي على جميع البيانات الأساسية للنظام
-- يجب تشغيله مرة واحدة بعد إنشاء أي Remix جديد
-- 
-- الخطوات:
-- 1. افتح Cloud UI من Settings → Cloud
-- 2. انسخ هذا الكود وشغله في SQL Editor
-- =====================================================

-- =====================================================
-- الجزء 1: جدول الصلاحيات (permissions)
-- =====================================================

INSERT INTO public.permissions (key, name, name_ar, category, description) VALUES
-- Assets Module
('assets.view', 'View Assets', 'عرض الأصول', 'assets', 'Permission to view assets'),
('assets.manage', 'Manage Assets', 'إدارة الأصول', 'assets', 'Permission to create, edit, delete assets'),

-- Facilities Module
('facilities.view', 'View Facilities', 'عرض المرافق', 'facilities', 'Permission to view buildings, floors, departments, rooms'),
('facilities.manage', 'Manage Facilities', 'إدارة المرافق', 'facilities', 'Permission to manage facility structure'),

-- Inventory Module
('inventory.view', 'View Inventory', 'عرض المخزون', 'inventory', 'Permission to view inventory items'),
('inventory.manage', 'Manage Inventory', 'إدارة المخزون', 'inventory', 'Permission to manage inventory'),
('inventory.transactions', 'Inventory Transactions', 'معاملات المخزون', 'inventory', 'Permission to perform stock in/out'),

-- Teams Module
('teams.view', 'View Teams', 'عرض الفرق', 'teams', 'Permission to view teams'),
('teams.manage', 'Manage Teams', 'إدارة الفرق', 'teams', 'Permission to manage teams and members'),

-- Operations Log Module
('operations_log.view', 'View Operations Log', 'عرض سجل العمليات', 'operations_log', 'Permission to view operations log'),

-- Work Orders Module
('work_orders.create', 'Create Work Orders', 'إنشاء أوامر العمل', 'work_orders', 'Permission to create work orders'),
('work_orders.view', 'View Work Orders', 'عرض أوامر العمل', 'work_orders', 'Permission to view work orders'),
('work_orders.manage', 'Manage Work Orders', 'إدارة أوامر العمل', 'work_orders', 'Permission to manage work orders'),
('work_orders.execute', 'Execute Work Orders', 'تنفيذ أوامر العمل', 'work_orders', 'Permission to start and complete work'),
('work_orders.approve', 'Approve Work Orders', 'اعتماد أوامر العمل', 'work_orders', 'Supervisor approval permission'),
('work_orders.review_as_engineer', 'Engineer Review', 'مراجعة المهندس', 'work_orders', 'Engineer review permission'),
('work_orders.final_approve', 'Final Approval', 'الاعتماد النهائي', 'work_orders', 'Final approval by maintenance manager'),
('work_orders.reassign', 'Reassign Work Orders', 'إعادة تعيين أوامر العمل', 'work_orders', 'Permission to reassign work orders'),

-- Users Module
('users.view', 'View Users', 'عرض المستخدمين', 'users', 'Permission to view users'),
('users.manage', 'Manage Users', 'إدارة المستخدمين', 'users', 'Permission to manage users'),

-- Maintenance Module
('maintenance.view', 'View Maintenance', 'عرض الصيانة', 'maintenance', 'Permission to view maintenance plans'),
('maintenance.manage', 'Manage Maintenance', 'إدارة الصيانة', 'maintenance', 'Permission to manage maintenance plans'),

-- Analytics
('analytics.view', 'View Analytics', 'عرض التحليلات', 'analytics', 'Permission to view analytics and reports'),

-- Calibration Module
('calibration.view', 'View Calibration', 'عرض المعايرة', 'calibration', 'Permission to view calibration records'),
('calibration.manage', 'Manage Calibration', 'إدارة المعايرة', 'calibration', 'Permission to manage calibration'),

-- Contracts Module
('contracts.view', 'View Contracts', 'عرض العقود', 'contracts', 'Permission to view contracts'),
('contracts.manage', 'Manage Contracts', 'إدارة العقود', 'contracts', 'Permission to manage contracts'),

-- Hospitals Module (Global Admin only)
('hospitals.view', 'View Hospitals', 'عرض المستشفيات', 'hospitals', 'Permission to view hospitals'),
('hospitals.manage', 'Manage Hospitals', 'إدارة المستشفيات', 'hospitals', 'Permission to manage hospitals'),

-- Companies Module
('companies.view', 'View Companies', 'عرض الشركات', 'companies', 'Permission to view companies'),
('companies.manage', 'Manage Companies', 'إدارة الشركات', 'companies', 'Permission to manage companies'),

-- Settings Module
('settings.view', 'View Settings', 'عرض الإعدادات', 'settings', 'Permission to view settings'),
('settings.manage', 'Manage Settings', 'إدارة الإعدادات', 'settings', 'Permission to manage settings'),
('settings.role_permissions', 'Manage Role Permissions', 'إدارة صلاحيات الأدوار', 'settings', 'Permission to manage role permissions matrix'),
('settings.locations', 'Manage Locations', 'إدارة المواقع', 'settings', 'Permission to manage location settings'),
('settings.issue_types', 'Manage Issue Types', 'إدارة أنواع المشاكل', 'settings', 'Permission to manage issue type mappings'),
('settings.specializations', 'Manage Specializations', 'إدارة التخصصات', 'settings', 'Permission to manage specializations'),
('settings.lookup_tables', 'Manage Lookup Tables', 'إدارة جداول البحث', 'settings', 'Permission to manage lookup tables')

ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- الجزء 2: صلاحيات الأدوار (role_permissions)
-- =====================================================

-- Global Admin - Full Access (hospital_id = NULL means global)
INSERT INTO public.role_permissions (role_code, permission_key, allowed, hospital_id) VALUES
('global_admin', 'assets.view', true, NULL),
('global_admin', 'assets.manage', true, NULL),
('global_admin', 'facilities.view', true, NULL),
('global_admin', 'facilities.manage', true, NULL),
('global_admin', 'inventory.view', true, NULL),
('global_admin', 'inventory.manage', true, NULL),
('global_admin', 'inventory.transactions', true, NULL),
('global_admin', 'teams.view', true, NULL),
('global_admin', 'teams.manage', true, NULL),
('global_admin', 'operations_log.view', true, NULL),
('global_admin', 'work_orders.create', true, NULL),
('global_admin', 'work_orders.view', true, NULL),
('global_admin', 'work_orders.manage', true, NULL),
('global_admin', 'work_orders.execute', true, NULL),
('global_admin', 'work_orders.approve', true, NULL),
('global_admin', 'work_orders.review_as_engineer', true, NULL),
('global_admin', 'work_orders.final_approve', true, NULL),
('global_admin', 'work_orders.reassign', true, NULL),
('global_admin', 'users.view', true, NULL),
('global_admin', 'users.manage', true, NULL),
('global_admin', 'maintenance.view', true, NULL),
('global_admin', 'maintenance.manage', true, NULL),
('global_admin', 'analytics.view', true, NULL),
('global_admin', 'calibration.view', true, NULL),
('global_admin', 'calibration.manage', true, NULL),
('global_admin', 'contracts.view', true, NULL),
('global_admin', 'contracts.manage', true, NULL),
('global_admin', 'hospitals.view', true, NULL),
('global_admin', 'hospitals.manage', true, NULL),
('global_admin', 'companies.view', true, NULL),
('global_admin', 'companies.manage', true, NULL),
('global_admin', 'settings.view', true, NULL),
('global_admin', 'settings.manage', true, NULL),
('global_admin', 'settings.role_permissions', true, NULL),
('global_admin', 'settings.locations', true, NULL),
('global_admin', 'settings.issue_types', true, NULL),
('global_admin', 'settings.specializations', true, NULL),
('global_admin', 'settings.lookup_tables', true, NULL)
ON CONFLICT DO NOTHING;

-- Hospital Admin
INSERT INTO public.role_permissions (role_code, permission_key, allowed, hospital_id) VALUES
('hospital_admin', 'assets.view', true, NULL),
('hospital_admin', 'assets.manage', true, NULL),
('hospital_admin', 'facilities.view', true, NULL),
('hospital_admin', 'facilities.manage', true, NULL),
('hospital_admin', 'inventory.view', true, NULL),
('hospital_admin', 'inventory.manage', true, NULL),
('hospital_admin', 'inventory.transactions', true, NULL),
('hospital_admin', 'teams.view', true, NULL),
('hospital_admin', 'teams.manage', true, NULL),
('hospital_admin', 'operations_log.view', true, NULL),
('hospital_admin', 'work_orders.create', true, NULL),
('hospital_admin', 'work_orders.view', true, NULL),
('hospital_admin', 'work_orders.manage', true, NULL),
('hospital_admin', 'work_orders.execute', true, NULL),
('hospital_admin', 'work_orders.approve', true, NULL),
('hospital_admin', 'work_orders.review_as_engineer', true, NULL),
('hospital_admin', 'work_orders.final_approve', true, NULL),
('hospital_admin', 'work_orders.reassign', true, NULL),
('hospital_admin', 'users.view', true, NULL),
('hospital_admin', 'users.manage', true, NULL),
('hospital_admin', 'maintenance.view', true, NULL),
('hospital_admin', 'maintenance.manage', true, NULL),
('hospital_admin', 'analytics.view', true, NULL),
('hospital_admin', 'calibration.view', true, NULL),
('hospital_admin', 'calibration.manage', true, NULL),
('hospital_admin', 'contracts.view', true, NULL),
('hospital_admin', 'contracts.manage', true, NULL),
('hospital_admin', 'companies.view', true, NULL),
('hospital_admin', 'companies.manage', true, NULL),
('hospital_admin', 'settings.locations', true, NULL),
('hospital_admin', 'settings.issue_types', true, NULL),
('hospital_admin', 'settings.specializations', true, NULL),
('hospital_admin', 'settings.lookup_tables', true, NULL)
ON CONFLICT DO NOTHING;

-- Facility Manager
INSERT INTO public.role_permissions (role_code, permission_key, allowed, hospital_id) VALUES
('facility_manager', 'assets.view', true, NULL),
('facility_manager', 'assets.manage', true, NULL),
('facility_manager', 'facilities.view', true, NULL),
('facility_manager', 'facilities.manage', true, NULL),
('facility_manager', 'inventory.view', true, NULL),
('facility_manager', 'inventory.manage', true, NULL),
('facility_manager', 'inventory.transactions', true, NULL),
('facility_manager', 'teams.view', true, NULL),
('facility_manager', 'teams.manage', true, NULL),
('facility_manager', 'operations_log.view', true, NULL),
('facility_manager', 'work_orders.create', true, NULL),
('facility_manager', 'work_orders.view', true, NULL),
('facility_manager', 'work_orders.manage', true, NULL),
('facility_manager', 'work_orders.approve', true, NULL),
('facility_manager', 'work_orders.reassign', true, NULL),
('facility_manager', 'users.view', true, NULL),
('facility_manager', 'maintenance.view', true, NULL),
('facility_manager', 'maintenance.manage', true, NULL),
('facility_manager', 'analytics.view', true, NULL),
('facility_manager', 'calibration.view', true, NULL),
('facility_manager', 'contracts.view', true, NULL),
('facility_manager', 'companies.view', true, NULL)
ON CONFLICT DO NOTHING;

-- Maintenance Manager
INSERT INTO public.role_permissions (role_code, permission_key, allowed, hospital_id) VALUES
('maintenance_manager', 'assets.view', true, NULL),
('maintenance_manager', 'assets.manage', true, NULL),
('maintenance_manager', 'facilities.view', true, NULL),
('maintenance_manager', 'inventory.view', true, NULL),
('maintenance_manager', 'inventory.manage', true, NULL),
('maintenance_manager', 'inventory.transactions', true, NULL),
('maintenance_manager', 'teams.view', true, NULL),
('maintenance_manager', 'teams.manage', true, NULL),
('maintenance_manager', 'operations_log.view', true, NULL),
('maintenance_manager', 'work_orders.create', true, NULL),
('maintenance_manager', 'work_orders.view', true, NULL),
('maintenance_manager', 'work_orders.manage', true, NULL),
('maintenance_manager', 'work_orders.approve', true, NULL),
('maintenance_manager', 'work_orders.review_as_engineer', true, NULL),
('maintenance_manager', 'work_orders.final_approve', true, NULL),
('maintenance_manager', 'work_orders.reassign', true, NULL),
('maintenance_manager', 'users.view', true, NULL),
('maintenance_manager', 'maintenance.view', true, NULL),
('maintenance_manager', 'maintenance.manage', true, NULL),
('maintenance_manager', 'analytics.view', true, NULL),
('maintenance_manager', 'calibration.view', true, NULL),
('maintenance_manager', 'calibration.manage', true, NULL)
ON CONFLICT DO NOTHING;

-- Engineer
INSERT INTO public.role_permissions (role_code, permission_key, allowed, hospital_id) VALUES
('engineer', 'assets.view', true, NULL),
('engineer', 'facilities.view', true, NULL),
('engineer', 'inventory.view', true, NULL),
('engineer', 'teams.view', true, NULL),
('engineer', 'operations_log.view', true, NULL),
('engineer', 'work_orders.create', true, NULL),
('engineer', 'work_orders.view', true, NULL),
('engineer', 'work_orders.execute', true, NULL),
('engineer', 'work_orders.review_as_engineer', true, NULL),
('engineer', 'maintenance.view', true, NULL),
('engineer', 'maintenance.manage', true, NULL),
('engineer', 'calibration.view', true, NULL)
ON CONFLICT DO NOTHING;

-- Supervisor
INSERT INTO public.role_permissions (role_code, permission_key, allowed, hospital_id) VALUES
('supervisor', 'assets.view', true, NULL),
('supervisor', 'facilities.view', true, NULL),
('supervisor', 'inventory.view', true, NULL),
('supervisor', 'inventory.transactions', true, NULL),
('supervisor', 'teams.view', true, NULL),
('supervisor', 'operations_log.view', true, NULL),
('supervisor', 'work_orders.create', true, NULL),
('supervisor', 'work_orders.view', true, NULL),
('supervisor', 'work_orders.execute', true, NULL),
('supervisor', 'work_orders.approve', true, NULL),
('supervisor', 'work_orders.reassign', true, NULL),
('supervisor', 'maintenance.view', true, NULL)
ON CONFLICT DO NOTHING;

-- Technician
INSERT INTO public.role_permissions (role_code, permission_key, allowed, hospital_id) VALUES
('technician', 'assets.view', true, NULL),
('technician', 'facilities.view', true, NULL),
('technician', 'inventory.view', true, NULL),
('technician', 'inventory.transactions', true, NULL),
('technician', 'work_orders.view', true, NULL),
('technician', 'work_orders.execute', true, NULL),
('technician', 'maintenance.view', true, NULL)
ON CONFLICT DO NOTHING;

-- Reporter
INSERT INTO public.role_permissions (role_code, permission_key, allowed, hospital_id) VALUES
('reporter', 'work_orders.create', true, NULL),
('reporter', 'work_orders.view', true, NULL)
ON CONFLICT DO NOTHING;

-- Work Order Manager (دور خاص لإدارة أوامر العمل فقط)
INSERT INTO public.role_permissions (role_code, permission_key, allowed, hospital_id) VALUES
('work_order_manager', 'work_orders.view', true, NULL),
('work_order_manager', 'work_orders.manage', true, NULL),
('work_order_manager', 'work_orders.approve', true, NULL),
('work_order_manager', 'work_orders.reassign', true, NULL),
('work_order_manager', 'teams.view', true, NULL)
ON CONFLICT DO NOTHING;

-- =====================================================
-- الجزء 3: إعدادات النظام الافتراضية (system_settings)
-- =====================================================

INSERT INTO public.system_settings (key, value) VALUES
('app_name', 'Mutqan FM'),
('app_name_ar', 'متقن لإدارة المرافق'),
('app_tagline', 'Facility Management System'),
('app_tagline_ar', 'نظام إدارة المرافق'),
('default_language', 'ar'),
('email_enabled', 'true'),
('email_from_address', 'noreply@facility-management.space'),
('email_from_name', 'نظام الصيانة')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- الجزء 4: إنشاء مدير النظام الأول
-- =====================================================
-- ملاحظة مهمة: هذا القسم يتطلب تعديل يدوي!
-- بعد إنشاء حساب المستخدم من واجهة التطبيق، 
-- استبدل 'USER_UUID_HERE' بـ UUID المستخدم الفعلي

-- الخطوة 1: أنشئ حساب مستخدم من صفحة تسجيل الدخول
-- الخطوة 2: احصل على UUID المستخدم من جدول auth.users أو profiles
-- الخطوة 3: شغّل الأمر التالي بعد استبدال UUID:

/*
INSERT INTO public.user_custom_roles (user_id, role_code, hospital_id)
VALUES ('USER_UUID_HERE', 'global_admin', NULL);
*/

-- =====================================================
-- الجزء 5: جداول البحث الافتراضية (Lookup Tables)
-- =====================================================
-- ملاحظة: هذه الجداول تحتاج hospital_id
-- يجب تشغيلها بعد إنشاء المستشفى

/*
-- استبدل 'HOSPITAL_UUID_HERE' بـ UUID المستشفى

-- أولويات أوامر العمل
INSERT INTO public.lookup_priorities (hospital_id, code, name, name_ar, level, color, display_order, is_active) VALUES
('HOSPITAL_UUID_HERE', 'critical', 'Critical', 'حرج', 1, '#DC2626', 1, true),
('HOSPITAL_UUID_HERE', 'urgent', 'Urgent', 'عاجل', 2, '#EA580C', 2, true),
('HOSPITAL_UUID_HERE', 'high', 'High', 'مرتفع', 3, '#F59E0B', 3, true),
('HOSPITAL_UUID_HERE', 'medium', 'Medium', 'متوسط', 4, '#3B82F6', 4, true),
('HOSPITAL_UUID_HERE', 'low', 'Low', 'منخفض', 5, '#22C55E', 5, true);

-- حالات أوامر العمل
INSERT INTO public.lookup_work_order_statuses (hospital_id, code, name, name_ar, category, color, display_order, is_active) VALUES
('HOSPITAL_UUID_HERE', 'pending', 'Pending', 'قيد الانتظار', 'open', '#6B7280', 1, true),
('HOSPITAL_UUID_HERE', 'assigned', 'Assigned', 'تم التعيين', 'open', '#3B82F6', 2, true),
('HOSPITAL_UUID_HERE', 'in_progress', 'In Progress', 'قيد التنفيذ', 'active', '#F59E0B', 3, true),
('HOSPITAL_UUID_HERE', 'pending_supervisor_approval', 'Pending Supervisor', 'بانتظار المشرف', 'review', '#8B5CF6', 4, true),
('HOSPITAL_UUID_HERE', 'pending_engineer_review', 'Pending Engineer', 'بانتظار المهندس', 'review', '#EC4899', 5, true),
('HOSPITAL_UUID_HERE', 'pending_reporter_closure', 'Pending Closure', 'بانتظار الإغلاق', 'review', '#14B8A6', 6, true),
('HOSPITAL_UUID_HERE', 'completed', 'Completed', 'مكتمل', 'closed', '#22C55E', 7, true),
('HOSPITAL_UUID_HERE', 'auto_closed', 'Auto Closed', 'إغلاق تلقائي', 'closed', '#6B7280', 8, true),
('HOSPITAL_UUID_HERE', 'cancelled', 'Cancelled', 'ملغي', 'closed', '#EF4444', 9, true);

-- حالات الأصول
INSERT INTO public.lookup_asset_statuses (hospital_id, code, name, name_ar, category, color, display_order, is_active) VALUES
('HOSPITAL_UUID_HERE', 'active', 'Active', 'نشط', 'operational', '#22C55E', 1, true),
('HOSPITAL_UUID_HERE', 'maintenance', 'Under Maintenance', 'تحت الصيانة', 'non_operational', '#F59E0B', 2, true),
('HOSPITAL_UUID_HERE', 'inactive', 'Inactive', 'غير نشط', 'non_operational', '#6B7280', 3, true),
('HOSPITAL_UUID_HERE', 'disposed', 'Disposed', 'تم التخلص منه', 'disposed', '#EF4444', 4, true);

-- أدوار الفريق
INSERT INTO public.lookup_team_roles (hospital_id, code, name, name_ar, level, display_order, is_active) VALUES
('HOSPITAL_UUID_HERE', 'leader', 'Team Leader', 'قائد الفريق', 1, 1, true),
('HOSPITAL_UUID_HERE', 'supervisor', 'Supervisor', 'مشرف', 2, 2, true),
('HOSPITAL_UUID_HERE', 'senior_tech', 'Senior Technician', 'فني أول', 3, 3, true),
('HOSPITAL_UUID_HERE', 'technician', 'Technician', 'فني', 4, 4, true),
('HOSPITAL_UUID_HERE', 'helper', 'Helper', 'مساعد', 5, 5, true);

-- أنواع العمل
INSERT INTO public.lookup_work_types (hospital_id, code, name, name_ar, display_order, is_active) VALUES
('HOSPITAL_UUID_HERE', 'corrective', 'Corrective Maintenance', 'صيانة تصحيحية', 1, true),
('HOSPITAL_UUID_HERE', 'preventive', 'Preventive Maintenance', 'صيانة وقائية', 2, true),
('HOSPITAL_UUID_HERE', 'emergency', 'Emergency Repair', 'إصلاح طارئ', 3, true),
('HOSPITAL_UUID_HERE', 'inspection', 'Inspection', 'فحص', 4, true),
('HOSPITAL_UUID_HERE', 'installation', 'Installation', 'تركيب', 5, true);
*/

-- =====================================================
-- نهاية الملف
-- =====================================================
-- 
-- خطوات الإعداد الكاملة:
-- 1. شغّل هذا الملف في SQL Editor
-- 2. أنشئ حساب مستخدم من التطبيق
-- 3. أضف المستخدم كـ global_admin (الجزء 4)
-- 4. أنشئ مستشفى من صفحة Hospitals
-- 5. شغّل جداول البحث (الجزء 5) مع UUID المستشفى
-- =====================================================
