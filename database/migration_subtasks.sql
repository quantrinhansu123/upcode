-- Create subtasks table to track sub-tasks for each task
CREATE TABLE IF NOT EXISTS subtasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_is_completed ON subtasks(is_completed);

-- Enable RLS
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subtasks
CREATE POLICY "Enable read access for all users" ON subtasks
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON subtasks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON subtasks
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON subtasks
  FOR DELETE USING (true);

-- Create a function to automatically update completed_at when is_completed changes
CREATE OR REPLACE FUNCTION update_subtask_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_completed = TRUE AND OLD.is_completed = FALSE THEN
    NEW.completed_at = NOW();
  ELSIF NEW.is_completed = FALSE THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subtasks
CREATE TRIGGER trigger_update_subtask_completed_at
  BEFORE UPDATE ON subtasks
  FOR EACH ROW
  EXECUTE FUNCTION update_subtask_completed_at();
