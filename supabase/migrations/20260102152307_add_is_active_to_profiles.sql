/*
  # Add is_active column to profiles table
  
  1. Changes
    - Add `is_active` column to `profiles` table
    - Set default value to `true` for existing users
    - Allow administrators to activate/deactivate user accounts
  
  2. Notes
    - Existing users will have `is_active = true` by default
    - New users will also be active by default
*/

-- Add is_active column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_active boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- Update existing records to be active
UPDATE profiles SET is_active = true WHERE is_active IS NULL;