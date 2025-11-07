-- Fix RLS policy for buildings table to allow INSERT
-- Drop existing policy
DROP POLICY IF EXISTS "Managers can manage buildings in their hospital" ON public.buildings;

-- Create new policy with WITH CHECK for INSERT
CREATE POLICY "Managers can manage buildings in their hospital"
ON public.buildings
FOR ALL
USING (
  (hospital_id = get_user_hospital(auth.uid())) 
  AND (
    has_role(auth.uid(), 'hospital_admin'::app_role) 
    OR has_role(auth.uid(), 'facility_manager'::app_role)
  )
)
WITH CHECK (
  (hospital_id = get_user_hospital(auth.uid())) 
  AND (
    has_role(auth.uid(), 'hospital_admin'::app_role) 
    OR has_role(auth.uid(), 'facility_manager'::app_role)
  )
);