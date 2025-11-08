-- Add parent_asset_id column to assets table for hierarchical relationships
ALTER TABLE public.assets 
ADD COLUMN parent_asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL;

-- Add index for better query performance on parent relationships
CREATE INDEX idx_assets_parent_asset_id ON public.assets(parent_asset_id);

-- Add comment for documentation
COMMENT ON COLUMN public.assets.parent_asset_id IS 'References parent asset for hierarchical structure (e.g., Chiller -> Compressor -> Sensor)';