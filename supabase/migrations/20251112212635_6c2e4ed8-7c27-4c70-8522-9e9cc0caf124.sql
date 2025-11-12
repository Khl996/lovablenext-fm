-- Convert priority field from enum to text to support dynamic lookup values
ALTER TABLE work_orders 
  ALTER COLUMN priority TYPE text;

-- Add a check to ensure priority is not empty
ALTER TABLE work_orders 
  ADD CONSTRAINT priority_not_empty CHECK (priority IS NOT NULL AND priority != '');