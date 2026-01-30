-- Add hours_worked column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS hours_worked DECIMAL(5,2);
