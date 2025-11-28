-- Fix the function to avoid column name ambiguity
DROP FUNCTION IF EXISTS public.get_effective_permissions(uuid);

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
    SELECT up.permission_key as perm_key, up.effect
    FROM public.user_permissions up
    WHERE up.user_id = _user_id
      AND up.hospital_id IS NULL
  LOOP
    IF _perm.effect = 'grant' THEN
      IF NOT _perm.perm_key = ANY(_keys) THEN
        _keys := array_append(_keys, _perm.perm_key);
      END IF;
    ELSIF _perm.effect = 'deny' THEN
      _keys := array_remove(_keys, _perm.perm_key);
    END IF;
  END LOOP;

  -- Return as table rows
  FOR _perm IN 
    SELECT unnest(_keys) as pkey
  LOOP
    permission_key := _perm.pkey;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;