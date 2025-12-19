-- Function to cancel a work order (from rejected_by_technician status)
CREATE OR REPLACE FUNCTION public.work_order_cancel(
  _work_order_id UUID,
  _reason TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_status work_order_status;
  _hospital_id UUID;
BEGIN
  -- Get current status and hospital_id
  SELECT status, hospital_id INTO _current_status, _hospital_id
  FROM work_orders
  WHERE id = _work_order_id;

  IF _current_status IS NULL THEN
    RAISE EXCEPTION 'Work order not found';
  END IF;

  -- Only allow cancellation from specific statuses
  IF _current_status NOT IN ('rejected_by_technician', 'pending', 'assigned') THEN
    RAISE EXCEPTION 'Cannot cancel work order from current status: %', _current_status;
  END IF;

  -- Update work order status to cancelled
  UPDATE work_orders
  SET 
    status = 'cancelled',
    cancellation_reason = _reason,
    cancelled_at = NOW(),
    cancelled_by = auth.uid(),
    updated_at = NOW()
  WHERE id = _work_order_id;

  -- Add update log
  INSERT INTO work_order_updates (work_order_id, user_id, update_type, message)
  VALUES (
    _work_order_id, 
    auth.uid(), 
    'status_change', 
    'تم إلغاء أمر العمل: ' || _reason
  );
END;
$$;

-- Function to return work order to pending for redistribution
CREATE OR REPLACE FUNCTION public.work_order_return_to_pending(
  _work_order_id UUID,
  _reason TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_status work_order_status;
  _hospital_id UUID;
BEGIN
  -- Get current status and hospital_id
  SELECT status, hospital_id INTO _current_status, _hospital_id
  FROM work_orders
  WHERE id = _work_order_id;

  IF _current_status IS NULL THEN
    RAISE EXCEPTION 'Work order not found';
  END IF;

  -- Only allow from rejected_by_technician status
  IF _current_status != 'rejected_by_technician' THEN
    RAISE EXCEPTION 'Can only return to pending from rejected_by_technician status';
  END IF;

  -- Update work order status to pending and clear assignment
  UPDATE work_orders
  SET 
    status = 'pending',
    assigned_team = NULL,
    reassignment_count = COALESCE(reassignment_count, 0) + 1,
    last_reassigned_at = NOW(),
    last_reassigned_by = auth.uid(),
    reassignment_reason = _reason,
    updated_at = NOW()
  WHERE id = _work_order_id;

  -- Add update log
  INSERT INTO work_order_updates (work_order_id, user_id, update_type, message)
  VALUES (
    _work_order_id, 
    auth.uid(), 
    'status_change', 
    'تم إعادة أمر العمل للتوزيع التلقائي: ' || _reason
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.work_order_cancel TO authenticated;
GRANT EXECUTE ON FUNCTION public.work_order_return_to_pending TO authenticated;