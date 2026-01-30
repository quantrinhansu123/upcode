-- 1. Create task_types table to store dynamic categories
CREATE TABLE IF NOT EXISTS task_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insert default types
INSERT INTO task_types (name) VALUES 
  ('Appsheet'),
  ('Web App'),
  ('Quy trình')
ON CONFLICT (name) DO NOTHING;

-- 3. Add task_type column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type VARCHAR(100);

-- 4. Enable RLS and Safely Create Policy
ALTER TABLE task_types ENABLE ROW LEVEL SECURITY;

-- Drop policy if it exists to avoid "policy already exists" error
DROP POLICY IF EXISTS "Allow all access" ON task_types;

-- Create the policy
CREATE POLICY "Allow all access" ON task_types FOR ALL USING (true);
