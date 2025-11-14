-- Create function to delete user (admin use only)
CREATE OR REPLACE FUNCTION public.delete_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if current user has permission (must be admin)
  IF NOT (
    public.has_role(auth.uid(), 'global_admin') OR 
    public.has_role(auth.uid(), 'hospital_admin')
  ) THEN
    RAISE EXCEPTION 'Permission denied: Only admins can delete users';
  END IF;

  -- Delete from auth.users (will cascade to other tables)
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;