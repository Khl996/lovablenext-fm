-- Make the role column nullable in role_permissions since we now use role_code
ALTER TABLE public.role_permissions 
ALTER COLUMN role DROP NOT NULL;

-- Set a default value for existing records that don't have role
UPDATE public.role_permissions 
SET role = 'global_admin'::app_role 
WHERE role IS NULL AND role_code IS NOT NULL;