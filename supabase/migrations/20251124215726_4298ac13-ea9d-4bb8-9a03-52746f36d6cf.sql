-- Add shift start and end time columns to teams table
ALTER TABLE public.teams 
ADD COLUMN shift_start time,
ADD COLUMN shift_end time;