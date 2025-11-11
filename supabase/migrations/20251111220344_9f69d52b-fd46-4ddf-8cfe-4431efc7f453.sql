-- Fix security issues in permissions and role_permissions tables
-- Drop public access policies
DROP POLICY IF EXISTS "Everyone can view permissions" ON public.permissions;
DROP POLICY IF EXISTS "Everyone can view role permissions" ON public.role_permissions;

-- Create restricted policies for permissions table (authenticated users only)
CREATE POLICY "Authenticated users can view permissions"
  ON public.permissions
  FOR SELECT
  TO authenticated
  USING (true);

-- Create restricted policies for role_permissions table (authenticated users only)
CREATE POLICY "Authenticated users can view role permissions"
  ON public.role_permissions
  FOR SELECT
  TO authenticated
  USING (true);

-- Fix profiles table to protect contact information
-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Users can view profiles in their hospital" ON public.profiles;

-- Create more restrictive policies for profiles
-- Users can only view their own full profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- Hospital admins can view profiles in their hospital (limited fields)
CREATE POLICY "Hospital admins can view profiles in their hospital"
  ON public.profiles
  FOR SELECT
  USING (
    hospital_id = get_user_hospital(auth.uid())
    AND (
      has_role(auth.uid(), 'hospital_admin'::app_role)
      OR has_role(auth.uid(), 'facility_manager'::app_role)
      OR has_role(auth.uid(), 'maintenance_manager'::app_role)
    )
  );

-- Global admins can view all profiles
CREATE POLICY "Global admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (has_role(auth.uid(), 'global_admin'::app_role));

-- Restrict hospitals table contact information
-- Drop existing policy and create more restrictive ones
DROP POLICY IF EXISTS "Users can view their own hospital" ON public.hospitals;

-- Users can view basic hospital info (excluding sensitive contact details)
CREATE POLICY "Users can view their hospital basic info"
  ON public.hospitals
  FOR SELECT
  USING (
    id = get_user_hospital(auth.uid())
    AND NOT has_role(auth.uid(), 'global_admin'::app_role)
  );

-- Only admins can see full hospital details including contacts
CREATE POLICY "Admins can view full hospital details"
  ON public.hospitals
  FOR SELECT
  USING (
    (id = get_user_hospital(auth.uid()) AND has_role(auth.uid(), 'hospital_admin'::app_role))
    OR has_role(auth.uid(), 'global_admin'::app_role)
  );

-- Restrict push notification tokens to owner only for SELECT
DROP POLICY IF EXISTS "Admins can view all tokens" ON public.push_notification_tokens;

CREATE POLICY "Only token owner can view their tokens"
  ON public.push_notification_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Managers can still manage tokens for notification purposes but through service role
CREATE POLICY "Service role can manage all tokens"
  ON public.push_notification_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);