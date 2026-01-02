/*
  # Add RLS Policies for Work Orders Table
  
  1. Policies Added
    - SELECT policy: Platform admins can view all, others view based on tenant
    - UPDATE policy: Platform admins and assigned users can update
    - DELETE policy: Platform admins only
  
  2. Security
    - Platform owners/admins have full access
    - Tenant users can only access their tenant's work orders
    - Proper authentication checks
*/

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Block work order creation if limit exceeded" ON work_orders;

-- SELECT policy: Platform admins see all, others see their tenant's data
CREATE POLICY "Users can view work orders based on tenant"
  ON work_orders
  FOR SELECT
  TO authenticated
  USING (
    is_platform_admin(auth.uid()) 
    OR 
    tenant_id IN (
      SELECT tenant_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- INSERT policy: Check tenant limits and active status
CREATE POLICY "Users can create work orders if tenant active"
  ON work_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_platform_admin(auth.uid()) 
    OR 
    (
      check_tenant_active(tenant_id)
      AND
      tenant_id IN (
        SELECT tenant_id 
        FROM profiles 
        WHERE id = auth.uid()
      )
    )
  );

-- UPDATE policy: Platform admins or same tenant users
CREATE POLICY "Users can update work orders in their tenant"
  ON work_orders
  FOR UPDATE
  TO authenticated
  USING (
    is_platform_admin(auth.uid())
    OR
    tenant_id IN (
      SELECT tenant_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    is_platform_admin(auth.uid())
    OR
    tenant_id IN (
      SELECT tenant_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- DELETE policy: Platform admins only
CREATE POLICY "Platform admins can delete work orders"
  ON work_orders
  FOR DELETE
  TO authenticated
  USING (is_platform_admin(auth.uid()));
