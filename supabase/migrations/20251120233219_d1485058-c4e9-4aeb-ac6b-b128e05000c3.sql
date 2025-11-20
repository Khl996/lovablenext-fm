-- Create trigger to automatically log work order status changes
CREATE OR REPLACE FUNCTION log_work_order_changes()
RETURNS TRIGGER AS $$
DECLARE
  _performed_by_name TEXT;
  _hospital_id UUID;
  _asset_name TEXT;
  _log_description TEXT;
  _log_type operation_type;
BEGIN
  -- Get hospital_id and asset info
  _hospital_id := NEW.hospital_id;
  
  IF NEW.asset_id IS NOT NULL THEN
    SELECT name INTO _asset_name FROM assets WHERE id = NEW.asset_id;
  ELSE
    _asset_name := 'N/A';
  END IF;

  -- Get performer name based on who made the change
  IF NEW.status != OLD.status THEN
    -- Determine who performed the action based on status change
    IF NEW.status = 'in_progress' AND NEW.start_time IS NOT NULL THEN
      -- Work started by technician
      SELECT full_name INTO _performed_by_name FROM profiles WHERE id = auth.uid();
      _log_description := 'Work started on maintenance report ' || NEW.code;
      _log_type := 'maintenance';
      
    ELSIF NEW.status = 'pending_supervisor_approval' AND NEW.technician_completed_at IS NOT NULL THEN
      -- Work completed by technician
      SELECT full_name INTO _performed_by_name FROM profiles WHERE id = auth.uid();
      _log_description := 'Work completed on maintenance report ' || NEW.code;
      _log_type := 'maintenance';
      
    ELSIF NEW.status = 'pending_engineer_review' AND NEW.supervisor_approved_at IS NOT NULL THEN
      -- Supervisor approved
      SELECT full_name INTO _performed_by_name FROM profiles WHERE id = NEW.supervisor_approved_by;
      _log_description := 'Supervisor approved maintenance report ' || NEW.code;
      _log_type := 'maintenance';
      
    ELSIF NEW.status = 'pending_reporter_closure' AND NEW.engineer_approved_at IS NOT NULL THEN
      -- Engineer approved
      SELECT full_name INTO _performed_by_name FROM profiles WHERE id = NEW.engineer_approved_by;
      _log_description := 'Engineer approved maintenance report ' || NEW.code;
      _log_type := 'maintenance';
      
    ELSIF NEW.status = 'completed' AND NEW.customer_reviewed_at IS NOT NULL THEN
      -- Reporter closed
      SELECT full_name INTO _performed_by_name FROM profiles WHERE id = NEW.customer_reviewed_by;
      _log_description := 'Reporter closed maintenance report ' || NEW.code;
      _log_type := 'maintenance';
      
    ELSIF NEW.status = 'auto_closed' THEN
      -- Auto closed
      _performed_by_name := 'System';
      _log_description := 'Maintenance report ' || NEW.code || ' was automatically closed';
      _log_type := 'maintenance';
      
    ELSIF OLD.status IN ('assigned', 'in_progress', 'pending_supervisor_approval') AND 
          (NEW.rejected_at IS NOT NULL OR NEW.rejection_reason IS NOT NULL) THEN
      -- Rejected
      SELECT full_name INTO _performed_by_name FROM profiles WHERE id = NEW.rejected_by;
      _log_description := 'Maintenance report ' || NEW.code || ' was rejected at stage: ' || COALESCE(NEW.rejection_stage, 'unknown');
      _log_type := 'maintenance';
      
    ELSE
      -- Generic status change
      SELECT full_name INTO _performed_by_name FROM profiles WHERE id = auth.uid();
      _log_description := 'Status changed from ' || OLD.status || ' to ' || NEW.status || ' for maintenance report ' || NEW.code;
      _log_type := 'maintenance';
    END IF;

    -- Insert log entry
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
      COALESCE(auth.uid(), NEW.reported_by),
      COALESCE(_performed_by_name, 'Unknown'),
      NEW.id,
      now(),
      'completed'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS work_order_status_change_logger ON work_orders;

-- Create trigger
CREATE TRIGGER work_order_status_change_logger
  AFTER UPDATE ON work_orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_work_order_changes();