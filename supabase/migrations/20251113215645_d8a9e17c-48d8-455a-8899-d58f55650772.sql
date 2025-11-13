-- Add new statuses to work_order_status enum
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'pending_supervisor_approval';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'pending_engineer_review';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'pending_reporter_closure';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'rejected_by_technician';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'auto_closed';

-- Add new columns for reporter notes and auto-close tracking
ALTER TABLE public.work_orders
ADD COLUMN IF NOT EXISTS reporter_notes TEXT,
ADD COLUMN IF NOT EXISTS auto_closed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pending_closure_since TIMESTAMP WITH TIME ZONE;

-- Create function to auto-close work orders after 24 hours
CREATE OR REPLACE FUNCTION public.auto_close_pending_work_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.work_orders
  SET 
    status = 'auto_closed',
    auto_closed_at = now(),
    updated_at = now()
  WHERE 
    status = 'pending_reporter_closure'
    AND pending_closure_since IS NOT NULL
    AND pending_closure_since < (now() - interval '24 hours');
END;
$$;

-- Create trigger to set pending_closure_since when status changes to pending_reporter_closure
CREATE OR REPLACE FUNCTION public.set_pending_closure_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'pending_reporter_closure' AND OLD.status != 'pending_reporter_closure' THEN
    NEW.pending_closure_since = now();
  END IF;
  
  IF NEW.status != 'pending_reporter_closure' THEN
    NEW.pending_closure_since = NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_pending_closure_timestamp_trigger ON public.work_orders;
CREATE TRIGGER set_pending_closure_timestamp_trigger
BEFORE UPDATE ON public.work_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_pending_closure_timestamp();