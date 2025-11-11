-- Create specializations table for unified specializations
CREATE TABLE public.specializations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  category text NOT NULL, -- e.g., 'electrical', 'hvac', 'plumbing', etc.
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- Enable RLS
ALTER TABLE public.specializations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for specializations
CREATE POLICY "Users can view specializations in their hospital"
  ON public.specializations
  FOR SELECT
  USING (hospital_id = get_user_hospital(auth.uid()));

CREATE POLICY "Admins can manage specializations in their hospital"
  ON public.specializations
  FOR ALL
  USING (
    hospital_id = get_user_hospital(auth.uid()) 
    AND (has_role(auth.uid(), 'hospital_admin'::app_role) OR has_role(auth.uid(), 'facility_manager'::app_role))
  );

-- Create issue_type_team_mapping table
CREATE TABLE public.issue_type_team_mapping (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  issue_type text NOT NULL,
  issue_type_ar text NOT NULL,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.issue_type_team_mapping ENABLE ROW LEVEL SECURITY;

-- RLS Policies for issue_type_team_mapping
CREATE POLICY "Users can view issue type mappings in their hospital"
  ON public.issue_type_team_mapping
  FOR SELECT
  USING (hospital_id = get_user_hospital(auth.uid()));

CREATE POLICY "Admins can manage issue type mappings in their hospital"
  ON public.issue_type_team_mapping
  FOR ALL
  USING (
    hospital_id = get_user_hospital(auth.uid()) 
    AND (has_role(auth.uid(), 'hospital_admin'::app_role) OR has_role(auth.uid(), 'facility_manager'::app_role))
  );

-- Create updated_at trigger for specializations
CREATE TRIGGER update_specializations_updated_at
  BEFORE UPDATE ON public.specializations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create updated_at trigger for issue_type_team_mapping
CREATE TRIGGER update_issue_type_team_mapping_updated_at
  BEFORE UPDATE ON public.issue_type_team_mapping
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add index for better performance
CREATE INDEX idx_issue_type_team_mapping_hospital ON public.issue_type_team_mapping(hospital_id);
CREATE INDEX idx_issue_type_team_mapping_issue_type ON public.issue_type_team_mapping(issue_type);
CREATE INDEX idx_specializations_hospital ON public.specializations(hospital_id);
CREATE INDEX idx_specializations_category ON public.specializations(category);