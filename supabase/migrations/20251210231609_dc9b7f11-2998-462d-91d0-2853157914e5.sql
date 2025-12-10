-- Add analytics.view permission
INSERT INTO public.permissions (key, name, name_ar, category, description)
VALUES ('analytics.view', 'View System Statistics', 'عرض إحصائيات النظام', 'analytics', 'Access to detailed system statistics and analytics dashboard')
ON CONFLICT (key) DO NOTHING;

-- Grant analytics.view to global_admin
INSERT INTO public.role_permissions (role_code, permission_key, allowed, hospital_id)
VALUES ('global_admin', 'analytics.view', true, NULL)
ON CONFLICT DO NOTHING;