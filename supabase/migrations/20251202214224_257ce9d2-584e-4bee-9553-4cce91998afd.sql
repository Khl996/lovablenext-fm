-- إضافة صلاحية operations_log.manage
INSERT INTO permissions (key, name, name_ar, category, description)
VALUES ('operations_log.manage', 'Manage Operations Log', 'إدارة سجل العمليات', 'operations_log', 'Create, edit and delete operations log entries')
ON CONFLICT (key) DO NOTHING;

-- منح الصلاحية للأدوار المناسبة (hospital_admin, facility_manager, maintenance_manager)
INSERT INTO role_permissions (role_code, permission_key, allowed, hospital_id)
SELECT role_code, 'operations_log.manage', true, NULL
FROM (VALUES ('hospital_admin'), ('facility_manager'), ('maintenance_manager')) AS roles(role_code)
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions 
  WHERE role_code = roles.role_code 
  AND permission_key = 'operations_log.manage' 
  AND hospital_id IS NULL
);