-- Allow public (anonymous) access to read branding settings
CREATE POLICY "Public can view branding settings"
ON public.system_settings
FOR SELECT
USING (
  setting_key IN ('app_name', 'app_name_ar', 'app_tagline', 'app_tagline_ar', 'app_logo_url', 'default_language')
);