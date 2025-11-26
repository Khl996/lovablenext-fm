-- Drop table if exists to start fresh
DROP TABLE IF EXISTS public.supervisor_buildings CASCADE;

-- Create supervisor_buildings table for location-based supervision
CREATE TABLE public.supervisor_buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, building_id)
);

-- Add trigger for updated_at
CREATE TRIGGER update_supervisor_buildings_updated_at
BEFORE UPDATE ON public.supervisor_buildings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.supervisor_buildings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view assigned buildings in their hospital
CREATE POLICY "Users can view supervisor buildings"
ON public.supervisor_buildings
FOR SELECT
TO authenticated
USING (
  hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT hospital_id FROM user_custom_roles WHERE user_id = auth.uid()
  )
);

-- Policy: Admins can insert supervisor buildings
CREATE POLICY "Admins can insert supervisor buildings"
ON public.supervisor_buildings
FOR INSERT
TO authenticated
WITH CHECK (
  hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT hospital_id FROM user_custom_roles WHERE user_id = auth.uid()
  ) AND (
    has_role_by_code(auth.uid(), 'global_admin') OR
    has_role_by_code(auth.uid(), 'hospital_admin') OR
    has_role_by_code(auth.uid(), 'facility_manager')
  )
);

-- Policy: Admins can update supervisor buildings
CREATE POLICY "Admins can update supervisor buildings"
ON public.supervisor_buildings
FOR UPDATE
TO authenticated
USING (
  hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT hospital_id FROM user_custom_roles WHERE user_id = auth.uid()
  ) AND (
    has_role_by_code(auth.uid(), 'global_admin') OR
    has_role_by_code(auth.uid(), 'hospital_admin') OR
    has_role_by_code(auth.uid(), 'facility_manager')
  )
);

-- Policy: Admins can delete supervisor buildings
CREATE POLICY "Admins can delete supervisor buildings"
ON public.supervisor_buildings
FOR DELETE
TO authenticated
USING (
  hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT hospital_id FROM user_custom_roles WHERE user_id = auth.uid()
  ) AND (
    has_role_by_code(auth.uid(), 'global_admin') OR
    has_role_by_code(auth.uid(), 'hospital_admin') OR
    has_role_by_code(auth.uid(), 'facility_manager')
  )
);

-- Helper function: Check if user is assigned to a building
CREATE OR REPLACE FUNCTION public.is_assigned_to_building(_user_id UUID, _building_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.supervisor_buildings
    WHERE user_id = _user_id AND building_id = _building_id
  )
$$;