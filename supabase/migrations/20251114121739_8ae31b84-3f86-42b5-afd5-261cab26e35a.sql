-- السماح للفنيين بتحديث أوامر العمل المخصصة لفرقهم
CREATE POLICY "Technicians can update their assigned work orders"
ON public.work_orders
FOR UPDATE
USING (
  -- التحقق من أن المستخدم جزء من الفريق المخصص
  EXISTS (
    SELECT 1 
    FROM public.team_members tm
    WHERE tm.team_id = work_orders.assigned_team
    AND tm.user_id = auth.uid()
  )
)
WITH CHECK (
  -- التحقق من أن المستخدم جزء من الفريق المخصص
  EXISTS (
    SELECT 1 
    FROM public.team_members tm
    WHERE tm.team_id = work_orders.assigned_team
    AND tm.user_id = auth.uid()
  )
);