-- Update has_role function to check both user_roles and user_custom_roles tables
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  ) OR EXISTS (
    SELECT 1 FROM public.user_custom_roles
    WHERE user_id = _user_id AND role_code = _role::text
  )
$$;

-- Create a helper function to check custom roles by code string
CREATE OR REPLACE FUNCTION public.has_role_by_code(_user_id uuid, _role_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = _role_code
  ) OR EXISTS (
    SELECT 1 FROM public.user_custom_roles
    WHERE user_id = _user_id AND role_code = _role_code
  )
$$;