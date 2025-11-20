-- ==========================================
-- COST MANAGEMENT TABLES
-- ==========================================

-- Cost categories lookup table
CREATE TABLE IF NOT EXISTS public.cost_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- Cost tracking table
CREATE TABLE IF NOT EXISTS public.costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  category_id UUID REFERENCES public.cost_categories(id),
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  cost_type TEXT NOT NULL, -- labor, parts, service, travel, other
  description TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit_cost NUMERIC NOT NULL,
  total_cost NUMERIC GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  currency TEXT DEFAULT 'SAR',
  cost_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_number TEXT,
  vendor TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- ==========================================
-- CONTRACTS MANAGEMENT TABLES
-- ==========================================

CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  contract_type TEXT NOT NULL, -- maintenance, service, supply, other
  vendor_id UUID REFERENCES public.companies(id),
  vendor_name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  value NUMERIC NOT NULL,
  currency TEXT DEFAULT 'SAR',
  payment_terms TEXT,
  status TEXT DEFAULT 'active', -- draft, active, expired, terminated, renewed
  renewal_notice_days INTEGER DEFAULT 30,
  auto_renew BOOLEAN DEFAULT false,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  terms_and_conditions TEXT,
  attached_assets UUID[], -- Array of asset IDs covered
  scope_of_work TEXT,
  kpis JSONB,
  documents TEXT[], -- Array of document URLs
  created_by UUID NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  terminated_at TIMESTAMP WITH TIME ZONE,
  termination_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- ==========================================
-- SLA MANAGEMENT TABLES
-- ==========================================

CREATE TABLE IF NOT EXISTS public.sla_definitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  priority TEXT NOT NULL, -- critical, high, medium, low
  response_time_hours INTEGER NOT NULL,
  resolution_time_hours INTEGER NOT NULL,
  availability_target NUMERIC, -- Percentage
  applies_to TEXT NOT NULL, -- work_order, asset, service
  asset_category TEXT,
  issue_types TEXT[],
  is_active BOOLEAN DEFAULT true,
  penalty_per_breach NUMERIC,
  escalation_matrix JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(hospital_id, code)
);

CREATE TABLE IF NOT EXISTS public.sla_breaches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  sla_id UUID NOT NULL REFERENCES public.sla_definitions(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE,
  breach_type TEXT NOT NULL, -- response_time, resolution_time, availability
  expected_time TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_time TIMESTAMP WITH TIME ZONE,
  breach_duration_minutes INTEGER,
  status TEXT DEFAULT 'open', -- open, acknowledged, resolved, waived
  root_cause TEXT,
  corrective_action TEXT,
  penalty_applied NUMERIC,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- CALIBRATION MANAGEMENT TABLES
-- ==========================================

CREATE TABLE IF NOT EXISTS public.calibration_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  frequency_months INTEGER NOT NULL,
  last_calibration_date DATE,
  next_calibration_date DATE NOT NULL,
  calibration_standard TEXT,
  tolerance_range TEXT,
  responsible_team UUID REFERENCES public.teams(id),
  vendor_id UUID REFERENCES public.companies(id),
  status TEXT DEFAULT 'scheduled', -- scheduled, in_progress, completed, overdue
  priority TEXT DEFAULT 'medium',
  notification_days_before INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(hospital_id, code)
);

CREATE TABLE IF NOT EXISTS public.calibration_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES public.calibration_schedules(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  calibration_date DATE NOT NULL,
  performed_by TEXT NOT NULL,
  vendor_id UUID REFERENCES public.companies(id),
  certificate_number TEXT,
  result TEXT NOT NULL, -- pass, fail, conditional
  measurements JSONB,
  adjustments_made TEXT,
  next_calibration_date DATE,
  cost NUMERIC,
  certificate_url TEXT,
  report_url TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- ==========================================
-- ENABLE RLS
-- ==========================================

ALTER TABLE public.cost_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_breaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibration_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibration_records ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- Cost Categories Policies
CREATE POLICY "Users can view cost categories in their hospital"
  ON public.cost_categories FOR SELECT
  USING (hospital_id = get_user_hospital(auth.uid()));

CREATE POLICY "Admins can manage cost categories"
  ON public.cost_categories FOR ALL
  USING (
    hospital_id = get_user_hospital(auth.uid()) AND
    (has_role(auth.uid(), 'hospital_admin'::app_role) OR 
     has_role(auth.uid(), 'facility_manager'::app_role) OR
     has_role_by_code(auth.uid(), 'hospital_admin') OR
     has_role_by_code(auth.uid(), 'facility_manager'))
  );

-- Costs Policies
CREATE POLICY "Users can view costs in their hospital"
  ON public.costs FOR SELECT
  USING (hospital_id = get_user_hospital(auth.uid()));

CREATE POLICY "Authorized users can create costs"
  ON public.costs FOR INSERT
  WITH CHECK (
    hospital_id = get_user_hospital(auth.uid()) AND
    created_by = auth.uid()
  );

CREATE POLICY "Authorized users can update costs"
  ON public.costs FOR UPDATE
  USING (
    hospital_id = get_user_hospital(auth.uid()) AND
    (created_by = auth.uid() OR 
     has_role(auth.uid(), 'facility_manager'::app_role) OR
     has_role_by_code(auth.uid(), 'facility_manager'))
  );

-- Contracts Policies
CREATE POLICY "Users can view contracts in their hospital"
  ON public.contracts FOR SELECT
  USING (hospital_id = get_user_hospital(auth.uid()));

CREATE POLICY "Admins can manage contracts"
  ON public.contracts FOR ALL
  USING (
    hospital_id = get_user_hospital(auth.uid()) AND
    (has_role(auth.uid(), 'hospital_admin'::app_role) OR 
     has_role(auth.uid(), 'facility_manager'::app_role) OR
     has_role_by_code(auth.uid(), 'hospital_admin') OR
     has_role_by_code(auth.uid(), 'facility_manager'))
  );

-- SLA Definitions Policies
CREATE POLICY "Users can view SLA definitions in their hospital"
  ON public.sla_definitions FOR SELECT
  USING (hospital_id = get_user_hospital(auth.uid()));

CREATE POLICY "Admins can manage SLA definitions"
  ON public.sla_definitions FOR ALL
  USING (
    hospital_id = get_user_hospital(auth.uid()) AND
    (has_role(auth.uid(), 'hospital_admin'::app_role) OR 
     has_role(auth.uid(), 'facility_manager'::app_role) OR
     has_role_by_code(auth.uid(), 'hospital_admin') OR
     has_role_by_code(auth.uid(), 'facility_manager'))
  );

-- SLA Breaches Policies
CREATE POLICY "Users can view SLA breaches in their hospital"
  ON public.sla_breaches FOR SELECT
  USING (hospital_id = get_user_hospital(auth.uid()));

CREATE POLICY "System can create SLA breaches"
  ON public.sla_breaches FOR INSERT
  WITH CHECK (hospital_id = get_user_hospital(auth.uid()));

CREATE POLICY "Managers can update SLA breaches"
  ON public.sla_breaches FOR UPDATE
  USING (
    hospital_id = get_user_hospital(auth.uid()) AND
    (has_role(auth.uid(), 'facility_manager'::app_role) OR
     has_role_by_code(auth.uid(), 'facility_manager'))
  );

-- Calibration Schedules Policies
CREATE POLICY "Users can view calibration schedules in their hospital"
  ON public.calibration_schedules FOR SELECT
  USING (hospital_id = get_user_hospital(auth.uid()));

CREATE POLICY "Admins can manage calibration schedules"
  ON public.calibration_schedules FOR ALL
  USING (
    hospital_id = get_user_hospital(auth.uid()) AND
    (has_role(auth.uid(), 'hospital_admin'::app_role) OR 
     has_role(auth.uid(), 'facility_manager'::app_role) OR 
     has_role(auth.uid(), 'maintenance_manager'::app_role) OR
     has_role_by_code(auth.uid(), 'hospital_admin') OR
     has_role_by_code(auth.uid(), 'facility_manager') OR
     has_role_by_code(auth.uid(), 'maintenance_manager'))
  );

-- Calibration Records Policies
CREATE POLICY "Users can view calibration records in their hospital"
  ON public.calibration_records FOR SELECT
  USING (hospital_id = get_user_hospital(auth.uid()));

CREATE POLICY "Authorized users can create calibration records"
  ON public.calibration_records FOR INSERT
  WITH CHECK (
    hospital_id = get_user_hospital(auth.uid()) AND
    created_by = auth.uid()
  );

CREATE POLICY "Managers can update calibration records"
  ON public.calibration_records FOR UPDATE
  USING (
    hospital_id = get_user_hospital(auth.uid()) AND
    (created_by = auth.uid() OR 
     has_role(auth.uid(), 'facility_manager'::app_role) OR
     has_role_by_code(auth.uid(), 'facility_manager'))
  );

-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX idx_costs_hospital_id ON public.costs(hospital_id);
CREATE INDEX idx_costs_work_order_id ON public.costs(work_order_id);
CREATE INDEX idx_costs_asset_id ON public.costs(asset_id);
CREATE INDEX idx_costs_cost_date ON public.costs(cost_date);

CREATE INDEX idx_contracts_hospital_id ON public.contracts(hospital_id);
CREATE INDEX idx_contracts_vendor_id ON public.contracts(vendor_id);
CREATE INDEX idx_contracts_status ON public.contracts(status);
CREATE INDEX idx_contracts_end_date ON public.contracts(end_date);

CREATE INDEX idx_sla_breaches_hospital_id ON public.sla_breaches(hospital_id);
CREATE INDEX idx_sla_breaches_work_order_id ON public.sla_breaches(work_order_id);
CREATE INDEX idx_sla_breaches_status ON public.sla_breaches(status);

CREATE INDEX idx_calibration_schedules_hospital_id ON public.calibration_schedules(hospital_id);
CREATE INDEX idx_calibration_schedules_asset_id ON public.calibration_schedules(asset_id);
CREATE INDEX idx_calibration_schedules_next_date ON public.calibration_schedules(next_calibration_date);

CREATE INDEX idx_calibration_records_hospital_id ON public.calibration_records(hospital_id);
CREATE INDEX idx_calibration_records_asset_id ON public.calibration_records(asset_id);
CREATE INDEX idx_calibration_records_date ON public.calibration_records(calibration_date);

-- ==========================================
-- TRIGGERS
-- ==========================================

CREATE TRIGGER update_cost_categories_updated_at
  BEFORE UPDATE ON public.cost_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_costs_updated_at
  BEFORE UPDATE ON public.costs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_sla_definitions_updated_at
  BEFORE UPDATE ON public.sla_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_sla_breaches_updated_at
  BEFORE UPDATE ON public.sla_breaches
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_calibration_schedules_updated_at
  BEFORE UPDATE ON public.calibration_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_calibration_records_updated_at
  BEFORE UPDATE ON public.calibration_records
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();