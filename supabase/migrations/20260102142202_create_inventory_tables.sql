/*
  # Create Inventory Management Tables

  ## Tables Created
  
  1. **inventory_items** - Spare parts and consumables
  2. **inventory_transactions** - Stock movements and history
     
  ## Security
  - RLS enabled on all tables
*/

-- Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  category text NOT NULL CHECK (category IN ('spare_part', 'consumable', 'tool', 'material', 'chemical', 'equipment')),
  subcategory text,
  unit_of_measure text NOT NULL CHECK (unit_of_measure IN ('piece', 'liter', 'kg', 'meter', 'box', 'set', 'roll', 'bottle')),
  current_stock integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 0,
  max_stock integer,
  reorder_point integer,
  unit_cost numeric(15,2),
  total_value numeric(15,2) GENERATED ALWAYS AS (current_stock * unit_cost) STORED,
  supplier_id uuid REFERENCES companies(id),
  location text,
  barcode text UNIQUE,
  description text,
  specifications jsonb DEFAULT '{}',
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- Inventory Transactions Table
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('purchase', 'usage', 'transfer', 'adjustment', 'return', 'disposal')),
  quantity integer NOT NULL,
  unit_cost numeric(15,2),
  total_cost numeric(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  transaction_date timestamptz NOT NULL DEFAULT now(),
  reference_type text CHECK (reference_type IN ('work_order', 'maintenance_task', 'manual', 'auto_reorder')),
  reference_id uuid,
  from_location text,
  to_location text,
  performed_by uuid NOT NULL REFERENCES profiles(id),
  notes text,
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory_items
CREATE POLICY "Platform admins can view all items"
  ON inventory_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

CREATE POLICY "Platform admins can manage items"
  ON inventory_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- RLS Policies for inventory_transactions
CREATE POLICY "Platform admins can view all transactions"
  ON inventory_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

CREATE POLICY "Platform admins can manage transactions"
  ON inventory_transactions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

CREATE POLICY "Users can view their own transactions"
  ON inventory_transactions FOR SELECT
  TO authenticated
  USING (performed_by = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_hospital_id ON inventory_items(hospital_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_supplier_id ON inventory_items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_barcode ON inventory_items(barcode);
CREATE INDEX IF NOT EXISTS idx_inventory_items_low_stock ON inventory_items(current_stock) WHERE current_stock <= min_stock;

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id ON inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_hospital_id ON inventory_transactions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_performed_by ON inventory_transactions(performed_by);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON inventory_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(type);
