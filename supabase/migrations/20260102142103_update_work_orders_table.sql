/*
  # Update Work Orders Table

  Adds all missing columns to align with WorkOrder type in code.
  This includes workflow tracking, approvals, and location details.
*/

-- Add missing columns to work_orders
DO $$
BEGIN
  -- Basic info
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'code') THEN
    ALTER TABLE work_orders ADD COLUMN code text UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'issue_type') THEN
    ALTER TABLE work_orders ADD COLUMN issue_type text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'reported_at') THEN
    ALTER TABLE work_orders ADD COLUMN reported_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'reported_by') THEN
    ALTER TABLE work_orders ADD COLUMN reported_by uuid REFERENCES profiles(id);
  END IF;

  -- Team assignment
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'assigned_team') THEN
    ALTER TABLE work_orders ADD COLUMN assigned_team uuid REFERENCES teams(id);
  END IF;

  -- Location details (hospital structure)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'hospital_id') THEN
    ALTER TABLE work_orders ADD COLUMN hospital_id uuid REFERENCES hospitals(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'building_id') THEN
    ALTER TABLE work_orders ADD COLUMN building_id uuid REFERENCES buildings(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'floor_id') THEN
    ALTER TABLE work_orders ADD COLUMN floor_id uuid REFERENCES floors(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'department_id') THEN
    ALTER TABLE work_orders ADD COLUMN department_id uuid REFERENCES departments(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'room_id') THEN
    ALTER TABLE work_orders ADD COLUMN room_id uuid REFERENCES rooms(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'company_id') THEN
    ALTER TABLE work_orders ADD COLUMN company_id uuid REFERENCES companies(id);
  END IF;

  -- Time tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'start_time') THEN
    ALTER TABLE work_orders ADD COLUMN start_time timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'end_time') THEN
    ALTER TABLE work_orders ADD COLUMN end_time timestamptz;
  END IF;

  -- Technician completion
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'technician_completed_at') THEN
    ALTER TABLE work_orders ADD COLUMN technician_completed_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'technician_notes') THEN
    ALTER TABLE work_orders ADD COLUMN technician_notes text;
  END IF;

  -- Supervisor approval
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'supervisor_approved_at') THEN
    ALTER TABLE work_orders ADD COLUMN supervisor_approved_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'supervisor_approved_by') THEN
    ALTER TABLE work_orders ADD COLUMN supervisor_approved_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'supervisor_notes') THEN
    ALTER TABLE work_orders ADD COLUMN supervisor_notes text;
  END IF;

  -- Engineer approval
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'engineer_approved_at') THEN
    ALTER TABLE work_orders ADD COLUMN engineer_approved_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'engineer_approved_by') THEN
    ALTER TABLE work_orders ADD COLUMN engineer_approved_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'engineer_notes') THEN
    ALTER TABLE work_orders ADD COLUMN engineer_notes text;
  END IF;

  -- Reporter/Customer review
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'customer_reviewed_at') THEN
    ALTER TABLE work_orders ADD COLUMN customer_reviewed_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'customer_reviewed_by') THEN
    ALTER TABLE work_orders ADD COLUMN customer_reviewed_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'reporter_notes') THEN
    ALTER TABLE work_orders ADD COLUMN reporter_notes text;
  END IF;

  -- Maintenance Manager approval
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'maintenance_manager_approved_at') THEN
    ALTER TABLE work_orders ADD COLUMN maintenance_manager_approved_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'maintenance_manager_approved_by') THEN
    ALTER TABLE work_orders ADD COLUMN maintenance_manager_approved_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'maintenance_manager_notes') THEN
    ALTER TABLE work_orders ADD COLUMN maintenance_manager_notes text;
  END IF;

  -- Auto-closure tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'auto_closed_at') THEN
    ALTER TABLE work_orders ADD COLUMN auto_closed_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'pending_closure_since') THEN
    ALTER TABLE work_orders ADD COLUMN pending_closure_since timestamptz;
  END IF;
END $$;

-- Update status check constraint to include all statuses from WorkOrderStatus type
DO $$
BEGIN
  ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_status_check;
  ALTER TABLE work_orders ADD CONSTRAINT work_orders_status_check 
    CHECK (status IN (
      'pending',
      'assigned',
      'in_progress',
      'pending_supervisor_approval',
      'pending_engineer_review',
      'pending_reporter_closure',
      'completed',
      'auto_closed',
      'cancelled'
    ));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update priority check constraint
DO $$
BEGIN
  ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_priority_check;
  ALTER TABLE work_orders ADD CONSTRAINT work_orders_priority_check 
    CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create additional indexes for work_orders
CREATE INDEX IF NOT EXISTS idx_work_orders_hospital_id ON work_orders(hospital_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_building_id ON work_orders(building_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_floor_id ON work_orders(floor_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_department_id ON work_orders(department_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_room_id ON work_orders(room_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_company_id ON work_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_team ON work_orders(assigned_team);
CREATE INDEX IF NOT EXISTS idx_work_orders_reported_by ON work_orders(reported_by);
CREATE INDEX IF NOT EXISTS idx_work_orders_reported_at ON work_orders(reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_orders_issue_type ON work_orders(issue_type);
CREATE INDEX IF NOT EXISTS idx_work_orders_code ON work_orders(code);
