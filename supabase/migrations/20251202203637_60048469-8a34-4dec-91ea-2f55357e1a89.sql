-- حذف الصلاحيات غير المستخدمة من role_permissions
DELETE FROM role_permissions 
WHERE permission_key IN (
  'approve_work_orders',
  'assets.qr',
  'assign_work_orders',
  'create_work_orders',
  'delete_work_orders',
  'edit_work_orders',
  'export_assets',
  'export_reports',
  'inventory.reports',
  'maintenance.execute',
  'manage_users',
  'operations_log.create',
  'settings.hospitals',
  'settings.roles',
  'users.permissions',
  'view_reports',
  'work_orders.approve_as_supervisor',
  'buildings.supervise',
  'create_operations_log',
  'manage_maintenance_plans',
  'manage_permissions',
  'manage_roles',
  'users.create',
  'view_maintenance_plans',
  'work_orders.view'
);

-- حذف الصلاحيات غير المستخدمة من جدول permissions
DELETE FROM permissions 
WHERE key IN (
  'approve_work_orders',
  'assets.qr',
  'assign_work_orders',
  'create_work_orders',
  'delete_work_orders',
  'edit_work_orders',
  'export_assets',
  'export_reports',
  'inventory.reports',
  'maintenance.execute',
  'manage_users',
  'operations_log.create',
  'settings.hospitals',
  'settings.roles',
  'users.permissions',
  'view_reports',
  'work_orders.approve_as_supervisor',
  'buildings.supervise',
  'create_operations_log',
  'manage_maintenance_plans',
  'manage_permissions',
  'manage_roles',
  'users.create',
  'view_maintenance_plans',
  'work_orders.view'
);