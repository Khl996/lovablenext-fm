-- Add image_url column to assets table
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS image_url text;

-- Create asset-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('asset-images', 'asset-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for asset-images bucket

-- Allow users to view asset images in their hospital
CREATE POLICY "Users can view asset images in their hospital"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'asset-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM hospitals WHERE id = get_user_hospital(auth.uid())
  )
);

-- Allow authorized users to upload asset images
CREATE POLICY "Authorized users can upload asset images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'asset-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM hospitals WHERE id = get_user_hospital(auth.uid())
  )
  AND (
    has_permission_v2(auth.uid(), 'manage_assets', get_user_hospital(auth.uid()))
    OR has_role(auth.uid(), 'hospital_admin'::app_role)
    OR has_role(auth.uid(), 'facility_manager'::app_role)
  )
);

-- Allow authorized users to update asset images
CREATE POLICY "Authorized users can update asset images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'asset-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM hospitals WHERE id = get_user_hospital(auth.uid())
  )
  AND (
    has_permission_v2(auth.uid(), 'manage_assets', get_user_hospital(auth.uid()))
    OR has_role(auth.uid(), 'hospital_admin'::app_role)
    OR has_role(auth.uid(), 'facility_manager'::app_role)
  )
);

-- Allow authorized users to delete asset images
CREATE POLICY "Authorized users can delete asset images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'asset-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM hospitals WHERE id = get_user_hospital(auth.uid())
  )
  AND (
    has_permission_v2(auth.uid(), 'manage_assets', get_user_hospital(auth.uid()))
    OR has_role(auth.uid(), 'hospital_admin'::app_role)
    OR has_role(auth.uid(), 'facility_manager'::app_role)
  )
);