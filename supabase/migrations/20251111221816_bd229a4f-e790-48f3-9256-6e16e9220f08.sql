-- Create unified lookup tables system for dynamic reference data

-- 1. Priorities lookup table
CREATE TABLE public.lookup_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  level integer NOT NULL DEFAULT 0, -- Higher number = higher priority
  color text, -- Hex color for UI
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- 2. Work Order Statuses lookup table
CREATE TABLE public.lookup_work_order_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  category text NOT NULL, -- 'open', 'in_progress', 'closed'
  color text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- 3. Asset Statuses lookup table
CREATE TABLE public.lookup_asset_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  category text NOT NULL, -- 'operational', 'maintenance', 'inactive'
  color text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- 4. Asset Categories lookup table
CREATE TABLE public.lookup_asset_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  description text,
  parent_code text, -- For hierarchical categories
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- 5. Work Types lookup table
CREATE TABLE public.lookup_work_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- 6. Team Member Roles lookup table
CREATE TABLE public.lookup_team_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  description text,
  level integer DEFAULT 0, -- Hierarchy level
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- Enable RLS on all lookup tables
ALTER TABLE public.lookup_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lookup_work_order_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lookup_asset_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lookup_asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lookup_work_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lookup_team_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for all lookup tables (same pattern for all)
-- Priorities
CREATE POLICY "Users can view priorities in their hospital"
  ON public.lookup_priorities FOR SELECT
  USING (hospital_id = get_user_hospital(auth.uid()));

CREATE POLICY "Admins can manage priorities in their hospital"
  ON public.lookup_priorities FOR ALL
  USING (
    hospital_id = get_user_hospital(auth.uid())
    AND (
      has_role(auth.uid(), 'hospital_admin'::app_role)
      OR has_role(auth.uid(), 'facility_manager'::app_role)
      OR has_role(auth.uid(), 'global_admin'::app_role)
    )
  );

-- Work Order Statuses
CREATE POLICY "Users can view work order statuses in their hospital"
  ON public.lookup_work_order_statuses FOR SELECT
  USING (hospital_id = get_user_hospital(auth.uid()));

CREATE POLICY "Admins can manage work order statuses in their hospital"
  ON public.lookup_work_order_statuses FOR ALL
  USING (
    hospital_id = get_user_hospital(auth.uid())
    AND (
      has_role(auth.uid(), 'hospital_admin'::app_role)
      OR has_role(auth.uid(), 'facility_manager'::app_role)
      OR has_role(auth.uid(), 'global_admin'::app_role)
    )
  );

-- Asset Statuses
CREATE POLICY "Users can view asset statuses in their hospital"
  ON public.lookup_asset_statuses FOR SELECT
  USING (hospital_id = get_user_hospital(auth.uid()));

CREATE POLICY "Admins can manage asset statuses in their hospital"
  ON public.lookup_asset_statuses FOR ALL
  USING (
    hospital_id = get_user_hospital(auth.uid())
    AND (
      has_role(auth.uid(), 'hospital_admin'::app_role)
      OR has_role(auth.uid(), 'facility_manager'::app_role)
      OR has_role(auth.uid(), 'global_admin'::app_role)
    )
  );

-- Asset Categories
CREATE POLICY "Users can view asset categories in their hospital"
  ON public.lookup_asset_categories FOR SELECT
  USING (hospital_id = get_user_hospital(auth.uid()));

CREATE POLICY "Admins can manage asset categories in their hospital"
  ON public.lookup_asset_categories FOR ALL
  USING (
    hospital_id = get_user_hospital(auth.uid())
    AND (
      has_role(auth.uid(), 'hospital_admin'::app_role)
      OR has_role(auth.uid(), 'facility_manager'::app_role)
      OR has_role(auth.uid(), 'global_admin'::app_role)
    )
  );

-- Work Types
CREATE POLICY "Users can view work types in their hospital"
  ON public.lookup_work_types FOR SELECT
  USING (hospital_id = get_user_hospital(auth.uid()));

CREATE POLICY "Admins can manage work types in their hospital"
  ON public.lookup_work_types FOR ALL
  USING (
    hospital_id = get_user_hospital(auth.uid())
    AND (
      has_role(auth.uid(), 'hospital_admin'::app_role)
      OR has_role(auth.uid(), 'facility_manager'::app_role)
      OR has_role(auth.uid(), 'global_admin'::app_role)
    )
  );

-- Team Roles
CREATE POLICY "Users can view team roles in their hospital"
  ON public.lookup_team_roles FOR SELECT
  USING (hospital_id = get_user_hospital(auth.uid()));

CREATE POLICY "Admins can manage team roles in their hospital"
  ON public.lookup_team_roles FOR ALL
  USING (
    hospital_id = get_user_hospital(auth.uid())
    AND (
      has_role(auth.uid(), 'hospital_admin'::app_role)
      OR has_role(auth.uid(), 'facility_manager'::app_role)
      OR has_role(auth.uid(), 'global_admin'::app_role)
    )
  );

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers for all lookup tables
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.lookup_priorities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.lookup_work_order_statuses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.lookup_asset_statuses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.lookup_asset_categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.lookup_work_types
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.lookup_team_roles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();