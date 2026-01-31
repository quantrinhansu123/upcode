-- Create task_assignees table for multiple assignees per task with commission
CREATE TABLE IF NOT EXISTS task_assignees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  commission DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, employee_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_employee_id ON task_assignees(employee_id);

-- Enable RLS
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable all access for all users" ON task_assignees
  FOR ALL USING (true);
