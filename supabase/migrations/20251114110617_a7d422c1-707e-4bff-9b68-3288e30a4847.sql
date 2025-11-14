-- إضافة أذونات جديدة لسير عمل أوامر العمل
INSERT INTO public.permissions (key, name, name_ar, category, description)
VALUES 
  ('work_orders.approve_as_supervisor', 'Approve as Supervisor', 'الموافقة كمشرف', 'Work Orders', 'Permission to approve work orders as supervisor after technician completion'),
  ('work_orders.review_as_engineer', 'Review as Engineer', 'المراجعة كمهندس', 'Work Orders', 'Permission to review work orders as engineer after supervisor approval'),
  ('work_orders.final_approve', 'Final Approval', 'الاعتماد النهائي', 'Work Orders', 'Permission to give final approval to work orders as maintenance manager')
ON CONFLICT (key) DO NOTHING;

-- ربط الأذونات بالأدوار المناسبة
-- المشرف: يمكنه الموافقة على أوامر العمل بعد إكمال الفني
INSERT INTO public.role_permissions (role, permission_key, allowed)
VALUES 
  ('supervisor', 'work_orders.approve_as_supervisor', true)
ON CONFLICT DO NOTHING;

-- المهندس/مدير الصيانة: يمكنه مراجعة أوامر العمل بعد موافقة المشرف
INSERT INTO public.role_permissions (role, permission_key, allowed)
VALUES 
  ('maintenance_manager', 'work_orders.review_as_engineer', true),
  ('facility_manager', 'work_orders.review_as_engineer', true)
ON CONFLICT DO NOTHING;

-- مدير الصيانة: يمكنه إعطاء الموافقة النهائية
INSERT INTO public.role_permissions (role, permission_key, allowed)
VALUES 
  ('maintenance_manager', 'work_orders.final_approve', true)
ON CONFLICT DO NOTHING;