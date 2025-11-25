-- CRITICAL SECURITY: Restrict access to system metadata tables
-- Drop overly permissive policies and create admin-only policies

-- ============================================
-- 1. Secure system_roles table
-- ============================================
-- Drop any existing policies (including the one that already exists)
DROP POLICY IF EXISTS "Anyone can view system roles" ON public.system_roles;
DROP POLICY IF EXISTS "Public can view system roles" ON public.system_roles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.system_roles;
DROP POLICY IF EXISTS "Authenticated users can view system roles" ON public.system_roles;

-- Create new restrictive policy: authenticated users only
CREATE POLICY "Authenticated users can view system roles"
  ON public.system_roles
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- 2. Secure permissions table
-- ============================================
-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view permissions" ON public.permissions;
DROP POLICY IF EXISTS "Users can view permissions" ON public.permissions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.permissions;

-- Create new admin-only policy
CREATE POLICY "Admins can view permissions"
  ON public.permissions
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'global_admin'::app_role) OR 
    has_role(auth.uid(), 'hospital_admin'::app_role)
  );

-- ============================================
-- 3. Secure role_permissions table
-- ============================================
-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Users can view role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.role_permissions;

-- Create new admin-only policy
CREATE POLICY "Admins can view role permissions"
  ON public.role_permissions
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'global_admin'::app_role) OR 
    has_role(auth.uid(), 'hospital_admin'::app_role)
  );

-- Verify RLS is enabled on all three tables
ALTER TABLE public.system_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;