-- Create work_order_updates table for tracking notes and updates
CREATE TABLE IF NOT EXISTS public.work_order_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  update_type TEXT NOT NULL CHECK (update_type IN ('note', 'delay', 'progress', 'issue')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_internal BOOLEAN DEFAULT false
);

-- Enable RLS on work_order_updates
ALTER TABLE public.work_order_updates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view updates for work orders in their hospital
CREATE POLICY "Users can view updates in their hospital"
ON public.work_order_updates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.work_orders
    WHERE work_orders.id = work_order_updates.work_order_id
    AND work_orders.hospital_id = get_user_hospital(auth.uid())
  )
);

-- Policy: Users can insert updates for work orders they're involved in
CREATE POLICY "Users can add updates to their work orders"
ON public.work_order_updates
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.work_orders
    WHERE work_orders.id = work_order_updates.work_order_id
    AND work_orders.hospital_id = get_user_hospital(auth.uid())
  )
);

-- Add rejection tracking columns to work_orders
ALTER TABLE public.work_orders
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejected_by UUID,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejection_stage TEXT,
ADD COLUMN IF NOT EXISTS reassignment_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reassigned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_reassigned_by UUID,
ADD COLUMN IF NOT EXISTS reassignment_reason TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_work_order_updates_work_order_id ON public.work_order_updates(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_updates_created_at ON public.work_order_updates(created_at DESC);

-- Add new status for reassignment
COMMENT ON COLUMN public.work_orders.status IS 'Work order status: pending, assigned, in_progress, needs_redirection, pending_supervisor_approval, pending_engineer_review, pending_reporter_closure, rejected_by_technician, auto_closed, completed, cancelled';