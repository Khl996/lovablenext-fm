/*
  # Update Assets Table

  Adds all missing columns to align with Asset type in code
*/

-- Add missing columns to assets
DO $$
BEGIN
  -- Basic info columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'name_ar') THEN
    ALTER TABLE assets ADD COLUMN name_ar text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'subcategory') THEN
    ALTER TABLE assets ADD COLUMN subcategory text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'type') THEN
    ALTER TABLE assets ADD COLUMN type text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'criticality') THEN
    ALTER TABLE assets ADD COLUMN criticality text DEFAULT 'medium' CHECK (criticality IN ('low', 'medium', 'high', 'critical'));
  END IF;

  -- Technical specifications
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'model') THEN
    ALTER TABLE assets ADD COLUMN model text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'serial_number') THEN
    ALTER TABLE assets ADD COLUMN serial_number text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'manufacturer') THEN
    ALTER TABLE assets ADD COLUMN manufacturer text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'manufacture_year') THEN
    ALTER TABLE assets ADD COLUMN manufacture_year integer;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'specifications') THEN
    ALTER TABLE assets ADD COLUMN specifications jsonb DEFAULT '{}';
  END IF;

  -- Financial columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'installation_date') THEN
    ALTER TABLE assets ADD COLUMN installation_date date;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'purchase_date') THEN
    ALTER TABLE assets ADD COLUMN purchase_date date;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'purchase_cost') THEN
    ALTER TABLE assets ADD COLUMN purchase_cost numeric(15,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'depreciation_annual') THEN
    ALTER TABLE assets ADD COLUMN depreciation_annual numeric(15,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'expected_lifespan_years') THEN
    ALTER TABLE assets ADD COLUMN expected_lifespan_years integer;
  END IF;

  -- Warranty columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'warranty_provider') THEN
    ALTER TABLE assets ADD COLUMN warranty_provider text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'warranty_expiry') THEN
    ALTER TABLE assets ADD COLUMN warranty_expiry date;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'supplier') THEN
    ALTER TABLE assets ADD COLUMN supplier text;
  END IF;

  -- Location columns (using hospital structure)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'hospital_id') THEN
    ALTER TABLE assets ADD COLUMN hospital_id uuid REFERENCES hospitals(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'building_id') THEN
    ALTER TABLE assets ADD COLUMN building_id uuid REFERENCES buildings(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'floor_id') THEN
    ALTER TABLE assets ADD COLUMN floor_id uuid REFERENCES floors(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'department_id') THEN
    ALTER TABLE assets ADD COLUMN department_id uuid REFERENCES departments(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'room_id') THEN
    ALTER TABLE assets ADD COLUMN room_id uuid REFERENCES rooms(id);
  END IF;

  -- Hierarchy and positioning
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'parent_asset_id') THEN
    ALTER TABLE assets ADD COLUMN parent_asset_id uuid REFERENCES assets(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'coordinates_x') THEN
    ALTER TABLE assets ADD COLUMN coordinates_x decimal;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'coordinates_y') THEN
    ALTER TABLE assets ADD COLUMN coordinates_y decimal;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'qr_code') THEN
    ALTER TABLE assets ADD COLUMN qr_code text UNIQUE;
  END IF;
END $$;

-- Create additional indexes
CREATE INDEX IF NOT EXISTS idx_assets_hospital_id ON assets(hospital_id);
CREATE INDEX IF NOT EXISTS idx_assets_building_id ON assets(building_id);
CREATE INDEX IF NOT EXISTS idx_assets_floor_id ON assets(floor_id);
CREATE INDEX IF NOT EXISTS idx_assets_department_id ON assets(department_id);
CREATE INDEX IF NOT EXISTS idx_assets_room_id ON assets(room_id);
CREATE INDEX IF NOT EXISTS idx_assets_parent_asset_id ON assets(parent_asset_id);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_criticality ON assets(criticality);
CREATE INDEX IF NOT EXISTS idx_assets_serial_number ON assets(serial_number);
CREATE INDEX IF NOT EXISTS idx_assets_qr_code ON assets(qr_code);
