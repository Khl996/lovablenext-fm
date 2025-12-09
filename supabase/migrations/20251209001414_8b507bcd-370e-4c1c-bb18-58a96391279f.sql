-- Create system_settings table for app branding and configuration
CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value text,
  setting_type text NOT NULL DEFAULT 'text', -- text, boolean, number, json
  description text,
  description_ar text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only global admins can manage settings
CREATE POLICY "Global admins can manage system settings"
ON public.system_settings
FOR ALL
USING (has_role(auth.uid(), 'global_admin'::app_role) OR has_role_by_code(auth.uid(), 'global_admin'::text))
WITH CHECK (has_role(auth.uid(), 'global_admin'::app_role) OR has_role_by_code(auth.uid(), 'global_admin'::text));

-- All authenticated users can view settings (for logo display)
CREATE POLICY "Authenticated users can view system settings"
ON public.system_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Insert default settings
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, description_ar) VALUES
('app_name', 'Mutqan FM', 'text', 'Application name displayed in the header and login page', 'اسم التطبيق الذي يظهر في الترويسة وصفحة الدخول'),
('app_name_ar', 'متقن FM', 'text', 'Application name in Arabic', 'اسم التطبيق بالعربية'),
('app_logo_url', NULL, 'text', 'Custom logo URL (uploaded to storage)', 'رابط الشعار المخصص (مرفوع للتخزين)'),
('default_language', 'ar', 'text', 'Default language for new users (ar/en)', 'اللغة الافتراضية للمستخدمين الجدد');

-- Create storage bucket for system branding assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('system-branding', 'system-branding', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: global admins can upload
CREATE POLICY "Global admins can upload branding assets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'system-branding' 
  AND (has_role(auth.uid(), 'global_admin'::app_role) OR has_role_by_code(auth.uid(), 'global_admin'::text))
);

-- Storage policy: global admins can update
CREATE POLICY "Global admins can update branding assets"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'system-branding' 
  AND (has_role(auth.uid(), 'global_admin'::app_role) OR has_role_by_code(auth.uid(), 'global_admin'::text))
);

-- Storage policy: global admins can delete
CREATE POLICY "Global admins can delete branding assets"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'system-branding' 
  AND (has_role(auth.uid(), 'global_admin'::app_role) OR has_role_by_code(auth.uid(), 'global_admin'::text))
);

-- Storage policy: everyone can view (public logos)
CREATE POLICY "Anyone can view branding assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'system-branding');