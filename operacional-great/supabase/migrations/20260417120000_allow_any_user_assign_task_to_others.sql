-- Allow any authenticated user to insert my_day_items for another user
-- when assigning a work item (source = 'WORK_ITEM').
-- This enables the "assign task to any user" feature from the Dashboard.

CREATE POLICY "Authenticated users can insert work_item assignments for others"
ON public.my_day_items
FOR INSERT
TO authenticated
WITH CHECK (
  source = 'WORK_ITEM'
);
