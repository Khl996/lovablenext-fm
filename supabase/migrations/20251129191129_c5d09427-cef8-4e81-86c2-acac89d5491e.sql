-- Update get_effective_permissions to support hospital-specific permissions
-- Global admins get all permissions regardless of hospital
DROP FUNCTION IF EXISTS public.get_effective_permissions(uuid);

CREATE OR REPLACE FUNCTION public.get_effective_permissions(
  _user_id uuid,
  _hospital_id uuid DEFAULT NULL
)
RETURNS TABLE(permission_key text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _perm record;
  _keys text[] := ARRAY[]::text[];
  _is_global_admin boolean := false;
BEGIN
  -- Check if user is global_admin (gets all permissions regardless of hospital)
  SELECT EXISTS (
    SELECT 1 FROM public.user_custom_roles
    WHERE user_id = _user_id 
    AND role_code = 'global_admin'
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND role = 'global_admin'
  ) INTO _is_global_admin;

  -- 1) Base permissions from NEW system (custom roles via role_code)
  FOR _perm IN
    SELECT DISTINCT rp.permission_key
    FROM public.user_custom_roles ucr
    JOIN public.role_permissions rp ON rp.role_code = ucr.role_code
    WHERE ucr.user_id = _user_id
      -- Global admins bypass hospital filter
      AND (_is_global_admin OR ucr.hospital_id = _hospital_id OR _hospital_id IS NULL)
      AND rp.allowed = true
  LOOP
    IF NOT _perm.permission_key = ANY(_keys) THEN
      _keys := array_append(_keys, _perm.permission_key);
    END IF;
  END LOOP;

  -- 2) Fallback: old system (app_role enum) - only if not using hospital filter
  IF _is_global_admin OR _hospital_id IS NULL THEN
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
  END IF;

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

  -- 4) Apply hospital-specific user overrides if hospital_id provided
  IF _hospital_id IS NOT NULL THEN
    FOR _perm IN
      SELECT up.permission_key as perm_key, up.effect
      FROM public.user_permissions up
      WHERE up.user_id = _user_id
        AND up.hospital_id = _hospital_id
    LOOP
      IF _perm.effect = 'grant' THEN
        IF NOT _perm.perm_key = ANY(_keys) THEN
          _keys := array_append(_keys, _perm.perm_key);
        END IF;
      ELSIF _perm.effect = 'deny' THEN
        _keys := array_remove(_keys, _perm.perm_key);
      END IF;
    END LOOP;
  END IF;

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