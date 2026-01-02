/*
  # Create Costs and Calibration Tables

  ## Tables Created
  
  1. **work_order_costs** - Cost tracking for work orders
  2. **calibration_records** - Asset calibration history
     
  ## Security
  - RLS enabled on all tables
*/

-- Work Order Costs Table
CREATE TABLE IF NOT EXISTS work_order_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  cost_type text NOT NULL CHECK (cost_type IN ('labor', 'parts', 'materials', 'external_service', 'transportation', 'other')),
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_cost numeric(15,2) NOT NULL,
  total_cost numeric(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  currency text DEFAULT 'SAR',
  vendor_id uuid REFERENCES companies(id),
  invoice_number text,
  invoice_date date,
  notes text,
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Calibration Records Table
CREATE TABLE IF NOT EXISTS calibration_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  calibration_date date NOT NULL,
  next_calibration_date date NOT NULL,
  performed_by text NOT NULL,
  company_id uuid REFERENCES companies(id),
  certificate_number text,
  standard_used text,
  results jsonb DEFAULT '{}',
  status text NOT NULL CHECK (status IN ('pass', 'fail', 'conditional_pass')),
  notes text,
  attachments text[],
  cost numeric(15,2),
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE work_order_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for work_order_costs
CREATE POLICY "Platform admins can view all costs"
  ON work_order_costs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

CREATE POLICY "Platform admins can manage costs"
  ON work_order_costs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- RLS Policies for calibration_records
CREATE POLICY "Platform admins can view all calibrations"
  ON calibration_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

CREATE POLICY "Platform admins can manage calibrations"
  ON calibration_records FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_work_order_costs_work_order_id ON work_order_costs(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_costs_hospital_id ON work_order_costs(hospital_id);
CREATE INDEX IF NOT EXISTS idx_work_order_costs_cost_type ON work_order_costs(cost_type);
CREATE INDEX IF NOT EXISTS idx_work_order_costs_vendor_id ON work_order_costs(vendor_id);

CREATE INDEX IF NOT EXISTS idx_calibration_records_asset_id ON calibration_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_calibration_records_hospital_id ON calibration_records(hospital_id);
CREATE INDEX IF NOT EXISTS idx_calibration_records_next_date ON calibration_records(next_calibration_date);
CREATE INDEX IF NOT EXISTS idx_calibration_records_status ON calibration_records(status);
CREATE INDEX IF NOT EXISTS idx_calibration_records_company_id ON calibration_records(company_id);
