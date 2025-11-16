-- Fix company-logos bucket RLS policies to support custom roles

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update company logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete company logos" ON storage.objects;

-- Create new policies that support both app_role and custom roles
CREATE POLICY "Admins can upload company logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' AND
  (
    has_role(auth.uid(), 'hospital_admin'::app_role) OR
    has_role(auth.uid(), 'facility_manager'::app_role) OR
    has_role(auth.uid(), 'global_admin'::app_role) OR
    has_role_by_code(auth.uid(), 'hospital_admin') OR
    has_role_by_code(auth.uid(), 'facility_manager') OR
    has_role_by_code(auth.uid(), 'global_admin')
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
    has_role(auth.uid(), 'global_admin'::app_role) OR
    has_role_by_code(auth.uid(), 'hospital_admin') OR
    has_role_by_code(auth.uid(), 'facility_manager') OR
    has_role_by_code(auth.uid(), 'global_admin')
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
    has_role(auth.uid(), 'global_admin'::app_role) OR
    has_role_by_code(auth.uid(), 'hospital_admin') OR
    has_role_by_code(auth.uid(), 'facility_manager') OR
    has_role_by_code(auth.uid(), 'global_admin')
  )
);