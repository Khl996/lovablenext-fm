-- Fix RLS policies for all lookup tables to support custom roles properly

-- Fix lookup_priorities
DROP POLICY IF EXISTS "Admins can manage priorities in their hospital" ON lookup_priorities;
DROP POLICY IF EXISTS "Users can view priorities in their hospital" ON lookup_priorities;

CREATE POLICY "Admins can manage priorities in their hospital"
ON lookup_priorities
FOR ALL
USING (
  hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT hospital_id FROM user_custom_roles WHERE user_id = auth.uid()
  )
  AND (
    has_role(auth.uid(), 'hospital_admin'::app_role) OR
    has_role(auth.uid(), 'facility_manager'::app_role) OR
    has_role(auth.uid(), 'global_admin'::app_role) OR
    has_role_by_code(auth.uid(), 'hospital_admin') OR
    has_role_by_code(auth.uid(), 'facility_manager') OR
    has_role_by_code(auth.uid(), 'global_admin')
  )
);

CREATE POLICY "Users can view priorities in their hospital"
ON lookup_priorities
FOR SELECT
USING (
  hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT hospital_id FROM user_custom_roles WHERE user_id = auth.uid()
  )
);

-- Fix lookup_work_order_statuses
DROP POLICY IF EXISTS "Admins can manage work order statuses in their hospital" ON lookup_work_order_statuses;
DROP POLICY IF EXISTS "Users can view work order statuses in their hospital" ON lookup_work_order_statuses;

CREATE POLICY "Admins can manage work order statuses in their hospital"
ON lookup_work_order_statuses
FOR ALL
USING (
  hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT hospital_id FROM user_custom_roles WHERE user_id = auth.uid()
  )
  AND (
    has_role(auth.uid(), 'hospital_admin'::app_role) OR
    has_role(auth.uid(), 'facility_manager'::app_role) OR
    has_role(auth.uid(), 'global_admin'::app_role) OR
    has_role_by_code(auth.uid(), 'hospital_admin') OR
    has_role_by_code(auth.uid(), 'facility_manager') OR
    has_role_by_code(auth.uid(), 'global_admin')
  )
);

CREATE POLICY "Users can view work order statuses in their hospital"
ON lookup_work_order_statuses
FOR SELECT
USING (
  hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT hospital_id FROM user_custom_roles WHERE user_id = auth.uid()
  )
);

-- Fix lookup_asset_statuses
DROP POLICY IF EXISTS "Admins can manage asset statuses in their hospital" ON lookup_asset_statuses;
DROP POLICY IF EXISTS "Users can view asset statuses in their hospital" ON lookup_asset_statuses;

CREATE POLICY "Admins can manage asset statuses in their hospital"
ON lookup_asset_statuses
FOR ALL
USING (
  hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT hospital_id FROM user_custom_roles WHERE user_id = auth.uid()
  )
  AND (
    has_role(auth.uid(), 'hospital_admin'::app_role) OR
    has_role(auth.uid(), 'facility_manager'::app_role) OR
    has_role(auth.uid(), 'global_admin'::app_role) OR
    has_role_by_code(auth.uid(), 'hospital_admin') OR
    has_role_by_code(auth.uid(), 'facility_manager') OR
    has_role_by_code(auth.uid(), 'global_admin')
  )
);

CREATE POLICY "Users can view asset statuses in their hospital"
ON lookup_asset_statuses
FOR SELECT
USING (
  hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT hospital_id FROM user_custom_roles WHERE user_id = auth.uid()
  )
);

-- Fix lookup_asset_categories
DROP POLICY IF EXISTS "Admins can manage asset categories in their hospital" ON lookup_asset_categories;
DROP POLICY IF EXISTS "Users can view asset categories in their hospital" ON lookup_asset_categories;

CREATE POLICY "Admins can manage asset categories in their hospital"
ON lookup_asset_categories
FOR ALL
USING (
  hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT hospital_id FROM user_custom_roles WHERE user_id = auth.uid()
  )
  AND (
    has_role(auth.uid(), 'hospital_admin'::app_role) OR
    has_role(auth.uid(), 'facility_manager'::app_role) OR
    has_role(auth.uid(), 'global_admin'::app_role) OR
    has_role_by_code(auth.uid(), 'hospital_admin') OR
    has_role_by_code(auth.uid(), 'facility_manager') OR
    has_role_by_code(auth.uid(), 'global_admin')
  )
);

CREATE POLICY "Users can view asset categories in their hospital"
ON lookup_asset_categories
FOR SELECT
USING (
  hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT hospital_id FROM user_custom_roles WHERE user_id = auth.uid()
  )
);

-- Fix lookup_work_types
DROP POLICY IF EXISTS "Admins can manage work types in their hospital" ON lookup_work_types;
DROP POLICY IF EXISTS "Users can view work types in their hospital" ON lookup_work_types;

CREATE POLICY "Admins can manage work types in their hospital"
ON lookup_work_types
FOR ALL
USING (
  hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT hospital_id FROM user_custom_roles WHERE user_id = auth.uid()
  )
  AND (
    has_role(auth.uid(), 'hospital_admin'::app_role) OR
    has_role(auth.uid(), 'facility_manager'::app_role) OR
    has_role(auth.uid(), 'global_admin'::app_role) OR
    has_role_by_code(auth.uid(), 'hospital_admin') OR
    has_role_by_code(auth.uid(), 'facility_manager') OR
    has_role_by_code(auth.uid(), 'global_admin')
  )
);

CREATE POLICY "Users can view work types in their hospital"
ON lookup_work_types
FOR SELECT
USING (
  hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT hospital_id FROM user_custom_roles WHERE user_id = auth.uid()
  )
);

-- Fix lookup_team_roles
DROP POLICY IF EXISTS "Admins can manage team roles in their hospital" ON lookup_team_roles;
DROP POLICY IF EXISTS "Users can view team roles in their hospital" ON lookup_team_roles;

CREATE POLICY "Admins can manage team roles in their hospital"
ON lookup_team_roles
FOR ALL
USING (
  hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT hospital_id FROM user_custom_roles WHERE user_id = auth.uid()
  )
  AND (
    has_role(auth.uid(), 'hospital_admin'::app_role) OR
    has_role(auth.uid(), 'facility_manager'::app_role) OR
    has_role(auth.uid(), 'global_admin'::app_role) OR
    has_role_by_code(auth.uid(), 'hospital_admin') OR
    has_role_by_code(auth.uid(), 'facility_manager') OR
    has_role_by_code(auth.uid(), 'global_admin')
  )
);

CREATE POLICY "Users can view team roles in their hospital"
ON lookup_team_roles
FOR SELECT
USING (
  hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT hospital_id FROM user_custom_roles WHERE user_id = auth.uid()
  )
);