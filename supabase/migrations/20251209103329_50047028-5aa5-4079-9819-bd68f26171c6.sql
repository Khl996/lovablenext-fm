-- Add tagline settings to system_settings
INSERT INTO public.system_settings (setting_key, setting_value, setting_type)
VALUES 
  ('app_tagline', 'Hospital Facility and Maintenance Management', 'text'),
  ('app_tagline_ar', 'إدارة المرافق والصيانة للمستشفيات', 'text')
ON CONFLICT (setting_key) DO NOTHING;