-- Drop old policies
DROP POLICY IF EXISTS "Managers can manage maintenance plans in their hospital" ON maintenance_plans;
DROP POLICY IF EXISTS "Users can view maintenance plans in their hospital" ON maintenance_plans;

-- Create new policies that support both old and new role systems
CREATE POLICY "Managers can manage maintenance plans in their hospital"
ON maintenance_plans
FOR ALL
USING (
  hospital_id = get_user_hospital(auth.uid()) AND (
    has_role(auth.uid(), 'hospital_admin'::app_role) OR 
    has_role(auth.uid(), 'facility_manager'::app_role) OR 
    has_role(auth.uid(), 'maintenance_manager'::app_role) OR
    has_role_by_code(auth.uid(), 'hospital_admin'::text) OR
    has_role_by_code(auth.uid(), 'facility_manager'::text) OR
    has_role_by_code(auth.uid(), 'maintenance_manager'::text) OR
    has_role_by_code(auth.uid(), 'eng'::text) OR
    has_role_by_code(auth.uid(), 'engineer'::text)
  )
);

CREATE POLICY "Users can view maintenance plans in their hospital"
ON maintenance_plans
FOR SELECT
USING (hospital_id = get_user_hospital(auth.uid()));