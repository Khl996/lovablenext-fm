-- Allow operations_log.performed_by to be nullable to avoid failures
-- when system actions (like deleting users) cannot reliably provide a performer id.
ALTER TABLE public.operations_log
ALTER COLUMN performed_by DROP NOT NULL;