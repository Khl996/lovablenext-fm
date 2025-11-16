-- Add code column to hospitals table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'hospitals' 
    AND column_name = 'code'
  ) THEN
    ALTER TABLE public.hospitals ADD COLUMN code text;
  END IF;
END $$;

-- Update existing hospitals without codes using a CTE
WITH numbered_hospitals AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM public.hospitals
  WHERE code IS NULL
)
UPDATE public.hospitals h
SET code = 'HOS' || LPAD(nh.rn::text, 3, '0')
FROM numbered_hospitals nh
WHERE h.id = nh.id;

-- Add unique constraint and make NOT NULL
ALTER TABLE public.hospitals ALTER COLUMN code SET NOT NULL;
ALTER TABLE public.hospitals ADD CONSTRAINT hospitals_code_unique UNIQUE (code);

-- Add category_code column to lookup_asset_categories
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lookup_asset_categories' 
    AND column_name = 'category_code'
  ) THEN
    ALTER TABLE public.lookup_asset_categories ADD COLUMN category_code text;
  END IF;
END $$;

-- Set default category codes for common categories
UPDATE public.lookup_asset_categories
SET category_code = CASE 
  WHEN LOWER(code) LIKE '%mechanical%' OR LOWER(name) LIKE '%ميكانيك%' THEN 'MEC'
  WHEN LOWER(code) LIKE '%electrical%' OR LOWER(name) LIKE '%كهرب%' THEN 'ELE'
  WHEN LOWER(code) LIKE '%medical%' OR LOWER(name) LIKE '%طب%' THEN 'MED'
  WHEN LOWER(code) LIKE '%hvac%' OR LOWER(name) LIKE '%تكييف%' OR LOWER(name) LIKE '%تهوية%' THEN 'HVAC'
  WHEN LOWER(code) LIKE '%plumbing%' OR LOWER(name) LIKE '%سباك%' THEN 'PLM'
  WHEN LOWER(code) LIKE '%safety%' OR LOWER(name) LIKE '%سلامة%' THEN 'SAF'
  ELSE UPPER(SUBSTRING(code, 1, 3))
END
WHERE category_code IS NULL;