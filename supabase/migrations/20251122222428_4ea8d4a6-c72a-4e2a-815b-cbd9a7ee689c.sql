-- Update RLS policies for maintenance_tasks to allow engineers and managers to add/edit tasks

DO $$
BEGIN
  -- Drop old policies if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'maintenance_tasks' AND policyname = 'Managers can manage maintenance tasks in their hospital'
  ) THEN
    DROP POLICY "Managers can manage maintenance tasks in their hospital" ON public.maintenance_tasks;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'maintenance_tasks' AND policyname = 'Users can view maintenance tasks in their hospital'
  ) THEN
    DROP POLICY "Users can view maintenance tasks in their hospital" ON public.maintenance_tasks;
  END IF;
END $$;

-- Policy to allow managers & engineers to manage tasks for plans in their hospital
CREATE POLICY "Managers can manage maintenance tasks in their hospital"
ON public.maintenance_tasks
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.maintenance_plans mp
    WHERE mp.id = maintenance_tasks.plan_id
      AND mp.hospital_id = get_user_hospital(auth.uid())
  )
  AND (
    has_role(auth.uid(), 'hospital_admin'::app_role) OR 
    has_role(auth.uid(), 'facility_manager'::app_role) OR 
    has_role(auth.uid(), 'maintenance_manager'::app_role) OR
    has_role_by_code(auth.uid(), 'hospital_admin'::text) OR
    has_role_by_code(auth.uid(), 'facility_manager'::text) OR
    has_role_by_code(auth.uid(), 'maintenance_manager'::text) OR
    has_role_by_code(auth.uid(), 'eng'::text) OR
    has_role_by_code(auth.uid(), 'engineer'::text)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.maintenance_plans mp
    WHERE mp.id = maintenance_tasks.plan_id
      AND mp.hospital_id = get_user_hospital(auth.uid())
  )
  AND (
    has_role(auth.uid(), 'hospital_admin'::app_role) OR 
    has_role(auth.uid(), 'facility_manager'::app_role) OR 
    has_role(auth.uid(), 'maintenance_manager'::app_role) OR
    has_role_by_code(auth.uid(), 'hospital_admin'::text) OR
    has_role_by_code(auth.uid(), 'facility_manager'::text) OR
    has_role_by_code(auth.uid(), 'maintenance_manager'::text) OR
    has_role_by_code(auth.uid(), 'eng'::text) OR
    has_role_by_code(auth.uid(), 'engineer'::text)
  )
);

-- Policy to allow users to view tasks for plans in their hospital
CREATE POLICY "Users can view maintenance tasks in their hospital"
ON public.maintenance_tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.maintenance_plans mp
    WHERE mp.id = maintenance_tasks.plan_id
      AND mp.hospital_id = get_user_hospital(auth.uid())
  )
);