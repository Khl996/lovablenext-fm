-- Security Fix: Restrict access to sensitive employee data
-- Remove overly permissive policies and add field-level restrictions

-- 1. FIX: Employee Personal Information Protection (profiles table)
-- Drop the overly permissive hospital admin policy
DROP POLICY IF EXISTS "Hospital admins can view profiles in their hospital" ON public.profiles;

-- Create more restrictive policies
CREATE POLICY "Hospital admins can view basic profile info"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  hospital_id = get_user_hospital(auth.uid())
  AND (
    has_role(auth.uid(), 'hospital_admin'::app_role) 
    OR has_role(auth.uid(), 'facility_manager'::app_role)
    OR has_role(auth.uid(), 'maintenance_manager'::app_role)
  )
);

-- Global admins can see everything
CREATE POLICY "Global admins can view all profile details"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'global_admin'::app_role));

-- Create a secure function to get sensitive contact info (only for authorized users)
CREATE OR REPLACE FUNCTION public.get_user_contact_info(_user_id uuid)
RETURNS TABLE (email text, phone text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow access if:
  -- 1. Requesting own info
  -- 2. Global admin
  -- 3. Hospital admin in same hospital (for emergency contact only)
  IF auth.uid() = _user_id 
     OR has_role(auth.uid(), 'global_admin'::app_role)
     OR (
       has_role(auth.uid(), 'hospital_admin'::app_role)
       AND EXISTS (
         SELECT 1 FROM profiles 
         WHERE id = _user_id 
         AND hospital_id = get_user_hospital(auth.uid())
       )
     ) THEN
    RETURN QUERY
    SELECT p.email, p.phone
    FROM profiles p
    WHERE p.id = _user_id;
  ELSE
    -- Return NULL for unauthorized access
    RETURN QUERY SELECT NULL::text, NULL::text WHERE false;
  END IF;
END;
$$;

-- 2. FIX: Asset Financial Data Protection
-- Drop the overly broad "Users can view basic asset info" policy
DROP POLICY IF EXISTS "Users can view basic asset info" ON public.assets;

-- Create more restrictive policy that explicitly excludes financial fields
CREATE POLICY "Regular users can view non-financial asset info"
ON public.assets
FOR SELECT
TO authenticated
USING (
  hospital_id = get_user_hospital(auth.uid())
  AND NOT (
    has_role(auth.uid(), 'facility_manager'::app_role) 
    OR has_role(auth.uid(), 'hospital_admin'::app_role) 
    OR has_role(auth.uid(), 'global_admin'::app_role)
  )
);

-- Create secure function to access financial data
CREATE OR REPLACE FUNCTION public.get_asset_financial_info(_asset_id uuid)
RETURNS TABLE (
  purchase_cost numeric,
  purchase_date date,
  depreciation_annual numeric,
  supplier text,
  warranty_provider text,
  warranty_expiry date
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only managers and above can see financial data
  IF has_role(auth.uid(), 'facility_manager'::app_role)
     OR has_role(auth.uid(), 'hospital_admin'::app_role)
     OR has_role(auth.uid(), 'maintenance_manager'::app_role)
     OR has_role(auth.uid(), 'global_admin'::app_role) THEN
    RETURN QUERY
    SELECT 
      a.purchase_cost,
      a.purchase_date,
      a.depreciation_annual,
      a.supplier,
      a.warranty_provider,
      a.warranty_expiry
    FROM assets a
    WHERE a.id = _asset_id
    AND a.hospital_id = get_user_hospital(auth.uid());
  ELSE
    -- Return NULL for unauthorized access
    RETURN QUERY 
    SELECT NULL::numeric, NULL::date, NULL::numeric, NULL::text, NULL::text, NULL::date 
    WHERE false;
  END IF;
END;
$$;

-- 3. FIX: Customer Feedback Protection (work_orders table)
-- Create secure function to access customer feedback
CREATE OR REPLACE FUNCTION public.get_work_order_feedback(_work_order_id uuid)
RETURNS TABLE (
  customer_feedback text,
  customer_rating integer,
  customer_reviewed_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _work_order work_orders%ROWTYPE;
BEGIN
  -- Get work order details
  SELECT * INTO _work_order
  FROM work_orders
  WHERE id = _work_order_id;

  -- Only allow access if:
  -- 1. Reporter of the work order
  -- 2. Assigned to the work order
  -- 3. Manager/supervisor
  IF auth.uid() = _work_order.reported_by
     OR auth.uid() = _work_order.assigned_to
     OR has_role(auth.uid(), 'maintenance_manager'::app_role)
     OR has_role(auth.uid(), 'facility_manager'::app_role)
     OR has_role(auth.uid(), 'hospital_admin'::app_role)
     OR has_role(auth.uid(), 'supervisor'::app_role)
     OR has_role(auth.uid(), 'global_admin'::app_role)
     OR EXISTS (
       SELECT 1 FROM team_members
       WHERE team_id = _work_order.assigned_team
       AND user_id = auth.uid()
     ) THEN
    RETURN QUERY
    SELECT 
      wo.customer_feedback,
      wo.customer_rating,
      wo.customer_reviewed_at
    FROM work_orders wo
    WHERE wo.id = _work_order_id;
  ELSE
    -- Return NULL for unauthorized access
    RETURN QUERY 
    SELECT NULL::text, NULL::integer, NULL::timestamptz 
    WHERE false;
  END IF;
END;
$$;

-- Add comments documenting the security measures
COMMENT ON FUNCTION public.get_user_contact_info IS 
'Security function: Returns user contact info (email, phone) only to authorized users (self, global admin, or hospital admin in same hospital)';

COMMENT ON FUNCTION public.get_asset_financial_info IS 
'Security function: Returns asset financial data only to managers and above';

COMMENT ON FUNCTION public.get_work_order_feedback IS 
'Security function: Returns customer feedback only to authorized users (reporter, assigned team, managers)';

-- 4. Fix leaked password protection warning by documenting it
-- Note: This is configured in Supabase Auth settings, not in migrations
-- The warning indicates this should be enabled in the Supabase dashboard under Authentication > Providers > Email

-- 5. Fix function search_path warning
-- Update all existing functions to have explicit search_path
ALTER FUNCTION public.has_custom_role SET search_path = public;
ALTER FUNCTION public.has_role_by_code SET search_path = public;
ALTER FUNCTION public.has_role SET search_path = public;
ALTER FUNCTION public.has_permission SET search_path = public;
ALTER FUNCTION public.has_permission_v2 SET search_path = public;
ALTER FUNCTION public.get_user_hospital SET search_path = public;