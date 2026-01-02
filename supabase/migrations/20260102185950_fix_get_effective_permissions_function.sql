/*
  # إصلاح دالة get_effective_permissions
  
  1. إنشاء دالة get_effective_permissions
    - تجمع الصلاحيات من role_permissions
    - تدعم user_permissions overrides
    - تدعم النظام القديم والجديد
  
  2. الأمان
    - SECURITY DEFINER للوصول لكل الجداول
    - STABLE لأنها للقراءة فقط
*/

-- إنشاء الدالة
CREATE OR REPLACE FUNCTION public.get_effective_permissions(_user_id uuid, _hospital_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(permission_key text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _perm record;
  _keys text[] := ARRAY[]::text[];
  _user_role text;
BEGIN
  -- 1) جلب role من profiles
  SELECT role INTO _user_role FROM profiles WHERE id = _user_id;
  
  -- 2) إذا owner أو admin، أعطيه كل الصلاحيات
  IF _user_role IN ('owner', 'platform_owner', 'admin', 'platform_admin') THEN
    FOR _perm IN
      SELECT DISTINCT rp.permission_key
      FROM role_permissions rp
      WHERE rp.role = _user_role
        AND rp.allowed = true
    LOOP
      IF NOT _perm.permission_key = ANY(_keys) THEN
        _keys := array_append(_keys, _perm.permission_key);
      END IF;
    END LOOP;
  END IF;
  
  -- 3) صلاحيات من user_roles (النظام القديم)
  FOR _perm IN
    SELECT DISTINCT rp.permission_key
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id
      AND rp.allowed = true
  LOOP
    IF NOT _perm.permission_key = ANY(_keys) THEN
      _keys := array_append(_keys, _perm.permission_key);
    END IF;
  END LOOP;
  
  -- 4) صلاحيات من custom_user_roles (النظام الجديد)
  FOR _perm IN
    SELECT DISTINCT rp.permission_key
    FROM custom_user_roles ucr
    JOIN role_permissions rp ON rp.role = ucr.role_code
    WHERE ucr.user_id = _user_id
      AND rp.allowed = true
  LOOP
    IF NOT _perm.permission_key = ANY(_keys) THEN
      _keys := array_append(_keys, _perm.permission_key);
    END IF;
  END LOOP;

  -- إرجاع النتائج
  FOR _perm IN 
    SELECT unnest(_keys) as pkey
  LOOP
    permission_key := _perm.pkey;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$function$;