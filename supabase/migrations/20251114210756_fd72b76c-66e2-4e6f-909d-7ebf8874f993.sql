-- Add last_activity_at column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_activity_at timestamp with time zone DEFAULT now();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_last_activity 
ON public.profiles(last_activity_at);

-- Create function to update last activity
CREATE OR REPLACE FUNCTION public.update_last_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_activity_at = now()
  WHERE id = auth.uid();
  RETURN NEW;
END;
$$;

-- Create trigger to update last activity on work orders
CREATE TRIGGER update_user_activity_on_work_order
AFTER INSERT OR UPDATE ON public.work_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_last_activity();