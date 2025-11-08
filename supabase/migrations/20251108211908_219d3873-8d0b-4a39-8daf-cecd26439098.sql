-- Create push notification tokens table
CREATE TABLE IF NOT EXISTS public.push_notification_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

-- Enable RLS
ALTER TABLE public.push_notification_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own tokens
CREATE POLICY "Users can view their own tokens"
  ON public.push_notification_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own tokens
CREATE POLICY "Users can insert their own tokens"
  ON public.push_notification_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own tokens
CREATE POLICY "Users can delete their own tokens"
  ON public.push_notification_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- Users can update their own tokens
CREATE POLICY "Users can update their own tokens"
  ON public.push_notification_tokens
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all tokens (for sending notifications)
CREATE POLICY "Admins can view all tokens"
  ON public.push_notification_tokens
  FOR SELECT
  USING (
    has_role(auth.uid(), 'global_admin'::app_role) OR
    has_role(auth.uid(), 'hospital_admin'::app_role) OR 
    has_role(auth.uid(), 'maintenance_manager'::app_role)
  );

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id
  ON public.push_notification_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_push_tokens_token
  ON public.push_notification_tokens(token);

-- Add updated_at trigger
CREATE TRIGGER update_push_notification_tokens_updated_at
  BEFORE UPDATE ON public.push_notification_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();