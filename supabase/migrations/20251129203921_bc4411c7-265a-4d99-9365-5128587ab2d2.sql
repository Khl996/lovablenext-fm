-- Add missing permissions for Calibration and Contracts modules
INSERT INTO public.permissions (key, name, name_ar, category, description)
VALUES
  ('calibration.view', 'View Calibration', 'عرض المعايرة', 'calibration', 'View calibration schedules and records'),
  ('calibration.manage', 'Manage Calibration', 'إدارة المعايرة', 'calibration', 'Manage calibration schedules and records'),
  ('contracts.view', 'View Contracts', 'عرض العقود', 'contracts', 'View contracts'),
  ('contracts.manage', 'Manage Contracts', 'إدارة العقود', 'contracts', 'Manage contracts')
ON CONFLICT (key) DO NOTHING;