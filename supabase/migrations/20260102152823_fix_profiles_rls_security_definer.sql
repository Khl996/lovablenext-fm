/*
  # Fix infinite recursion in profiles RLS policies
  
  1. Problem
    - Functions is_super_admin() and is_platform_admin() read from profiles table
    - Policies on profiles table call these functions
    - This creates infinite recursion loop
  
  2. Solution
    - Recreate helper functions as SECURITY DEFINER to bypass RLS
    - Drop and recreate profiles policies
  
  3. Security
    - SECURITY DEFINER functions are safe as they only check user's own status
    - Policies remain restrictive
*/

-- Recreate functions as SECURITY DEFINER (this will replace existing)
CREATE OR REPLACE FUNCTION is_super_admin(check_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT p.is_super_admin
      FROM public.profiles p
      WHERE p.id = COALESCE(check_user_id, auth.uid())
      LIMIT 1
    ),
    false
  );
END;
$$;

CREATE OR REPLACE FUNCTION is_platform_admin(p_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = COALESCE(p_user_id, auth.uid())
    AND (
      is_super_admin = true 
      OR role IN ('platform_owner', 'platform_admin')
    )
  );
END;
$$;

-- Drop existing problematic policies on profiles
DROP POLICY IF EXISTS "Platform admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON profiles;

-- Recreate simplified policies (now safe with SECURITY DEFINER)
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Super admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Platform admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));