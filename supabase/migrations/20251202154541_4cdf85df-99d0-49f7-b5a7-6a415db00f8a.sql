-- Drop and recreate teams SELECT policy to allow global_admin access to all
DROP POLICY IF EXISTS "Users can view teams in their hospital" ON teams;

CREATE POLICY "Users can view teams in their hospital"
ON teams
FOR SELECT
USING (
  -- Global admins can view ALL teams
  has_role(auth.uid(), 'global_admin'::app_role) 
  OR has_role_by_code(auth.uid(), 'global_admin')
  OR
  -- Other users can view teams in their hospital
  (hospital_id IN (
    SELECT profiles.hospital_id FROM profiles WHERE profiles.id = auth.uid()
    UNION
    SELECT user_custom_roles.hospital_id FROM user_custom_roles WHERE user_custom_roles.user_id = auth.uid() AND user_custom_roles.hospital_id IS NOT NULL
  ))
);

-- Also update the ALL policy for managers to include global_admin properly
DROP POLICY IF EXISTS "Managers can manage teams in their hospital" ON teams;

CREATE POLICY "Managers can manage teams in their hospital"
ON teams
FOR ALL
USING (
  -- Global admins can manage ALL teams
  (has_role(auth.uid(), 'global_admin'::app_role) OR has_role_by_code(auth.uid(), 'global_admin'))
  OR
  -- Other managers in their hospital
  (
    (hospital_id IN (
      SELECT profiles.hospital_id FROM profiles WHERE profiles.id = auth.uid()
      UNION
      SELECT user_custom_roles.hospital_id FROM user_custom_roles WHERE user_custom_roles.user_id = auth.uid() AND user_custom_roles.hospital_id IS NOT NULL
    ))
    AND (
      has_role(auth.uid(), 'hospital_admin'::app_role) OR has_role(auth.uid(), 'facility_manager'::app_role) OR 
      has_role(auth.uid(), 'maintenance_manager'::app_role) OR
      has_role_by_code(auth.uid(), 'hospital_admin') OR has_role_by_code(auth.uid(), 'facility_manager') OR 
      has_role_by_code(auth.uid(), 'maintenance_manager')
    )
  )
);