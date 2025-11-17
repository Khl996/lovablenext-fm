-- Drop existing policies
DROP POLICY IF EXISTS "Managers can manage team members in their hospital" ON public.team_members;
DROP POLICY IF EXISTS "Users can view team members in their hospital" ON public.team_members;

-- Create simplified policy for viewing
CREATE POLICY "Users can view team members in their hospital"
ON public.team_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_members.team_id
      AND teams.hospital_id = get_user_hospital(auth.uid())
  )
);

-- Create policy for inserting
CREATE POLICY "Managers can insert team members"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_members.team_id
      AND teams.hospital_id = get_user_hospital(auth.uid())
  )
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
);

-- Create policy for updating
CREATE POLICY "Managers can update team members"
ON public.team_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_members.team_id
      AND teams.hospital_id = get_user_hospital(auth.uid())
  )
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
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_members.team_id
      AND teams.hospital_id = get_user_hospital(auth.uid())
  )
);

-- Create policy for deleting
CREATE POLICY "Managers can delete team members"
ON public.team_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_members.team_id
      AND teams.hospital_id = get_user_hospital(auth.uid())
  )
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
);