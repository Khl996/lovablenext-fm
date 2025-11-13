-- Add logo_url column to hospitals table
ALTER TABLE public.hospitals
ADD COLUMN IF NOT EXISTS logo_url TEXT;