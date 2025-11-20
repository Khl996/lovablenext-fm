-- Create inventory management tables

-- Inventory categories table
CREATE TABLE IF NOT EXISTS public.inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  parent_category_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- Inventory items table
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  unit_of_measure TEXT NOT NULL, -- e.g., 'piece', 'meter', 'liter', 'kg'
  unit_of_measure_ar TEXT NOT NULL,
  current_quantity NUMERIC DEFAULT 0 NOT NULL,
  min_quantity NUMERIC DEFAULT 0, -- Reorder point
  max_quantity NUMERIC, -- Maximum stock level
  unit_cost NUMERIC,
  location TEXT, -- Storage location
  location_ar TEXT,
  supplier TEXT,
  supplier_contact TEXT,
  barcode TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  last_restocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- Inventory transactions table (for tracking stock movements)
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL, -- 'in', 'out', 'adjustment', 'transfer'
  quantity NUMERIC NOT NULL,
  unit_cost NUMERIC,
  total_cost NUMERIC GENERATED ALWAYS AS (quantity * COALESCE(unit_cost, 0)) STORED,
  reference_type TEXT, -- 'work_order', 'purchase_order', 'manual'
  reference_id UUID, -- ID of work order, purchase order, etc.
  from_location TEXT,
  to_location TEXT,
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add inventory permissions
INSERT INTO public.permissions (key, name, name_ar, category, description) VALUES
  ('inventory.view', 'View Inventory', 'عرض المخزون', 'inventory', 'View inventory items and stock levels'),
  ('inventory.manage', 'Manage Inventory', 'إدارة المخزون', 'inventory', 'Create, update, and delete inventory items'),
  ('inventory.transactions', 'Manage Inventory Transactions', 'إدارة حركات المخزون', 'inventory', 'Record stock in/out and adjustments'),
  ('inventory.reports', 'View Inventory Reports', 'عرض تقارير المخزون', 'inventory', 'Access inventory reports and analytics')
ON CONFLICT (key) DO NOTHING;

-- Grant inventory permissions to appropriate roles
INSERT INTO public.role_permissions (role_code, permission_key, allowed)
SELECT role_code, permission_key, true
FROM (
  VALUES 
    ('global_admin', 'inventory.view'),
    ('global_admin', 'inventory.manage'),
    ('global_admin', 'inventory.transactions'),
    ('global_admin', 'inventory.reports'),
    ('hospital_admin', 'inventory.view'),
    ('hospital_admin', 'inventory.manage'),
    ('hospital_admin', 'inventory.transactions'),
    ('hospital_admin', 'inventory.reports'),
    ('facility_manager', 'inventory.view'),
    ('facility_manager', 'inventory.manage'),
    ('facility_manager', 'inventory.transactions'),
    ('facility_manager', 'inventory.reports'),
    ('maintenance_manager', 'inventory.view'),
    ('maintenance_manager', 'inventory.transactions'),
    ('maintenance_manager', 'inventory.reports'),
    ('supervisor', 'inventory.view'),
    ('supervisor', 'inventory.transactions'),
    ('technician', 'inventory.view')
) AS perms(role_code, permission_key)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory_categories
CREATE POLICY "Users can view categories in their hospital"
  ON public.inventory_categories FOR SELECT
  USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT hospital_id FROM user_custom_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage categories in their hospital"
  ON public.inventory_categories FOR ALL
  USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT hospital_id FROM user_custom_roles WHERE user_id = auth.uid()
    )
    AND (
      has_role(auth.uid(), 'global_admin'::app_role) OR
      has_role(auth.uid(), 'hospital_admin'::app_role) OR
      has_role(auth.uid(), 'facility_manager'::app_role) OR
      has_role_by_code(auth.uid(), 'global_admin') OR
      has_role_by_code(auth.uid(), 'hospital_admin') OR
      has_role_by_code(auth.uid(), 'facility_manager')
    )
  );

-- RLS Policies for inventory_items
CREATE POLICY "Users can view items in their hospital"
  ON public.inventory_items FOR SELECT
  USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT hospital_id FROM user_custom_roles WHERE user_id = auth.uid()
    )
    AND has_permission_v2(auth.uid(), 'inventory.view', hospital_id)
  );

CREATE POLICY "Admins can manage items in their hospital"
  ON public.inventory_items FOR ALL
  USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT hospital_id FROM user_custom_roles WHERE user_id = auth.uid()
    )
    AND has_permission_v2(auth.uid(), 'inventory.manage', hospital_id)
  );

-- RLS Policies for inventory_transactions
CREATE POLICY "Users can view transactions in their hospital"
  ON public.inventory_transactions FOR SELECT
  USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT hospital_id FROM user_custom_roles WHERE user_id = auth.uid()
    )
    AND has_permission_v2(auth.uid(), 'inventory.view', hospital_id)
  );

CREATE POLICY "Authorized users can create transactions"
  ON public.inventory_transactions FOR INSERT
  WITH CHECK (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT hospital_id FROM user_custom_roles WHERE user_id = auth.uid()
    )
    AND has_permission_v2(auth.uid(), 'inventory.transactions', hospital_id)
    AND performed_by = auth.uid()
  );

-- Create indexes for better performance
CREATE INDEX idx_inventory_items_hospital ON public.inventory_items(hospital_id);
CREATE INDEX idx_inventory_items_category ON public.inventory_items(category_id);
CREATE INDEX idx_inventory_items_code ON public.inventory_items(hospital_id, code);
CREATE INDEX idx_inventory_transactions_item ON public.inventory_transactions(item_id);
CREATE INDEX idx_inventory_transactions_hospital ON public.inventory_transactions(hospital_id);
CREATE INDEX idx_inventory_transactions_created ON public.inventory_transactions(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_inventory_categories_updated_at
  BEFORE UPDATE ON public.inventory_categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to update item quantity after transaction
CREATE OR REPLACE FUNCTION public.update_inventory_quantity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_type = 'in' OR NEW.transaction_type = 'adjustment' THEN
    UPDATE public.inventory_items
    SET 
      current_quantity = current_quantity + NEW.quantity,
      last_restocked_at = CASE WHEN NEW.transaction_type = 'in' THEN now() ELSE last_restocked_at END,
      updated_at = now()
    WHERE id = NEW.item_id;
  ELSIF NEW.transaction_type = 'out' THEN
    UPDATE public.inventory_items
    SET 
      current_quantity = current_quantity - NEW.quantity,
      updated_at = now()
    WHERE id = NEW.item_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to automatically update quantity
CREATE TRIGGER update_quantity_after_transaction
  AFTER INSERT ON public.inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inventory_quantity();