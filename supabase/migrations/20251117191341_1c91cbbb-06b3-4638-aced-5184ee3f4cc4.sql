-- Create secure functions for work order approval workflow
-- These functions ensure proper permission checks at database level

-- 1. Function to start work (Technicians only)
CREATE OR REPLACE FUNCTION public.work_order_start_work(
  _work_order_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _work_order work_orders%ROWTYPE;
  _is_team_member boolean;
BEGIN
  -- Get work order
  SELECT * INTO _work_order
  FROM work_orders
  WHERE id = _work_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work order not found';
  END IF;

  -- Check if user is a member of the assigned team
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = _work_order.assigned_team
      AND user_id = auth.uid()
  ) INTO _is_team_member;

  IF NOT _is_team_member THEN
    RAISE EXCEPTION 'User is not a member of the assigned team';
  END IF;

  -- Check status
  IF _work_order.status NOT IN ('pending', 'assigned') THEN
    RAISE EXCEPTION 'Work order cannot be started in current status';
  END IF;

  IF _work_order.start_time IS NOT NULL THEN
    RAISE EXCEPTION 'Work has already been started';
  END IF;

  -- Update work order
  UPDATE work_orders
  SET 
    status = 'in_progress',
    start_time = now(),
    updated_at = now()
  WHERE id = _work_order_id;
END;
$$;

-- 2. Function to complete work (Technicians only)
CREATE OR REPLACE FUNCTION public.work_order_complete_work(
  _work_order_id uuid,
  _technician_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _work_order work_orders%ROWTYPE;
  _is_team_member boolean;
BEGIN
  -- Get work order
  SELECT * INTO _work_order
  FROM work_orders
  WHERE id = _work_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work order not found';
  END IF;

  -- Check if user is a member of the assigned team
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = _work_order.assigned_team
      AND user_id = auth.uid()
  ) INTO _is_team_member;

  IF NOT _is_team_member THEN
    RAISE EXCEPTION 'User is not a member of the assigned team';
  END IF;

  -- Check status
  IF _work_order.status != 'in_progress' THEN
    RAISE EXCEPTION 'Work order must be in progress';
  END IF;

  IF _work_order.technician_completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Work has already been completed';
  END IF;

  -- Update work order
  UPDATE work_orders
  SET 
    status = 'pending_supervisor_approval',
    technician_completed_at = now(),
    technician_notes = _technician_notes,
    updated_at = now()
  WHERE id = _work_order_id;
END;
$$;

-- 3. Function for supervisor approval (requires work_orders.approve permission)
CREATE OR REPLACE FUNCTION public.work_order_supervisor_approve(
  _work_order_id uuid,
  _supervisor_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Check permission
  SELECT has_permission_v2(auth.uid(), 'work_orders.approve', _work_order.hospital_id)
  INTO _has_permission;

  IF NOT _has_permission THEN
    RAISE EXCEPTION 'User does not have permission to approve work orders';
  END IF;

  -- Check status
  IF _work_order.status != 'pending_supervisor_approval' THEN
    RAISE EXCEPTION 'Work order is not pending supervisor approval';
  END IF;

  IF _work_order.technician_completed_at IS NULL THEN
    RAISE EXCEPTION 'Work must be completed by technician first';
  END IF;

  IF _work_order.supervisor_approved_at IS NOT NULL THEN
    RAISE EXCEPTION 'Already approved by supervisor';
  END IF;

  -- Update work order
  UPDATE work_orders
  SET 
    status = 'pending_engineer_review',
    supervisor_approved_at = now(),
    supervisor_approved_by = auth.uid(),
    supervisor_notes = _supervisor_notes,
    updated_at = now()
  WHERE id = _work_order_id;
END;
$$;

-- 4. Function for engineer review (requires work_orders.review_as_engineer permission)
CREATE OR REPLACE FUNCTION public.work_order_engineer_review(
  _work_order_id uuid,
  _engineer_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Check permission
  SELECT has_permission_v2(auth.uid(), 'work_orders.review_as_engineer', _work_order.hospital_id)
  INTO _has_permission;

  IF NOT _has_permission THEN
    RAISE EXCEPTION 'User does not have permission to review as engineer';
  END IF;

  -- Check status
  IF _work_order.status != 'pending_engineer_review' THEN
    RAISE EXCEPTION 'Work order is not pending engineer review';
  END IF;

  IF _work_order.supervisor_approved_at IS NULL THEN
    RAISE EXCEPTION 'Must be approved by supervisor first';
  END IF;

  IF _work_order.engineer_approved_at IS NOT NULL THEN
    RAISE EXCEPTION 'Already reviewed by engineer';
  END IF;

  -- Update work order
  UPDATE work_orders
  SET 
    status = 'pending_reporter_closure',
    engineer_approved_at = now(),
    engineer_approved_by = auth.uid(),
    engineer_notes = _engineer_notes,
    pending_closure_since = now(),
    updated_at = now()
  WHERE id = _work_order_id;
END;
$$;

-- 5. Function for reporter closure (only the reporter)
CREATE OR REPLACE FUNCTION public.work_order_reporter_closure(
  _work_order_id uuid,
  _reporter_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _work_order work_orders%ROWTYPE;
BEGIN
  -- Get work order
  SELECT * INTO _work_order
  FROM work_orders
  WHERE id = _work_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work order not found';
  END IF;

  -- Check if user is the reporter
  IF _work_order.reported_by != auth.uid() THEN
    RAISE EXCEPTION 'Only the reporter can close the work order';
  END IF;

  -- Check status
  IF _work_order.status != 'pending_reporter_closure' THEN
    RAISE EXCEPTION 'Work order is not pending reporter closure';
  END IF;

  IF _work_order.engineer_approved_at IS NULL THEN
    RAISE EXCEPTION 'Must be reviewed by engineer first';
  END IF;

  IF _work_order.customer_reviewed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Already closed by reporter';
  END IF;

  -- Update work order
  UPDATE work_orders
  SET 
    status = 'completed',
    customer_reviewed_at = now(),
    customer_reviewed_by = auth.uid(),
    reporter_notes = _reporter_notes,
    pending_closure_since = NULL,
    updated_at = now()
  WHERE id = _work_order_id;
END;
$$;

-- 6. Function for final approval (requires work_orders.final_approve permission)
CREATE OR REPLACE FUNCTION public.work_order_final_approve(
  _work_order_id uuid,
  _manager_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Check permission
  SELECT has_permission_v2(auth.uid(), 'work_orders.final_approve', _work_order.hospital_id)
  INTO _has_permission;

  IF NOT _has_permission THEN
    RAISE EXCEPTION 'User does not have permission for final approval';
  END IF;

  -- Check status
  IF _work_order.status NOT IN ('completed', 'auto_closed') THEN
    RAISE EXCEPTION 'Work order must be completed or auto-closed';
  END IF;

  IF _work_order.customer_reviewed_at IS NULL AND _work_order.auto_closed_at IS NULL THEN
    RAISE EXCEPTION 'Must be closed by reporter or auto-closed first';
  END IF;

  IF _work_order.maintenance_manager_approved_at IS NOT NULL THEN
    RAISE EXCEPTION 'Already approved by maintenance manager';
  END IF;

  -- Update work order
  UPDATE work_orders
  SET 
    maintenance_manager_approved_at = now(),
    maintenance_manager_approved_by = auth.uid(),
    maintenance_manager_notes = _manager_notes,
    updated_at = now()
  WHERE id = _work_order_id;
END;
$$;

-- 7. Function to reject work order (at any stage)
CREATE OR REPLACE FUNCTION public.work_order_reject(
  _work_order_id uuid,
  _rejection_reason text,
  _rejection_stage text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  ELSE
    RAISE EXCEPTION 'Invalid rejection stage';
  END IF;

  -- Update work order
  UPDATE work_orders
  SET 
    status = _previous_status::work_order_status,
    rejected_at = now(),
    rejected_by = auth.uid(),
    rejection_reason = _rejection_reason,
    rejection_stage = _rejection_stage,
    technician_notes = CASE WHEN _rejection_stage = 'technician' THEN _rejection_reason ELSE technician_notes END,
    supervisor_notes = CASE WHEN _rejection_stage = 'supervisor' THEN _rejection_reason ELSE supervisor_notes END,
    engineer_notes = CASE WHEN _rejection_stage = 'engineer' THEN _rejection_reason ELSE engineer_notes END,
    updated_at = now()
  WHERE id = _work_order_id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.work_order_start_work(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.work_order_complete_work(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.work_order_supervisor_approve(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.work_order_engineer_review(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.work_order_reporter_closure(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.work_order_final_approve(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.work_order_reject(uuid, text, text) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.work_order_start_work IS 'Securely start work on a work order - checks team membership';
COMMENT ON FUNCTION public.work_order_complete_work IS 'Securely complete work - checks team membership';
COMMENT ON FUNCTION public.work_order_supervisor_approve IS 'Securely approve as supervisor - checks work_orders.approve permission';
COMMENT ON FUNCTION public.work_order_engineer_review IS 'Securely review as engineer - checks work_orders.review_as_engineer permission';
COMMENT ON FUNCTION public.work_order_reporter_closure IS 'Securely close by reporter - checks reporter identity';
COMMENT ON FUNCTION public.work_order_final_approve IS 'Securely final approve - checks work_orders.final_approve permission';
COMMENT ON FUNCTION public.work_order_reject IS 'Securely reject work order - checks appropriate permissions based on stage';