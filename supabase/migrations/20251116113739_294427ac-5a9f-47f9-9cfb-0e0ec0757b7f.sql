-- Fix RLS policies for teams and related tables to support custom roles properly

-- Fix teams table
DROP POLICY IF EXISTS "Managers can manage teams in their hospital" ON teams;
DROP POLICY IF EXISTS "Users can view teams in their hospital" ON teams;

CREATE POLICY "Managers can manage teams in their hospital"
ON teams
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
    has_role(auth.uid(), 'maintenance_manager'::app_role) OR
    has_role(auth.uid(), 'global_admin'::app_role) OR
    has_role_by_code(auth.uid(), 'hospital_admin') OR
    has_role_by_code(auth.uid(), 'facility_manager') OR
    has_role_by_code(auth.uid(), 'maintenance_manager') OR
    has_role_by_code(auth.uid(), 'global_admin')
  )
);

CREATE POLICY "Users can view teams in their hospital"
ON teams
FOR SELECT
USING (
  hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT hospital_id FROM user_custom_roles WHERE user_id = auth.uid()
  )
);

-- Fix specializations table
DROP POLICY IF EXISTS "Admins can manage specializations in their hospital" ON specializations;
DROP POLICY IF EXISTS "Users can view specializations in their hospital" ON specializations;

CREATE POLICY "Admins can manage specializations in their hospital"
ON specializations
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

CREATE POLICY "Users can view specializations in their hospital"
ON specializations
FOR SELECT
USING (
  hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT hospital_id FROM user_custom_roles WHERE user_id = auth.uid()
  )
);