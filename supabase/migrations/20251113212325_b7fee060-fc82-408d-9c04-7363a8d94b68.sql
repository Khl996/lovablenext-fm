-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for company logos bucket
CREATE POLICY "Company logos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'company-logos');

CREATE POLICY "Admins can upload company logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' AND
  (
    has_role(auth.uid(), 'hospital_admin'::app_role) OR
    has_role(auth.uid(), 'facility_manager'::app_role) OR
    has_role(auth.uid(), 'global_admin'::app_role)
  )
);

CREATE POLICY "Admins can update company logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'company-logos' AND
  (
    has_role(auth.uid(), 'hospital_admin'::app_role) OR
    has_role(auth.uid(), 'facility_manager'::app_role) OR
    has_role(auth.uid(), 'global_admin'::app_role)
  )
);

CREATE POLICY "Admins can delete company logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'company-logos' AND
  (
    has_role(auth.uid(), 'hospital_admin'::app_role) OR
    has_role(auth.uid(), 'facility_manager'::app_role) OR
    has_role(auth.uid(), 'global_admin'::app_role)
  )
);