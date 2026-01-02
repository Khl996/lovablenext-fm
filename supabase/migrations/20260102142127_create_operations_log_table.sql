/*
  # Create Operations Log Table

  Complete operations logging system for maintenance activities
*/

CREATE TABLE IF NOT EXISTS operation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  type text NOT NULL CHECK (type IN ('maintenance', 'repair', 'inspection', 'emergency', 'shutdown', 'startup', 'replacement', 'calibration', 'cleaning')),
  asset_name text NOT NULL,
  asset_id uuid REFERENCES assets(id),
  location text NOT NULL,
  system_type text NOT NULL,
  reason text NOT NULL,
  description text,
  performed_by uuid NOT NULL REFERENCES profiles(id),
  technician_name text NOT NULL,
  team uuid REFERENCES teams(id),
  timestamp timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'cancelled', 'pending_approval')),
  category text,
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  related_work_order uuid REFERENCES work_orders(id),
  start_time timestamptz,
  end_time timestamptz,
  estimated_duration integer,
  actual_duration integer,
  photos text[],
  notes text,
  approval_required boolean DEFAULT false,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  approval_notes text,
  emergency_measures text,
  affected_areas text[],
  notified_parties text[],
  previous_status text,
  new_status text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- Enable RLS
ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Platform admins can view all logs"
  ON operation_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

CREATE POLICY "Platform admins can manage logs"
  ON operation_logs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

CREATE POLICY "Users can view their own logs"
  ON operation_logs FOR SELECT
  TO authenticated
  USING (performed_by = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_operation_logs_hospital_id ON operation_logs(hospital_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_asset_id ON operation_logs(asset_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_performed_by ON operation_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_operation_logs_team ON operation_logs(team);
CREATE INDEX IF NOT EXISTS idx_operation_logs_timestamp ON operation_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_operation_logs_type ON operation_logs(type);
CREATE INDEX IF NOT EXISTS idx_operation_logs_status ON operation_logs(status);
CREATE INDEX IF NOT EXISTS idx_operation_logs_related_work_order ON operation_logs(related_work_order);
