-- ============================================
-- Phase 1: Critical Security & Automation Fixes
-- ============================================

-- 1. Enhance work_order_changes trigger for automatic logging
-- This ensures ALL state changes are logged automatically
CREATE OR REPLACE FUNCTION public.log_work_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _performed_by_name TEXT;
  _hospital_id UUID;
  _asset_name TEXT;
  _log_description TEXT;
  _log_type operation_type := 'maintenance';
  _actor_id UUID;
BEGIN
  -- Only log status changes
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  _hospital_id := NEW.hospital_id;
  _actor_id := COALESCE(auth.uid(), NEW.reported_by);
  
  -- Get asset name
  IF NEW.asset_id IS NOT NULL THEN
    SELECT name INTO _asset_name FROM assets WHERE id = NEW.asset_id;
  ELSE
    _asset_name := 'N/A';
  END IF;

  -- Determine actor based on status
  CASE NEW.status
    WHEN 'in_progress' THEN
      SELECT full_name INTO _performed_by_name FROM profiles WHERE id = _actor_id;
      _log_description := 'Work started';
    WHEN 'pending_supervisor_approval' THEN
      SELECT full_name INTO _performed_by_name FROM profiles WHERE id = _actor_id;
      _log_description := 'Work completed by technician';
    WHEN 'pending_engineer_review' THEN
      SELECT full_name INTO _performed_by_name FROM profiles WHERE id = COALESCE(NEW.supervisor_approved_by, _actor_id);
      _log_description := 'Approved by supervisor';
    WHEN 'pending_reporter_closure' THEN
      SELECT full_name INTO _performed_by_name FROM profiles WHERE id = COALESCE(NEW.engineer_approved_by, _actor_id);
      _log_description := 'Reviewed by engineer';
    WHEN 'completed' THEN
      IF NEW.customer_reviewed_at IS NOT NULL THEN
        SELECT full_name INTO _performed_by_name FROM profiles WHERE id = COALESCE(NEW.customer_reviewed_by, _actor_id);
        _log_description := 'Closed by reporter';
      END IF;
    WHEN 'auto_closed' THEN
      _performed_by_name := 'System';
      _log_description := 'Automatically closed after 24 hours';
    WHEN 'assigned', 'in_progress', 'pending_supervisor_approval', 'pending_engineer_review' THEN
      IF NEW.rejected_at IS NOT NULL AND OLD.rejected_at IS NULL THEN
        SELECT full_name INTO _performed_by_name FROM profiles WHERE id = COALESCE(NEW.rejected_by, _actor_id);
        _log_description := 'Rejected at stage: ' || COALESCE(NEW.rejection_stage, OLD.status::text);
      END IF;
    ELSE
      SELECT full_name INTO _performed_by_name FROM profiles WHERE id = _actor_id;
      _log_description := 'Status changed: ' || OLD.status::text || ' → ' || NEW.status::text;
  END CASE;

  -- Insert log entry only if we have a description
  IF _log_description IS NOT NULL THEN
    INSERT INTO operations_log (
      code,
      hospital_id,
      type,
      asset_name,
      system_type,
      location,
      reason,
      description,
      performed_by,
      technician_name,
      related_work_order,
      timestamp,
      status
    ) VALUES (
      'LOG-' || NEW.code || '-' || to_char(now(), 'YYYYMMDDHH24MISS'),
      _hospital_id,
      _log_type,
      _asset_name,
      COALESCE(NEW.issue_type, 'General Maintenance'),
      COALESCE(
        (SELECT name FROM buildings WHERE id = NEW.building_id),
        'Not specified'
      ),
      COALESCE(NEW.description, 'Status change'),
      _log_description,
      _actor_id,
      COALESCE(_performed_by_name, 'Unknown'),
      NEW.id,
      now(),
      'completed'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Drop old trigger if exists and create new one
DROP TRIGGER IF EXISTS log_work_order_changes ON work_orders;
CREATE TRIGGER log_work_order_status_changes
  AFTER UPDATE ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION log_work_order_status_change();

-- 2. Add indexes for better permission query performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_code ON role_permissions(role_code) WHERE role_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role) WHERE role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_key ON role_permissions(permission_key);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_key ON user_permissions(permission_key);
CREATE INDEX IF NOT EXISTS idx_user_custom_roles_user_id ON user_custom_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_roles_role_code ON user_custom_roles(role_code);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- 3. Add indexes for work order queries
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_team ON work_orders(assigned_team);
CREATE INDEX IF NOT EXISTS idx_work_orders_reported_by ON work_orders(reported_by);
CREATE INDEX IF NOT EXISTS idx_work_orders_hospital_id ON work_orders(hospital_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_at ON work_orders(created_at DESC);

-- 4. Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_work_orders_hospital_status ON work_orders(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_team_status ON work_orders(assigned_team, status);

-- 5. Enhance RLS for work orders - Team member access
-- Team members can only see work orders assigned to their team
CREATE POLICY "Team members can view their team's work orders"
ON work_orders
FOR SELECT
USING (
  hospital_id = get_user_hospital(auth.uid())
  AND (
    -- Reporter can see their own
    reported_by = auth.uid()
    -- Team members can see team's work orders
    OR EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = work_orders.assigned_team
      AND user_id = auth.uid()
    )
    -- Managers can see all
    OR has_permission_v2(auth.uid(), 'view_work_orders', hospital_id)
  )
);

-- 6. Create function to check if user is team member
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = _user_id AND team_id = _team_id
  )
$$;

-- 7. Add validation trigger for work order state transitions
CREATE OR REPLACE FUNCTION public.validate_work_order_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Prevent invalid status transitions
  IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
    RAISE EXCEPTION 'Cannot change status of completed work order';
  END IF;

  IF OLD.status = 'cancelled' AND NEW.status != 'cancelled' THEN
    RAISE EXCEPTION 'Cannot change status of cancelled work order';
  END IF;

  -- Ensure required fields are set for specific statuses
  IF NEW.status = 'pending_supervisor_approval' AND NEW.technician_completed_at IS NULL THEN
    RAISE EXCEPTION 'technician_completed_at must be set before supervisor approval';
  END IF;

  IF NEW.status = 'pending_engineer_review' AND NEW.supervisor_approved_at IS NULL THEN
    RAISE EXCEPTION 'supervisor_approved_at must be set before engineer review';
  END IF;

  IF NEW.status = 'pending_reporter_closure' AND NEW.engineer_approved_at IS NULL THEN
    RAISE EXCEPTION 'engineer_approved_at must be set before reporter closure';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_work_order_status_transition ON work_orders;
CREATE TRIGGER validate_work_order_status_transition
  BEFORE UPDATE ON work_orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION validate_work_order_transition();

-- 8. Add comment for documentation
COMMENT ON FUNCTION log_work_order_status_change IS 'Automatically logs all work order status changes';
COMMENT ON FUNCTION validate_work_order_transition IS 'Validates work order state transitions';
COMMENT ON FUNCTION is_team_member IS 'Checks if a user is a member of a specific team';