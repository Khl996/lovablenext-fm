/*
  # Create Maintenance Planning Tables

  ## Tables Created
  
  1. **maintenance_plans** - Annual maintenance plans
  2. **maintenance_tasks** - Tasks within plans
     
  ## Security
  - RLS enabled on all tables
  - Policies for tenant isolation
*/

-- Maintenance Plans Table
CREATE TABLE IF NOT EXISTS maintenance_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  year integer NOT NULL,
  department text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'in_progress', 'completed', 'cancelled')),
  budget numeric(15,2),
  budget_utilization numeric(5,2) DEFAULT 0,
  completion_rate numeric(5,2) DEFAULT 0,
  on_time_rate numeric(5,2) DEFAULT 0,
  quality_score numeric(5,2) DEFAULT 0,
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- Maintenance Tasks Table
CREATE TABLE IF NOT EXISTS maintenance_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  type text NOT NULL CHECK (type IN ('preventive', 'corrective', 'predictive')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold')),
  frequency text CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'semi_annual', 'annual', 'one_time')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  duration_days integer NOT NULL,
  progress numeric(5,2) DEFAULT 0,
  is_critical boolean DEFAULT false,
  plan_id uuid NOT NULL REFERENCES maintenance_plans(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES profiles(id),
  depends_on uuid REFERENCES maintenance_tasks(id),
  checklist jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(plan_id, code)
);

-- Enable RLS
ALTER TABLE maintenance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for maintenance_plans
CREATE POLICY "Platform admins can view all plans"
  ON maintenance_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

CREATE POLICY "Platform admins can manage plans"
  ON maintenance_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- RLS Policies for maintenance_tasks
CREATE POLICY "Platform admins can view all tasks"
  ON maintenance_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

CREATE POLICY "Platform admins can manage tasks"
  ON maintenance_tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

CREATE POLICY "Assigned users can view their tasks"
  ON maintenance_tasks FOR SELECT
  TO authenticated
  USING (assigned_to = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_plans_hospital_id ON maintenance_plans(hospital_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_plans_year ON maintenance_plans(year);
CREATE INDEX IF NOT EXISTS idx_maintenance_plans_status ON maintenance_plans(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_plan_id ON maintenance_tasks(plan_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_assigned_to ON maintenance_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_status ON maintenance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_start_date ON maintenance_tasks(start_date);
