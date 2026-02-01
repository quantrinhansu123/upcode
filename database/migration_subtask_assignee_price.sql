-- Migration: Add assignee and price to subtasks

-- Add assignee_id column to subtasks table
ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES employees(id) ON DELETE SET NULL;

-- Add price column to subtasks table
ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS price DECIMAL(12, 2);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subtasks_assignee_id ON subtasks(assignee_id) WHERE assignee_id IS NOT NULL;

-- Update existing queries to include employees relation
-- (This is handled in the application code, no SQL changes needed)
