/*
  # Create Lookup Tables

  ## Tables Created
  
  1. **issue_types** - Work order issue types
  2. **priorities** - Priority levels with colors
  3. **work_order_statuses** - Custom WO statuses
  4. **asset_categories** - Asset categorization
  5. **companies** - Suppliers/vendors/contractors
  6. **contracts** - Service contracts
  7. **specializations** - Technician specializations
  8. **sla_templates** - Service level agreements
     
  ## Security
  - RLS enabled on all tables
*/

-- Issue Types Table
CREATE TABLE IF NOT EXISTS issue_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- Priorities Table
CREATE TABLE IF NOT EXISTS priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  level integer NOT NULL,
  color text,
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- Work Order Statuses Table
CREATE TABLE IF NOT EXISTS work_order_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  category text NOT NULL CHECK (category IN ('open', 'in_progress', 'pending', 'completed', 'cancelled')),
  color text,
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- Asset Categories Table
CREATE TABLE IF NOT EXISTS asset_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- Companies Table (Suppliers/Vendors/Contractors)
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  type text NOT NULL CHECK (type IN ('supplier', 'vendor', 'contractor', 'manufacturer', 'service_provider')),
  contact_person text,
  email text,
  phone text,
  address text,
  tax_number text,
  notes text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- Contracts Table
CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  type text NOT NULL CHECK (type IN ('maintenance', 'service', 'supply', 'warranty', 'lease')),
  company_id uuid REFERENCES companies(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  value numeric(15,2),
  payment_terms text,
  renewal_terms text,
  status text DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expired', 'cancelled', 'renewed')),
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- Specializations Table
CREATE TABLE IF NOT EXISTS specializations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- SLA Templates Table
CREATE TABLE IF NOT EXISTS sla_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  priority_id uuid REFERENCES priorities(id),
  response_time_hours integer NOT NULL,
  resolution_time_hours integer NOT NULL,
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- Enable RLS on all tables
ALTER TABLE issue_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Platform admins can manage all)
CREATE POLICY "Platform admins full access" ON issue_types FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

CREATE POLICY "Platform admins full access" ON priorities FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

CREATE POLICY "Platform admins full access" ON work_order_statuses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

CREATE POLICY "Platform admins full access" ON asset_categories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

CREATE POLICY "Platform admins full access" ON companies FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

CREATE POLICY "Platform admins full access" ON contracts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

CREATE POLICY "Platform admins full access" ON specializations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

CREATE POLICY "Platform admins full access" ON sla_templates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_issue_types_hospital_id ON issue_types(hospital_id);
CREATE INDEX IF NOT EXISTS idx_priorities_hospital_id ON priorities(hospital_id);
CREATE INDEX IF NOT EXISTS idx_work_order_statuses_hospital_id ON work_order_statuses(hospital_id);
CREATE INDEX IF NOT EXISTS idx_asset_categories_hospital_id ON asset_categories(hospital_id);
CREATE INDEX IF NOT EXISTS idx_companies_hospital_id ON companies(hospital_id);
CREATE INDEX IF NOT EXISTS idx_companies_type ON companies(type);
CREATE INDEX IF NOT EXISTS idx_contracts_hospital_id ON contracts(hospital_id);
CREATE INDEX IF NOT EXISTS idx_contracts_company_id ON contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_specializations_hospital_id ON specializations(hospital_id);
CREATE INDEX IF NOT EXISTS idx_sla_templates_hospital_id ON sla_templates(hospital_id);
