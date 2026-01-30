-- Add assignee_id to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES employees(id) ON DELETE SET NULL;
