-- Create storage bucket for work order attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('work-order-attachments', 'work-order-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for work-order-attachments bucket
CREATE POLICY "Anyone can view work order attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'work-order-attachments');

CREATE POLICY "Authenticated users can upload work order attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'work-order-attachments' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own work order attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'work-order-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own work order attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'work-order-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);