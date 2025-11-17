-- Fix remaining search_path warnings for all functions

-- Update all work order workflow functions
ALTER FUNCTION public.work_order_start_work SET search_path = public;
ALTER FUNCTION public.work_order_complete_work SET search_path = public;
ALTER FUNCTION public.work_order_supervisor_approve SET search_path = public;
ALTER FUNCTION public.work_order_engineer_review SET search_path = public;
ALTER FUNCTION public.work_order_reporter_closure SET search_path = public;
ALTER FUNCTION public.work_order_final_approve SET search_path = public;
ALTER FUNCTION public.work_order_reject SET search_path = public;

-- Update utility functions
ALTER FUNCTION public.auto_close_pending_work_orders SET search_path = public;
ALTER FUNCTION public.delete_user SET search_path = public;

-- Update trigger functions
ALTER FUNCTION public.handle_new_user SET search_path = public;
ALTER FUNCTION public.handle_updated_at SET search_path = public;
ALTER FUNCTION public.set_pending_closure_timestamp SET search_path = public;
ALTER FUNCTION public.update_last_activity SET search_path = public;

-- Update new security functions
ALTER FUNCTION public.get_user_contact_info SET search_path = public;
ALTER FUNCTION public.get_asset_financial_info SET search_path = public;
ALTER FUNCTION public.get_work_order_feedback SET search_path = public;