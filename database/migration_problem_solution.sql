-- Migration: Create problem_solutions table for Vấn đề giải pháp

CREATE TABLE IF NOT EXISTS problem_solutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problem TEXT NOT NULL, -- Vấn đề
  solution TEXT NOT NULL, -- Giải pháp
  description TEXT, -- Mô tả thêm
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_problem_solutions_created_at ON problem_solutions(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE problem_solutions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Enable read access for all users" ON problem_solutions;
DROP POLICY IF EXISTS "Enable insert access for all users" ON problem_solutions;
DROP POLICY IF EXISTS "Enable update access for all users" ON problem_solutions;
DROP POLICY IF EXISTS "Enable delete access for all users" ON problem_solutions;

-- Create policies for public access
CREATE POLICY "Enable read access for all users" ON problem_solutions
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON problem_solutions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON problem_solutions
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON problem_solutions
  FOR DELETE USING (true);
