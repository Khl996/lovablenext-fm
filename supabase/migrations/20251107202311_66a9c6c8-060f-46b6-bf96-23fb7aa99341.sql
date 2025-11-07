-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE app_role AS ENUM ('global_admin', 'hospital_admin', 'facility_manager', 'maintenance_manager', 'supervisor', 'technician', 'reporter');

CREATE TYPE asset_category AS ENUM ('mechanical', 'electrical', 'medical', 'safety', 'plumbing', 'other');

CREATE TYPE asset_status AS ENUM ('active', 'inactive', 'maintenance', 'retired');

CREATE TYPE criticality_level AS ENUM ('critical', 'essential', 'non_essential');

CREATE TYPE work_order_status AS ENUM (
  'pending',
  'assigned',
  'in_progress',
  'needs_redirection',
  'awaiting_approval',
  'customer_approved',
  'customer_rejected',
  'completed',
  'cancelled'
);

CREATE TYPE work_order_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TYPE operation_type AS ENUM ('shutdown', 'startup', 'adjustment', 'transfer');

CREATE TYPE maintenance_type AS ENUM ('preventive', 'corrective', 'predictive', 'routine');

-- Hospitals/Facilities table (multi-tenant root)
CREATE TABLE public.hospitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  type TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  full_name_ar TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, hospital_id)
);

-- Buildings table
CREATE TABLE public.buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- Floors table
CREATE TABLE public.floors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  level INTEGER NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(building_id, code)
);

-- Departments/Zones table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  floor_id UUID NOT NULL REFERENCES public.floors(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(floor_id, code)
);

-- Rooms table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  coordinates_x DECIMAL,
  coordinates_y DECIMAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(department_id, code)
);

-- Assets table
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  category asset_category NOT NULL,
  subcategory TEXT,
  type TEXT,
  model TEXT,
  serial_number TEXT,
  manufacturer TEXT,
  manufacture_year INTEGER,
  
  -- Location
  building_id UUID REFERENCES public.buildings(id),
  floor_id UUID REFERENCES public.floors(id),
  department_id UUID REFERENCES public.departments(id),
  room_id UUID REFERENCES public.rooms(id),
  coordinates_x DECIMAL,
  coordinates_y DECIMAL,
  
  -- Specifications
  specifications JSONB,
  
  -- Operational info
  status asset_status NOT NULL DEFAULT 'active',
  criticality criticality_level NOT NULL DEFAULT 'non_essential',
  installation_date DATE,
  warranty_expiry DATE,
  warranty_provider TEXT,
  expected_lifespan_years INTEGER,
  
  -- Financial
  purchase_cost DECIMAL,
  purchase_date DATE,
  supplier TEXT,
  depreciation_annual DECIMAL,
  
  -- QR Code
  qr_code TEXT UNIQUE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- Teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  department TEXT,
  type TEXT NOT NULL DEFAULT 'internal',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- Team members table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  specialization TEXT[],
  certifications JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Work orders table
CREATE TABLE public.work_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  
  -- Reporter info
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Asset and issue
  asset_id UUID REFERENCES public.assets(id),
  issue_type TEXT NOT NULL,
  description TEXT NOT NULL,
  photos TEXT[],
  urgency TEXT,
  priority work_order_priority NOT NULL DEFAULT 'medium',
  
  -- Location
  building_id UUID REFERENCES public.buildings(id),
  floor_id UUID REFERENCES public.floors(id),
  department_id UUID REFERENCES public.departments(id),
  room_id UUID REFERENCES public.rooms(id),
  
  -- Assignment
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id),
  assigned_team UUID REFERENCES public.teams(id),
  assigned_at TIMESTAMPTZ,
  
  -- Timing
  due_date TIMESTAMPTZ,
  estimated_duration INTEGER,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  actual_duration INTEGER,
  
  -- Status and workflow
  status work_order_status NOT NULL DEFAULT 'pending',
  
  -- Redirection
  is_redirected BOOLEAN DEFAULT false,
  original_issue_type TEXT,
  redirected_to TEXT,
  redirected_by UUID REFERENCES auth.users(id),
  redirect_reason TEXT,
  
  -- Work details
  actions_taken JSONB,
  parts_used JSONB,
  work_notes TEXT,
  work_photos TEXT[],
  
  -- Approval
  supervisor_approved_by UUID REFERENCES auth.users(id),
  supervisor_approved_at TIMESTAMPTZ,
  supervisor_notes TEXT,
  
  -- Customer feedback
  customer_reviewed_by UUID REFERENCES auth.users(id),
  customer_reviewed_at TIMESTAMPTZ,
  customer_feedback TEXT,
  customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
  
  -- Metrics
  total_cost DECIMAL,
  labor_time DECIMAL,
  response_time INTEGER,
  resolution_time INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- Operations log table
CREATE TABLE public.operations_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  
  -- Operation details
  type operation_type NOT NULL,
  system_type TEXT NOT NULL,
  
  -- Target system
  asset_id UUID REFERENCES public.assets(id),
  asset_name TEXT NOT NULL,
  location TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  
  -- Performed by
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  technician_name TEXT NOT NULL,
  team TEXT,
  
  -- Reason and details
  reason TEXT NOT NULL,
  category TEXT,
  description TEXT,
  estimated_duration INTEGER,
  
  -- Timing
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  actual_duration INTEGER,
  
  -- Approval
  approval_required BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  
  -- Execution
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  photos TEXT[],
  
  -- Impact
  affected_areas TEXT[],
  notified_parties TEXT[],
  emergency_measures TEXT,
  
  -- Related records
  related_work_order UUID REFERENCES public.work_orders(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- Maintenance plans table
CREATE TABLE public.maintenance_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  year INTEGER NOT NULL,
  department TEXT,
  budget DECIMAL,
  status TEXT NOT NULL DEFAULT 'active',
  
  -- KPIs
  completion_rate DECIMAL,
  on_time_rate DECIMAL,
  budget_utilization DECIMAL,
  quality_score DECIMAL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- Maintenance tasks table
CREATE TABLE public.maintenance_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES public.maintenance_plans(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  type maintenance_type NOT NULL,
  
  -- Schedule
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  frequency TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  
  -- Assignment
  assigned_to UUID REFERENCES public.teams(id),
  
  -- Dependencies
  depends_on UUID REFERENCES public.maintenance_tasks(id),
  is_critical BOOLEAN DEFAULT false,
  
  -- Checklist/Form
  checklist JSONB,
  
  -- Progress
  progress INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tasks ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create security definer function to get user's hospital
CREATE OR REPLACE FUNCTION public.get_user_hospital(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT hospital_id
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$$;

-- RLS Policies for hospitals
CREATE POLICY "Users can view their own hospital"
  ON public.hospitals FOR SELECT
  USING (
    id = public.get_user_hospital(auth.uid()) OR
    public.has_role(auth.uid(), 'global_admin')
  );

CREATE POLICY "Global admins can insert hospitals"
  ON public.hospitals FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'global_admin'));

CREATE POLICY "Admins can update their hospital"
  ON public.hospitals FOR UPDATE
  USING (
    id = public.get_user_hospital(auth.uid()) AND
    public.has_role(auth.uid(), 'hospital_admin')
  );

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles in their hospital"
  ON public.profiles FOR SELECT
  USING (
    hospital_id = public.get_user_hospital(auth.uid()) OR
    id = auth.uid() OR
    public.has_role(auth.uid(), 'global_admin')
  );

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- RLS Policies for user_roles
CREATE POLICY "Users can view roles in their hospital"
  ON public.user_roles FOR SELECT
  USING (
    hospital_id = public.get_user_hospital(auth.uid()) OR
    user_id = auth.uid() OR
    public.has_role(auth.uid(), 'global_admin')
  );

CREATE POLICY "Admins can manage roles in their hospital"
  ON public.user_roles FOR ALL
  USING (
    (hospital_id = public.get_user_hospital(auth.uid()) AND
     public.has_role(auth.uid(), 'hospital_admin')) OR
    public.has_role(auth.uid(), 'global_admin')
  );

-- RLS Policies for buildings
CREATE POLICY "Users can view buildings in their hospital"
  ON public.buildings FOR SELECT
  USING (hospital_id = public.get_user_hospital(auth.uid()));

CREATE POLICY "Managers can manage buildings in their hospital"
  ON public.buildings FOR ALL
  USING (
    hospital_id = public.get_user_hospital(auth.uid()) AND
    (public.has_role(auth.uid(), 'hospital_admin') OR
     public.has_role(auth.uid(), 'facility_manager'))
  );

-- RLS Policies for floors
CREATE POLICY "Users can view floors in their hospital"
  ON public.floors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.buildings
      WHERE buildings.id = floors.building_id
      AND buildings.hospital_id = public.get_user_hospital(auth.uid())
    )
  );

CREATE POLICY "Managers can manage floors in their hospital"
  ON public.floors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.buildings
      WHERE buildings.id = floors.building_id
      AND buildings.hospital_id = public.get_user_hospital(auth.uid())
      AND (public.has_role(auth.uid(), 'hospital_admin') OR
           public.has_role(auth.uid(), 'facility_manager'))
    )
  );

-- RLS Policies for departments
CREATE POLICY "Users can view departments in their hospital"
  ON public.departments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.floors
      JOIN public.buildings ON buildings.id = floors.building_id
      WHERE floors.id = departments.floor_id
      AND buildings.hospital_id = public.get_user_hospital(auth.uid())
    )
  );

CREATE POLICY "Managers can manage departments in their hospital"
  ON public.departments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.floors
      JOIN public.buildings ON buildings.id = floors.building_id
      WHERE floors.id = departments.floor_id
      AND buildings.hospital_id = public.get_user_hospital(auth.uid())
      AND (public.has_role(auth.uid(), 'hospital_admin') OR
           public.has_role(auth.uid(), 'facility_manager'))
    )
  );

-- RLS Policies for rooms
CREATE POLICY "Users can view rooms in their hospital"
  ON public.rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.departments
      JOIN public.floors ON floors.id = departments.floor_id
      JOIN public.buildings ON buildings.id = floors.building_id
      WHERE departments.id = rooms.department_id
      AND buildings.hospital_id = public.get_user_hospital(auth.uid())
    )
  );

CREATE POLICY "Managers can manage rooms in their hospital"
  ON public.rooms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.departments
      JOIN public.floors ON floors.id = departments.floor_id
      JOIN public.buildings ON buildings.id = floors.building_id
      WHERE departments.id = rooms.department_id
      AND buildings.hospital_id = public.get_user_hospital(auth.uid())
      AND (public.has_role(auth.uid(), 'hospital_admin') OR
           public.has_role(auth.uid(), 'facility_manager'))
    )
  );

-- RLS Policies for assets
CREATE POLICY "Users can view assets in their hospital"
  ON public.assets FOR SELECT
  USING (hospital_id = public.get_user_hospital(auth.uid()));

CREATE POLICY "Staff can manage assets in their hospital"
  ON public.assets FOR ALL
  USING (
    hospital_id = public.get_user_hospital(auth.uid()) AND
    (public.has_role(auth.uid(), 'hospital_admin') OR
     public.has_role(auth.uid(), 'facility_manager') OR
     public.has_role(auth.uid(), 'maintenance_manager'))
  );

-- RLS Policies for teams
CREATE POLICY "Users can view teams in their hospital"
  ON public.teams FOR SELECT
  USING (hospital_id = public.get_user_hospital(auth.uid()));

CREATE POLICY "Managers can manage teams in their hospital"
  ON public.teams FOR ALL
  USING (
    hospital_id = public.get_user_hospital(auth.uid()) AND
    (public.has_role(auth.uid(), 'hospital_admin') OR
     public.has_role(auth.uid(), 'maintenance_manager'))
  );

-- RLS Policies for team_members
CREATE POLICY "Users can view team members in their hospital"
  ON public.team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id
      AND teams.hospital_id = public.get_user_hospital(auth.uid())
    )
  );

CREATE POLICY "Managers can manage team members in their hospital"
  ON public.team_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id
      AND teams.hospital_id = public.get_user_hospital(auth.uid())
      AND (public.has_role(auth.uid(), 'hospital_admin') OR
           public.has_role(auth.uid(), 'maintenance_manager'))
    )
  );

-- RLS Policies for work_orders
CREATE POLICY "Users can view work orders in their hospital"
  ON public.work_orders FOR SELECT
  USING (hospital_id = public.get_user_hospital(auth.uid()));

CREATE POLICY "Users can create work orders in their hospital"
  ON public.work_orders FOR INSERT
  WITH CHECK (
    hospital_id = public.get_user_hospital(auth.uid()) AND
    reported_by = auth.uid()
  );

CREATE POLICY "Assigned users and managers can update work orders"
  ON public.work_orders FOR UPDATE
  USING (
    hospital_id = public.get_user_hospital(auth.uid()) AND
    (assigned_to = auth.uid() OR
     reported_by = auth.uid() OR
     public.has_role(auth.uid(), 'supervisor') OR
     public.has_role(auth.uid(), 'maintenance_manager') OR
     public.has_role(auth.uid(), 'facility_manager') OR
     public.has_role(auth.uid(), 'hospital_admin'))
  );

-- RLS Policies for operations_log
CREATE POLICY "Users can view operations in their hospital"
  ON public.operations_log FOR SELECT
  USING (hospital_id = public.get_user_hospital(auth.uid()));

CREATE POLICY "Technicians can create operations in their hospital"
  ON public.operations_log FOR INSERT
  WITH CHECK (
    hospital_id = public.get_user_hospital(auth.uid()) AND
    performed_by = auth.uid() AND
    (public.has_role(auth.uid(), 'technician') OR
     public.has_role(auth.uid(), 'supervisor') OR
     public.has_role(auth.uid(), 'maintenance_manager'))
  );

CREATE POLICY "Managers can update operations in their hospital"
  ON public.operations_log FOR UPDATE
  USING (
    hospital_id = public.get_user_hospital(auth.uid()) AND
    (public.has_role(auth.uid(), 'supervisor') OR
     public.has_role(auth.uid(), 'maintenance_manager') OR
     public.has_role(auth.uid(), 'hospital_admin'))
  );

-- RLS Policies for maintenance_plans
CREATE POLICY "Users can view maintenance plans in their hospital"
  ON public.maintenance_plans FOR SELECT
  USING (hospital_id = public.get_user_hospital(auth.uid()));

CREATE POLICY "Managers can manage maintenance plans in their hospital"
  ON public.maintenance_plans FOR ALL
  USING (
    hospital_id = public.get_user_hospital(auth.uid()) AND
    (public.has_role(auth.uid(), 'hospital_admin') OR
     public.has_role(auth.uid(), 'facility_manager') OR
     public.has_role(auth.uid(), 'maintenance_manager'))
  );

-- RLS Policies for maintenance_tasks
CREATE POLICY "Users can view maintenance tasks in their hospital"
  ON public.maintenance_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_plans
      WHERE maintenance_plans.id = maintenance_tasks.plan_id
      AND maintenance_plans.hospital_id = public.get_user_hospital(auth.uid())
    )
  );

CREATE POLICY "Managers can manage maintenance tasks in their hospital"
  ON public.maintenance_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_plans
      WHERE maintenance_plans.id = maintenance_tasks.plan_id
      AND maintenance_plans.hospital_id = public.get_user_hospital(auth.uid())
      AND (public.has_role(auth.uid(), 'hospital_admin') OR
           public.has_role(auth.uid(), 'facility_manager') OR
           public.has_role(auth.uid(), 'maintenance_manager'))
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER handle_hospitals_updated_at
  BEFORE UPDATE ON public.hospitals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_buildings_updated_at
  BEFORE UPDATE ON public.buildings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_floors_updated_at
  BEFORE UPDATE ON public.floors
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_work_orders_updated_at
  BEFORE UPDATE ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_maintenance_plans_updated_at
  BEFORE UPDATE ON public.maintenance_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_maintenance_tasks_updated_at
  BEFORE UPDATE ON public.maintenance_tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();