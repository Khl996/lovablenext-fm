
-- Update work_order_reject function to clear timestamps on rejection
CREATE OR REPLACE FUNCTION public.work_order_reject(_work_order_id uuid, _rejection_reason text, _rejection_stage text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _work_order work_orders%ROWTYPE;
  _is_team_member boolean;
  _has_supervisor_permission boolean;
  _has_engineer_permission boolean;
  _previous_status text;
BEGIN
  -- Get work order
  SELECT * INTO _work_order
  FROM work_orders
  WHERE id = _work_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work order not found';
  END IF;

  -- Determine previous status based on rejection stage
  IF _rejection_stage = 'technician' THEN
    _previous_status := 'assigned';
    
    -- Check if user is team member
    SELECT EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = _work_order.assigned_team
        AND user_id = auth.uid()
    ) INTO _is_team_member;

    IF NOT _is_team_member THEN
      RAISE EXCEPTION 'User is not a member of the assigned team';
    END IF;

  ELSIF _rejection_stage = 'supervisor' THEN
    _previous_status := 'in_progress';
    
    -- Check supervisor permission
    SELECT has_permission_v2(auth.uid(), 'work_orders.approve', _work_order.hospital_id)
    INTO _has_supervisor_permission;

    IF NOT _has_supervisor_permission THEN
      RAISE EXCEPTION 'User does not have supervisor permission';
    END IF;

  ELSIF _rejection_stage = 'engineer' THEN
    _previous_status := 'pending_supervisor_approval';
    
    -- Check engineer permission
    SELECT has_permission_v2(auth.uid(), 'work_orders.review_as_engineer', _work_order.hospital_id)
    INTO _has_engineer_permission;

    IF NOT _has_engineer_permission THEN
      RAISE EXCEPTION 'User does not have engineer permission';
    END IF;

  ELSIF _rejection_stage = 'reporter' THEN
    _previous_status := 'pending_engineer_review';
    
    -- Check if user is the reporter
    IF _work_order.reported_by != auth.uid() THEN
      RAISE EXCEPTION 'Only the reporter can reject at this stage';
    END IF;

  ELSE
    RAISE EXCEPTION 'Invalid rejection stage';
  END IF;

  -- Update work order with proper timestamp clearing
  UPDATE work_orders
  SET 
    status = _previous_status::work_order_status,
    rejected_at = now(),
    rejected_by = auth.uid(),
    rejection_reason = _rejection_reason,
    rejection_stage = _rejection_stage,
    -- Clear timestamps based on rejection stage to allow re-execution
    technician_completed_at = CASE 
      WHEN _rejection_stage IN ('supervisor', 'engineer', 'reporter') THEN NULL 
      ELSE technician_completed_at 
    END,
    supervisor_approved_at = CASE 
      WHEN _rejection_stage IN ('engineer', 'reporter') THEN NULL 
      ELSE supervisor_approved_at 
    END,
    engineer_approved_at = CASE 
      WHEN _rejection_stage = 'reporter' THEN NULL 
      ELSE engineer_approved_at 
    END,
    pending_closure_since = NULL,
    -- Store rejection reason in appropriate notes field
    technician_notes = CASE WHEN _rejection_stage = 'technician' THEN _rejection_reason ELSE technician_notes END,
    supervisor_notes = CASE WHEN _rejection_stage = 'supervisor' THEN _rejection_reason ELSE supervisor_notes END,
    engineer_notes = CASE WHEN _rejection_stage = 'engineer' THEN _rejection_reason ELSE engineer_notes END,
    reporter_notes = CASE WHEN _rejection_stage = 'reporter' THEN _rejection_reason ELSE reporter_notes END,
    updated_at = now()
  WHERE id = _work_order_id;
END;
$function$;

-- Add function for maintenance manager to add notes at any stage
CREATE OR REPLACE FUNCTION public.work_order_add_manager_notes(_work_order_id uuid, _manager_notes text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _work_order work_orders%ROWTYPE;
  _has_permission boolean;
BEGIN
  -- Get work order
  SELECT * INTO _work_order
  FROM work_orders
  WHERE id = _work_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work order not found';
  END IF;

  -- Check permission - maintenance manager, facility manager, or hospital admin
  SELECT has_permission_v2(auth.uid(), 'work_orders.final_approve', _work_order.hospital_id)
  INTO _has_permission;

  IF NOT _has_permission THEN
    RAISE EXCEPTION 'User does not have permission to add manager notes';
  END IF;

  -- Update work order with manager notes
  UPDATE work_orders
  SET 
    maintenance_manager_notes = COALESCE(maintenance_manager_notes || E'\n---\n', '') || 
      to_char(now(), 'YYYY-MM-DD HH24:MI') || ': ' || _manager_notes,
    updated_at = now()
  WHERE id = _work_order_id;
END;
$function$;
