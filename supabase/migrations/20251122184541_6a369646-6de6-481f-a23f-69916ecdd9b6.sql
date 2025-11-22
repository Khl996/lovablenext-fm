-- Fix function search path security issue
-- Add search_path to validate_work_order_transition function

CREATE OR REPLACE FUNCTION public.validate_work_order_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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