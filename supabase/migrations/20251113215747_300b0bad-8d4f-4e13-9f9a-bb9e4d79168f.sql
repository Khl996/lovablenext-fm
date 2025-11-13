-- Fix security warnings by setting search_path for functions

-- Update auto_close_pending_work_orders function with search_path
CREATE OR REPLACE FUNCTION public.auto_close_pending_work_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Update set_pending_closure_timestamp function with search_path
CREATE OR REPLACE FUNCTION public.set_pending_closure_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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