-- Create function to safely fetch effective permissions for a user without exposing role_permissions table
CREATE OR REPLACE FUNCTION public.get_effective_permissions(_user_id uuid)
RETURNS TABLE(permission_key text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _perm record;
  _keys text[] := ARRAY[]::text[];
BEGIN
  -- 1) Base permissions from NEW system (custom roles via role_code)
  FOR _perm IN
    SELECT DISTINCT rp.permission_key
    FROM public.user_custom_roles ucr
    JOIN public.role_permissions rp ON rp.role_code = ucr.role_code
    WHERE ucr.user_id = _user_id
      AND rp.allowed = true
  LOOP
    IF NOT _perm.permission_key = ANY(_keys) THEN
      _keys := array_append(_keys, _perm.permission_key);
    END IF;
  END LOOP;

  -- 2) Fallback: old system (app_role enum)
  FOR _perm IN
    SELECT DISTINCT rp.permission_key
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id
      AND rp.allowed = true
  LOOP
    IF NOT _perm.permission_key = ANY(_keys) THEN
      _keys := array_append(_keys, _perm.permission_key);
    END IF;
  END LOOP;

  -- 3) Apply global user overrides (no hospital_id)
  --    grant  -> ensure in list
  --    deny   -> ensure removed
  FOR _perm IN
    SELECT permission_key, effect
    FROM public.user_permissions
    WHERE user_id = _user_id
      AND hospital_id IS NULL
  LOOP
    IF _perm.effect = 'grant' THEN
      IF NOT _perm.permission_key = ANY(_keys) THEN
        _keys := array_append(_keys, _perm.permission_key);
      END IF;
    ELSIF _perm.effect = 'deny' THEN
      _keys := array_remove(_keys, _perm.permission_key);
    END IF;
  END LOOP;

  -- Return as table rows
  FOREACH _perm IN ARRAY _keys
  LOOP
    permission_key := _perm;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;