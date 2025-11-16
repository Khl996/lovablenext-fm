-- Fix companies table RLS policies to support custom roles properly

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage companies in their hospital" ON companies;
DROP POLICY IF EXISTS "Users can view companies in their hospital" ON companies;

-- Create new policies that properly check both app_role and custom roles
CREATE POLICY "Admins can manage companies in their hospital"
ON companies
FOR ALL
USING (
  hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT hospital_id FROM user_custom_roles WHERE user_id = auth.uid()
  )
  AND (
    has_role(auth.uid(), 'hospital_admin'::app_role) OR
    has_role(auth.uid(), 'facility_manager'::app_role) OR
    has_role(auth.uid(), 'global_admin'::app_role) OR
    has_role_by_code(auth.uid(), 'hospital_admin') OR
    has_role_by_code(auth.uid(), 'facility_manager') OR
    has_role_by_code(auth.uid(), 'global_admin')
  )
);

CREATE POLICY "Users can view companies in their hospital"
ON companies
FOR SELECT
USING (
  hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT hospital_id FROM user_custom_roles WHERE user_id = auth.uid()
  )
);