-- Add approval workflow columns to work_orders table
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS technician_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS technician_notes TEXT,
ADD COLUMN IF NOT EXISTS engineer_approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS engineer_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS engineer_notes TEXT,
ADD COLUMN IF NOT EXISTS maintenance_manager_approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS maintenance_manager_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS maintenance_manager_notes TEXT;

-- Add index for approval queries
CREATE INDEX IF NOT EXISTS idx_work_orders_approval_status ON work_orders(status, supervisor_approved_at, engineer_approved_at);

-- Add comment for documentation
COMMENT ON COLUMN work_orders.technician_completed_at IS 'When technician marked work as complete';
COMMENT ON COLUMN work_orders.technician_notes IS 'Notes from technician upon completion';
COMMENT ON COLUMN work_orders.engineer_approved_by IS 'Engineer who approved the work';
COMMENT ON COLUMN work_orders.engineer_approved_at IS 'When engineer approved';
COMMENT ON COLUMN work_orders.engineer_notes IS 'Engineer approval notes';
COMMENT ON COLUMN work_orders.maintenance_manager_approved_by IS 'Maintenance manager who gave final approval';
COMMENT ON COLUMN work_orders.maintenance_manager_approved_at IS 'When maintenance manager gave final approval';
COMMENT ON COLUMN work_orders.maintenance_manager_notes IS 'Final approval notes from maintenance manager';