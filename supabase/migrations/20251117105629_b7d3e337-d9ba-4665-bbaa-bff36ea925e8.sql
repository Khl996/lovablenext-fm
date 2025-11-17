-- Replace the function without dropping it
CREATE OR REPLACE FUNCTION public.get_user_hospital(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- First try to get from profiles, fallback to user_custom_roles
  SELECT COALESCE(
    (SELECT hospital_id FROM public.profiles WHERE id = _user_id LIMIT 1),
    (SELECT hospital_id FROM public.user_custom_roles WHERE user_id = _user_id LIMIT 1)
  )
$$;