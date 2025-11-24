-- Add image_url column to inventory_items table
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for inventory images
INSERT INTO storage.buckets (id, name, public)
VALUES ('inventory-images', 'inventory-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for inventory images
CREATE POLICY "Users can view inventory images"
ON storage.objects FOR SELECT
USING (bucket_id = 'inventory-images');

CREATE POLICY "Authorized users can upload inventory images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'inventory-images' AND
  (SELECT hospital_id FROM profiles WHERE id = auth.uid()) IS NOT NULL
);

CREATE POLICY "Authorized users can update inventory images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'inventory-images')
WITH CHECK (bucket_id = 'inventory-images');

CREATE POLICY "Authorized users can delete inventory images"
ON storage.objects FOR DELETE
USING (bucket_id = 'inventory-images');