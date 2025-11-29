-- ===================================================================
-- Migration: Add hospital_id to role_permissions for multi-hospital support
-- ===================================================================

-- Step 1: Add hospital_id column (nullable for global defaults)
ALTER TABLE public.role_permissions 
ADD COLUMN IF NOT EXISTS hospital_id uuid REFERENCES public.hospitals(id) ON DELETE CASCADE;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_hospital_id 
ON public.role_permissions(hospital_id);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_code_hospital 
ON public.role_permissions(role_code, hospital_id);

-- Step 3: Update RLS policies
DROP POLICY IF EXISTS "Admins can view role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Global admins can manage role permissions" ON public.role_permissions;

-- Global admins can view and manage everything
CREATE POLICY "Global admins can manage all role permissions"
ON public.role_permissions
FOR ALL
USING (has_role(auth.uid(), 'global_admin'::app_role) OR has_role_by_code(auth.uid(), 'global_admin'))
WITH CHECK (has_role(auth.uid(), 'global_admin'::app_role) OR has_role_by_code(auth.uid(), 'global_admin'));

-- Hospital admins can view global defaults (hospital_id IS NULL) + their hospital overrides
CREATE POLICY "Hospital admins can view relevant permissions"
ON public.role_permissions
FOR SELECT
USING (
  (has_role(auth.uid(), 'hospital_admin'::app_role) OR has_role_by_code(auth.uid(), 'hospital_admin'))
  AND (
    hospital_id IS NULL  -- Global defaults
    OR hospital_id = get_user_hospital(auth.uid())  -- Their hospital overrides
  )
);

-- Hospital admins can only insert/update/delete their hospital's overrides
CREATE POLICY "Hospital admins can manage their hospital permissions"
ON public.role_permissions
FOR ALL
USING (
  (has_role(auth.uid(), 'hospital_admin'::app_role) OR has_role_by_code(auth.uid(), 'hospital_admin'))
  AND hospital_id = get_user_hospital(auth.uid())
)
WITH CHECK (
  (has_role(auth.uid(), 'hospital_admin'::app_role) OR has_role_by_code(auth.uid(), 'hospital_admin'))
  AND hospital_id = get_user_hospital(auth.uid())
);

-- Step 4: Update get_effective_permissions function with hospital override logic
CREATE OR REPLACE FUNCTION public.get_effective_permissions(_user_id uuid, _hospital_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(permission_key text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- 1) Base permissions from role_permissions with hospital override logic
  FOR _perm IN
    SELECT DISTINCT rp.permission_key, rp.hospital_id
    FROM public.user_custom_roles ucr
    JOIN public.role_permissions rp ON rp.role_code = ucr.role_code
    WHERE ucr.user_id = _user_id
      AND (_is_global_admin OR ucr.hospital_id = _hospital_id OR _hospital_id IS NULL)
      AND rp.allowed = true
      -- Hospital override logic: prefer hospital-specific over global
      AND (
        rp.hospital_id = _hospital_id  -- Hospital-specific permission
        OR (
          rp.hospital_id IS NULL  -- Global default
          AND NOT EXISTS (
            -- Check if there's a hospital-specific override
            SELECT 1 FROM public.role_permissions rp2
            WHERE rp2.role_code = rp.role_code
              AND rp2.permission_key = rp.permission_key
              AND rp2.hospital_id = _hospital_id
          )
        )
      )
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
        AND rp.hospital_id IS NULL  -- Old system uses global only
    LOOP
      IF NOT _perm.permission_key = ANY(_keys) THEN
        _keys := array_append(_keys, _perm.permission_key);
      END IF;
    END LOOP;
  END IF;

  -- 3) Apply global user overrides (no hospital_id)
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
$function$;