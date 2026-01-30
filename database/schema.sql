-- ProTrack AI - Database Schema
-- Quản lý dự án thông minh

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(50) NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  hours_worked DECIMAL(5,2),
  priority VARCHAR(10) CHECK (priority IN ('Low', 'Medium', 'High')) DEFAULT 'Medium',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_completed ON tasks(is_completed);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (you can modify these based on your authentication needs)
-- For now, we'll allow public access to all operations

-- Projects policies
CREATE POLICY "Enable read access for all users" ON projects
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON projects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON projects
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON projects
  FOR DELETE USING (true);

-- Tasks policies
CREATE POLICY "Enable read access for all users" ON tasks
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON tasks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON tasks
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON tasks
  FOR DELETE USING (true);

-- Create a function to automatically update completed_at when is_completed changes to true
CREATE OR REPLACE FUNCTION update_completed_at()
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

-- Create trigger for tasks
CREATE TRIGGER trigger_update_completed_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_completed_at();

-- Insert some sample data (optional - you can remove this if not needed)
INSERT INTO projects (name, description, color) VALUES
  ('Website Redesign', 'Redesign company website with modern UI/UX', '#3b82f6'),
  ('Mobile App Development', 'Build cross-platform mobile application', '#10b981'),
  ('Marketing Campaign', 'Q1 Marketing campaign planning and execution', '#f59e0b')
ON CONFLICT DO NOTHING;

-- Add sample tasks (optional)
INSERT INTO tasks (project_id, title, description, deadline, priority) 
SELECT 
  p.id,
  'Create wireframes',
  'Design initial wireframes for all pages',
  NOW() + INTERVAL '7 days',
  'High'
FROM projects p
WHERE p.name = 'Website Redesign'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO tasks (project_id, title, description, deadline, priority) 
SELECT 
  p.id,
  'Setup development environment',
  'Install and configure all necessary tools',
  NOW() + INTERVAL '3 days',
  'High'
FROM projects p
WHERE p.name = 'Mobile App Development'
LIMIT 1
ON CONFLICT DO NOTHING;
