-- Add 'maintenance' to operation_type enum
ALTER TYPE operation_type ADD VALUE IF NOT EXISTS 'maintenance';