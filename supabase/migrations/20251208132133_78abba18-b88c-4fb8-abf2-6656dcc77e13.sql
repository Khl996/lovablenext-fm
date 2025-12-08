-- Fix the work_order_reject function to properly return work orders to the correct previous stage
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
  _new_status work_order_status;
BEGIN
  -- Get work order
  SELECT * INTO _work_order
  FROM work_orders
  WHERE id = _work_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work order not found';
  END IF;

  -- Determine new status and validate permissions based on rejection stage
  IF _rejection_stage = 'technician' THEN
    -- Technician rejects from in_progress -> returns to assigned (for supervisor to reassign)
    _new_status := 'assigned';
    
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
    -- Supervisor rejects from pending_supervisor_approval -> returns to in_progress (for technician to redo)
    _new_status := 'in_progress';
    
    -- Check supervisor permission
    SELECT has_permission_v2(auth.uid(), 'work_orders.approve', _work_order.hospital_id)
    INTO _has_supervisor_permission;

    IF NOT _has_supervisor_permission THEN
      RAISE EXCEPTION 'User does not have supervisor permission';
    END IF;

  ELSIF _rejection_stage = 'engineer' THEN
    -- Engineer rejects from pending_engineer_review -> returns to pending_supervisor_approval
    _new_status := 'pending_supervisor_approval';
    
    -- Check engineer permission
    SELECT has_permission_v2(auth.uid(), 'work_orders.review_as_engineer', _work_order.hospital_id)
    INTO _has_engineer_permission;

    IF NOT _has_engineer_permission THEN
      RAISE EXCEPTION 'User does not have engineer permission';
    END IF;

  ELSIF _rejection_stage = 'reporter' THEN
    -- Reporter rejects from pending_reporter_closure -> returns to pending_engineer_review
    _new_status := 'pending_engineer_review';
    
    -- Check if user is the reporter
    IF _work_order.reported_by != auth.uid() THEN
      RAISE EXCEPTION 'Only the reporter can reject at this stage';
    END IF;

  ELSE
    RAISE EXCEPTION 'Invalid rejection stage: %', _rejection_stage;
  END IF;

  -- Update work order with the new status and clear relevant timestamps
  UPDATE work_orders
  SET 
    status = _new_status,
    rejected_at = now(),
    rejected_by = auth.uid(),
    rejection_reason = _rejection_reason,
    rejection_stage = _rejection_stage,
    -- Clear timestamps based on rejection stage to allow re-execution
    start_time = CASE 
      WHEN _rejection_stage = 'technician' THEN NULL 
      ELSE start_time 
    END,
    technician_completed_at = CASE 
      WHEN _rejection_stage IN ('technician', 'supervisor') THEN NULL 
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
    technician_notes = CASE WHEN _rejection_stage = 'technician' THEN 'رفض: ' || _rejection_reason ELSE technician_notes END,
    supervisor_notes = CASE WHEN _rejection_stage = 'supervisor' THEN 'رفض: ' || _rejection_reason ELSE supervisor_notes END,
    engineer_notes = CASE WHEN _rejection_stage = 'engineer' THEN 'رفض: ' || _rejection_reason ELSE engineer_notes END,
    reporter_notes = CASE WHEN _rejection_stage = 'reporter' THEN 'رفض: ' || _rejection_reason ELSE reporter_notes END,
    updated_at = now()
  WHERE id = _work_order_id;
END;
$function$;