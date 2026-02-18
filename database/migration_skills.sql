-- Migration: Create skills table for Kỹ thuật cần có
-- Tên Kỹ Năng, Loại kỹ năng, Yêu cầu

-- Create table if not exists
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL, -- Tên Kỹ Năng
  type VARCHAR(255) NOT NULL, -- Loại kỹ năng
  requirement JSONB, -- Yêu cầu dạng JSON array: [{"text": "...", "checked": false}]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_skills_type ON skills(type);
CREATE INDEX IF NOT EXISTS idx_skills_created_at ON skills(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Enable read access for all users" ON skills;
DROP POLICY IF EXISTS "Enable insert access for all users" ON skills;
DROP POLICY IF EXISTS "Enable update access for all users" ON skills;
DROP POLICY IF EXISTS "Enable delete access for all users" ON skills;

-- Create policies for public access
CREATE POLICY "Enable read access for all users" ON skills
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON skills
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON skills
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON skills
  FOR DELETE USING (true);
