-- Drop existing policy and recreate it with proper WITH CHECK expression
DROP POLICY IF EXISTS "Managers can manage team members in their hospital" ON public.team_members;

-- Create new policy with both USING and WITH CHECK expressions
CREATE POLICY "Managers can manage team members in their hospital"
ON public.team_members
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM teams
    WHERE teams.id = team_members.team_id
      AND teams.hospital_id = get_user_hospital(auth.uid())
      AND (
        has_role(auth.uid(), 'hospital_admin'::app_role) 
        OR has_role(auth.uid(), 'maintenance_manager'::app_role)
        OR has_role(auth.uid(), 'facility_manager'::app_role)
        OR has_role(auth.uid(), 'global_admin'::app_role)
        OR has_role_by_code(auth.uid(), 'hospital_admin')
        OR has_role_by_code(auth.uid(), 'maintenance_manager')
        OR has_role_by_code(auth.uid(), 'facility_manager')
        OR has_role_by_code(auth.uid(), 'global_admin')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM teams
    WHERE teams.id = team_members.team_id
      AND teams.hospital_id = get_user_hospital(auth.uid())
      AND (
        has_role(auth.uid(), 'hospital_admin'::app_role) 
        OR has_role(auth.uid(), 'maintenance_manager'::app_role)
        OR has_role(auth.uid(), 'facility_manager'::app_role)
        OR has_role(auth.uid(), 'global_admin'::app_role)
        OR has_role_by_code(auth.uid(), 'hospital_admin')
        OR has_role_by_code(auth.uid(), 'maintenance_manager')
        OR has_role_by_code(auth.uid(), 'facility_manager')
        OR has_role_by_code(auth.uid(), 'global_admin')
      )
  )
);