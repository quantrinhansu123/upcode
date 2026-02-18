-- Migration: Create work_tables table for Bảng làm việc
-- Vấn đề và Cách giải quyết

CREATE TABLE IF NOT EXISTS work_tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problem TEXT NOT NULL, -- Vấn đề
  solution TEXT NOT NULL, -- Cách giải quyết
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_work_tables_created_at ON work_tables(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE work_tables ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Enable read access for all users" ON work_tables;
DROP POLICY IF EXISTS "Enable insert access for all users" ON work_tables;
DROP POLICY IF EXISTS "Enable update access for all users" ON work_tables;
DROP POLICY IF EXISTS "Enable delete access for all users" ON work_tables;

-- Create policies for public access
CREATE POLICY "Enable read access for all users" ON work_tables
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON work_tables
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON work_tables
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON work_tables
  FOR DELETE USING (true);
