-- Create storage bucket for hospital logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('hospital-logos', 'hospital-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for hospital logos bucket
CREATE POLICY "Hospital logos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'hospital-logos');

CREATE POLICY "Hospital admins can upload their hospital logo"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'hospital-logos' AND
  (
    has_role(auth.uid(), 'hospital_admin'::app_role) OR
    has_role(auth.uid(), 'global_admin'::app_role)
  )
);

CREATE POLICY "Hospital admins can update their hospital logo"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'hospital-logos' AND
  (
    has_role(auth.uid(), 'hospital_admin'::app_role) OR
    has_role(auth.uid(), 'global_admin'::app_role)
  )
);

CREATE POLICY "Hospital admins can delete their hospital logo"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'hospital-logos' AND
  (
    has_role(auth.uid(), 'hospital_admin'::app_role) OR
    has_role(auth.uid(), 'global_admin'::app_role)
  )
);