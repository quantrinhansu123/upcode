-- Add work_sessions support for subtasks
-- This allows tracking time spent on individual subtasks

-- Create work_sessions table for subtasks
CREATE TABLE IF NOT EXISTS subtask_work_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subtask_id UUID NOT NULL REFERENCES subtasks(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_subtask_sessions_subtask_id ON subtask_work_sessions(subtask_id);
CREATE INDEX IF NOT EXISTS idx_subtask_sessions_ended_at ON subtask_work_sessions(ended_at);

-- Enable RLS
ALTER TABLE subtask_work_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON subtask_work_sessions;
DROP POLICY IF EXISTS "Enable insert access for all users" ON subtask_work_sessions;
DROP POLICY IF EXISTS "Enable update access for all users" ON subtask_work_sessions;
DROP POLICY IF EXISTS "Enable delete access for all users" ON subtask_work_sessions;

-- RLS Policies for subtask_work_sessions
CREATE POLICY "Enable read access for all users" ON subtask_work_sessions
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON subtask_work_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON subtask_work_sessions
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON subtask_work_sessions
  FOR DELETE USING (true);
