-- Fix RLS policies for issue_type_team_mapping to support custom roles properly

DROP POLICY IF EXISTS "Admins can manage issue type mappings in their hospital" ON issue_type_team_mapping;
DROP POLICY IF EXISTS "Users can view issue type mappings in their hospital" ON issue_type_team_mapping;

CREATE POLICY "Admins can manage issue type mappings in their hospital"
ON issue_type_team_mapping
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

CREATE POLICY "Users can view issue type mappings in their hospital"
ON issue_type_team_mapping
FOR SELECT
USING (
  hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT hospital_id FROM user_custom_roles WHERE user_id = auth.uid()
  )
);