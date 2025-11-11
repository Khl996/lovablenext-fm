-- Drop existing policy
DROP POLICY IF EXISTS "Admins can manage roles in their hospital" ON public.user_roles;

-- Create updated policy with proper WITH CHECK
CREATE POLICY "Admins can manage roles in their hospital"
  ON public.user_roles
  FOR ALL
  USING (
    has_role(auth.uid(), 'global_admin'::app_role)
    OR (
      has_role(auth.uid(), 'hospital_admin'::app_role)
      AND (
        hospital_id IS NULL 
        OR hospital_id = get_user_hospital(auth.uid())
      )
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'global_admin'::app_role)
    OR (
      has_role(auth.uid(), 'hospital_admin'::app_role)
      AND (
        hospital_id IS NULL 
        OR hospital_id = get_user_hospital(auth.uid())
      )
    )
  );