-- Update log_work_order_status_change to better handle rejections
CREATE OR REPLACE FUNCTION public.log_work_order_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _performed_by_name TEXT;
  _hospital_id UUID;
  _asset_name TEXT;
  _log_description TEXT;
  _log_type operation_type := 'maintenance';
  _actor_id UUID;
  _rejection_stage_ar TEXT;
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

  -- Determine actor and description based on status
  CASE NEW.status
    WHEN 'in_progress' THEN
      SELECT full_name INTO _performed_by_name FROM profiles WHERE id = _actor_id;
      _log_description := 'Work started';
      
    WHEN 'pending_supervisor_approval' THEN
      SELECT full_name INTO _performed_by_name FROM profiles WHERE id = _actor_id;
      _log_description := 'Work completed by technician';
      
    WHEN 'pending_engineer_review' THEN
      -- Check if this is a rejection from reporter or normal flow
      IF NEW.rejected_at IS NOT NULL AND NEW.rejected_at != OLD.rejected_at THEN
        SELECT full_name INTO _performed_by_name FROM profiles WHERE id = NEW.rejected_by;
        _log_description := 'Rejected by reporter - returned to engineer for review. Reason: ' || COALESCE(NEW.reporter_notes, 'No reason provided');
      ELSE
        SELECT full_name INTO _performed_by_name FROM profiles WHERE id = COALESCE(NEW.supervisor_approved_by, _actor_id);
        _log_description := 'Approved by supervisor';
      END IF;
      
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
      
    WHEN 'assigned' THEN
      -- Check if this is a rejection from technician
      IF NEW.rejected_at IS NOT NULL AND (OLD.rejected_at IS NULL OR NEW.rejected_at != OLD.rejected_at) THEN
        SELECT full_name INTO _performed_by_name FROM profiles WHERE id = NEW.rejected_by;
        _log_description := 'Rejected by technician - returned to supervisor for reassignment. Reason: ' || COALESCE(NEW.technician_notes, 'No reason provided');
      ELSE
        _log_description := 'Work order assigned';
        SELECT full_name INTO _performed_by_name FROM profiles WHERE id = _actor_id;
      END IF;
      
    WHEN 'pending_supervisor_approval' THEN
      -- Check if this is a rejection from engineer
      IF NEW.rejected_at IS NOT NULL AND (OLD.rejected_at IS NULL OR NEW.rejected_at != OLD.rejected_at) THEN
        SELECT full_name INTO _performed_by_name FROM profiles WHERE id = NEW.rejected_by;
        _log_description := 'Rejected by engineer - returned to supervisor. Reason: ' || COALESCE(NEW.engineer_notes, 'No reason provided');
      END IF;
      
    ELSE
      SELECT full_name INTO _performed_by_name FROM profiles WHERE id = _actor_id;
      _log_description := 'Status changed: ' || OLD.status::text || ' → ' || NEW.status::text;
  END CASE;

  -- Special handling for rejections that change to in_progress (supervisor rejection)
  IF NEW.status = 'in_progress' AND OLD.status = 'pending_supervisor_approval' 
     AND NEW.rejected_at IS NOT NULL AND (OLD.rejected_at IS NULL OR NEW.rejected_at != OLD.rejected_at) THEN
    SELECT full_name INTO _performed_by_name FROM profiles WHERE id = NEW.rejected_by;
    _log_description := 'Rejected by supervisor - returned to technician for rework. Reason: ' || COALESCE(NEW.supervisor_notes, 'No reason provided');
  END IF;

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
      'LOG-' || NEW.code || '-' || substring(gen_random_uuid()::text, 1, 8),
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
$function$;

-- Ensure trigger exists on work_orders
DROP TRIGGER IF EXISTS work_order_status_change_trigger ON work_orders;
CREATE TRIGGER work_order_status_change_trigger
  AFTER UPDATE ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION log_work_order_status_change();