-- This SQL creates the first platform owner account
-- Run this after creating the auth user through Supabase Dashboard

-- First, you need to create the auth user in Supabase Dashboard:
-- 1. Go to Authentication > Users in Supabase Dashboard
-- 2. Click "Add user" > "Create new user"
-- 3. Email: khalid.a.kh990@gmail.com
-- 4. Password: Khalid@5452
-- 5. Check "Auto Confirm User"
-- 6. Copy the User ID after creation

-- Then run this SQL with the User ID:
-- Replace 'USER_ID_HERE' with the actual user ID from step 6

INSERT INTO profiles (
  id,
  email,
  full_name,
  full_name_ar,
  is_super_admin,
  role,
  created_at,
  updated_at
)
VALUES (
  'USER_ID_HERE'::uuid,
  'khalid.a.kh990@gmail.com',
  'Khalid',
  'خالد',
  true,
  'platform_owner',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  is_super_admin = true,
  role = 'platform_owner',
  updated_at = now();
