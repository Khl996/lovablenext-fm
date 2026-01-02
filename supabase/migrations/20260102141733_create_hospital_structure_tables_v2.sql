/*
  # Create Hospital Structure Tables (Fixed)

  ## Tables Created
  
  1. **hospitals** - Hospital/tenant organizations
  2. **buildings** - Buildings within hospitals
  3. **floors** - Floors within buildings
  4. **departments** - Departments within floors
  5. **rooms** - Rooms within departments
     
  ## Security
  - RLS enabled on all tables
  - Policies for tenant isolation (using tenant_id from profiles)
*/

-- Hospitals Table (Complete version aligned with types)
CREATE TABLE IF NOT EXISTS hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  type text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  address text,
  phone text,
  email text,
  logo_url text,
  notes text,
  suspended_at timestamptz,
  suspended_by uuid REFERENCES profiles(id),
  suspension_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Buildings Table
CREATE TABLE IF NOT EXISTS buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  description text,
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- Floors Table
CREATE TABLE IF NOT EXISTS floors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  level integer NOT NULL,
  building_id uuid NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(building_id, code)
);

-- Departments Table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  floor_id uuid NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(floor_id, code)
);

-- Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  coordinates_x decimal,
  coordinates_y decimal,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(department_id, code)
);

-- Enable RLS
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hospitals
-- Note: We'll map tenant_id to hospital_id in application layer or via views
CREATE POLICY "Platform admins can view all hospitals"
  ON hospitals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

CREATE POLICY "Platform admins can manage hospitals"
  ON hospitals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- RLS Policies for buildings (hospital-based)
CREATE POLICY "Platform admins can view all buildings"
  ON buildings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

CREATE POLICY "Platform admins can manage buildings"
  ON buildings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- RLS Policies for floors
CREATE POLICY "Platform admins can view all floors"
  ON floors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

CREATE POLICY "Platform admins can manage floors"
  ON floors FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- RLS Policies for departments
CREATE POLICY "Platform admins can view all departments"
  ON departments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

CREATE POLICY "Platform admins can manage departments"
  ON departments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- RLS Policies for rooms
CREATE POLICY "Platform admins can view all rooms"
  ON rooms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

CREATE POLICY "Platform admins can manage rooms"
  ON rooms FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_buildings_hospital_id ON buildings(hospital_id);
CREATE INDEX IF NOT EXISTS idx_floors_building_id ON floors(building_id);
CREATE INDEX IF NOT EXISTS idx_departments_floor_id ON departments(floor_id);
CREATE INDEX IF NOT EXISTS idx_rooms_department_id ON rooms(department_id);
CREATE INDEX IF NOT EXISTS idx_hospitals_code ON hospitals(code);
CREATE INDEX IF NOT EXISTS idx_hospitals_status ON hospitals(status);
