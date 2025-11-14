-- Update foreign key constraints to SET NULL instead of CASCADE for user references in work_orders
-- This allows deleting users without losing work order history

-- Drop existing constraints
ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_reported_by_fkey;
ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_assigned_to_fkey;
ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_reviewed_by_fkey;
ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_engineer_approved_by_fkey;
ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_supervisor_approved_by_fkey;
ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_maintenance_manager_approved_by_fkey;
ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_customer_reviewed_by_fkey;
ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_redirected_by_fkey;

-- Add new constraints with ON DELETE SET NULL
ALTER TABLE work_orders 
  ADD CONSTRAINT work_orders_reported_by_fkey 
  FOREIGN KEY (reported_by) REFERENCES auth.users(id) 
  ON DELETE SET NULL;

ALTER TABLE work_orders 
  ADD CONSTRAINT work_orders_assigned_to_fkey 
  FOREIGN KEY (assigned_to) REFERENCES auth.users(id) 
  ON DELETE SET NULL;

ALTER TABLE work_orders 
  ADD CONSTRAINT work_orders_reviewed_by_fkey 
  FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) 
  ON DELETE SET NULL;

ALTER TABLE work_orders 
  ADD CONSTRAINT work_orders_engineer_approved_by_fkey 
  FOREIGN KEY (engineer_approved_by) REFERENCES auth.users(id) 
  ON DELETE SET NULL;

ALTER TABLE work_orders 
  ADD CONSTRAINT work_orders_supervisor_approved_by_fkey 
  FOREIGN KEY (supervisor_approved_by) REFERENCES auth.users(id) 
  ON DELETE SET NULL;

ALTER TABLE work_orders 
  ADD CONSTRAINT work_orders_maintenance_manager_approved_by_fkey 
  FOREIGN KEY (maintenance_manager_approved_by) REFERENCES auth.users(id) 
  ON DELETE SET NULL;

ALTER TABLE work_orders 
  ADD CONSTRAINT work_orders_customer_reviewed_by_fkey 
  FOREIGN KEY (customer_reviewed_by) REFERENCES auth.users(id) 
  ON DELETE SET NULL;

ALTER TABLE work_orders 
  ADD CONSTRAINT work_orders_redirected_by_fkey 
  FOREIGN KEY (redirected_by) REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- Update operations_log foreign keys
ALTER TABLE operations_log DROP CONSTRAINT IF EXISTS operations_log_performed_by_fkey;
ALTER TABLE operations_log DROP CONSTRAINT IF EXISTS operations_log_approved_by_fkey;

ALTER TABLE operations_log 
  ADD CONSTRAINT operations_log_performed_by_fkey 
  FOREIGN KEY (performed_by) REFERENCES auth.users(id) 
  ON DELETE SET NULL;

ALTER TABLE operations_log 
  ADD CONSTRAINT operations_log_approved_by_fkey 
  FOREIGN KEY (approved_by) REFERENCES auth.users(id) 
  ON DELETE SET NULL;