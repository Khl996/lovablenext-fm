-- Allow global admins to update any profile
CREATE POLICY "Global admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'global_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'global_admin'::app_role));

-- Allow hospital admins to update profiles in their hospital
CREATE POLICY "Hospital admins can update profiles in their hospital"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  hospital_id = get_user_hospital(auth.uid()) 
  AND has_role(auth.uid(), 'hospital_admin'::app_role)
)
WITH CHECK (
  hospital_id = get_user_hospital(auth.uid()) 
  AND has_role(auth.uid(), 'hospital_admin'::app_role)
);