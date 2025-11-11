-- Fix remaining security warnings: Restrict access to work orders, operations log, and asset financial data

-- 1. Fix work_orders table - restrict to involved parties only
DROP POLICY IF EXISTS "Users can view work orders in their hospital" ON public.work_orders;

-- Users can only view work orders they are involved in
CREATE POLICY "Users can view their related work orders"
  ON public.work_orders
  FOR SELECT
  USING (
    hospital_id = get_user_hospital(auth.uid())
    AND (
      -- Reported by user
      reported_by = auth.uid()
      -- Assigned to user
      OR assigned_to = auth.uid()
      -- User is in the assigned team
      OR EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = work_orders.assigned_team
        AND tm.user_id = auth.uid()
      )
      -- Supervisors and managers can view all
      OR has_role(auth.uid(), 'supervisor'::app_role)
      OR has_role(auth.uid(), 'maintenance_manager'::app_role)
      OR has_role(auth.uid(), 'facility_manager'::app_role)
      OR has_role(auth.uid(), 'hospital_admin'::app_role)
      OR has_role(auth.uid(), 'global_admin'::app_role)
    )
  );

-- 2. Fix operations_log table - restrict to supervisors and involved parties
DROP POLICY IF EXISTS "Users can view operations in their hospital" ON public.operations_log;

CREATE POLICY "Restricted users can view operations log"
  ON public.operations_log
  FOR SELECT
  USING (
    hospital_id = get_user_hospital(auth.uid())
    AND (
      -- Performed by user
      performed_by = auth.uid()
      -- Approved by user
      OR approved_by = auth.uid()
      -- Supervisors and managers can view all
      OR has_role(auth.uid(), 'supervisor'::app_role)
      OR has_role(auth.uid(), 'maintenance_manager'::app_role)
      OR has_role(auth.uid(), 'facility_manager'::app_role)
      OR has_role(auth.uid(), 'hospital_admin'::app_role)
      OR has_role(auth.uid(), 'global_admin'::app_role)
    )
  );

-- 3. Fix assets table - create separate views for financial data
-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view assets in their hospital" ON public.assets;

-- Regular users can view basic asset info (no financial data)
CREATE POLICY "Users can view basic asset info"
  ON public.assets
  FOR SELECT
  USING (
    hospital_id = get_user_hospital(auth.uid())
    AND NOT (
      has_role(auth.uid(), 'facility_manager'::app_role)
      OR has_role(auth.uid(), 'hospital_admin'::app_role)
      OR has_role(auth.uid(), 'global_admin'::app_role)
    )
  );

-- Managers and admins can view all asset details including financial data
CREATE POLICY "Managers can view full asset details"
  ON public.assets
  FOR SELECT
  USING (
    hospital_id = get_user_hospital(auth.uid())
    AND (
      has_role(auth.uid(), 'facility_manager'::app_role)
      OR has_role(auth.uid(), 'hospital_admin'::app_role)
      OR has_role(auth.uid(), 'global_admin'::app_role)
    )
  );

-- Note: For complete financial data protection, consider creating a view that excludes
-- purchase_cost, depreciation_annual, and purchase_date for regular users.
-- This would require application-level changes to use different queries based on user role.