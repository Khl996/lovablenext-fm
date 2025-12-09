-- Add email gateway settings
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, description_ar)
VALUES 
  ('email_from_address', 'noreply@facility-management.space', 'email', 'Email sender address', 'عنوان البريد المرسل'),
  ('email_from_name', 'نظام الصيانة', 'text', 'Email sender display name', 'اسم المرسل'),
  ('email_enabled', 'true', 'boolean', 'Enable/disable email notifications', 'تفعيل/تعطيل إشعارات البريد')
ON CONFLICT (setting_key) DO NOTHING;