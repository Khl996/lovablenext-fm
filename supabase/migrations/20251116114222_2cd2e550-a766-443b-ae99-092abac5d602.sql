-- Fix RLS policies for work_orders to support custom roles properly

-- Drop existing policies that need updating
DROP POLICY IF EXISTS "Admins can manage all work orders in their hospital" ON work_orders;
DROP POLICY IF EXISTS "Facility managers can manage all work orders in their hospital" ON work_orders;
DROP POLICY IF EXISTS "Maintenance managers can manage work orders" ON work_orders;

-- Create comprehensive policy for admins and managers
CREATE POLICY "Admins and managers can manage work orders in their hospital"
ON work_orders
FOR ALL
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
    has_role(auth.uid(), 'maintenance_manager'::app_role) OR
    has_role_by_code(auth.uid(), 'global_admin') OR
    has_role_by_code(auth.uid(), 'hospital_admin') OR
    has_role_by_code(auth.uid(), 'facility_manager') OR
    has_role_by_code(auth.uid(), 'maintenance_manager')
  )
);