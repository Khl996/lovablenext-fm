-- Create system_roles table for managing system roles (separate from team roles)
CREATE TABLE IF NOT EXISTS public.system_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_roles ENABLE ROW LEVEL SECURITY;

-- Global admins can manage system roles
CREATE POLICY "Global admins can manage system roles"
ON public.system_roles
FOR ALL
USING (has_role(auth.uid(), 'global_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'global_admin'::app_role));

-- Authenticated users can view system roles
CREATE POLICY "Authenticated users can view system roles"
ON public.system_roles
FOR SELECT
USING (true);

-- Insert default global_admin role
INSERT INTO public.system_roles (code, name, name_ar, description, display_order)
VALUES ('global_admin', 'Global Admin', 'مدير النظام', 'Full system access', 0)
ON CONFLICT (code) DO NOTHING;