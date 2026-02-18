-- Migration: Create solution_details table for bảng con của problem_solutions
-- Lưu giải pháp và ưu điểm nhược điểm

CREATE TABLE IF NOT EXISTS solution_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problem_solution_id UUID NOT NULL REFERENCES problem_solutions(id) ON DELETE CASCADE,
  solution TEXT NOT NULL, -- Giải pháp
  advantages JSONB, -- Ưu điểm dạng JSON array: [{"text": "...", "checked": false}]
  disadvantages JSONB, -- Nhược điểm dạng JSON array: [{"text": "...", "checked": false}]
  steps JSONB, -- Các bước thực hiện: [{"stepNumber": 1, "description": "..."}]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_solution_details_problem_solution_id ON solution_details(problem_solution_id);
CREATE INDEX IF NOT EXISTS idx_solution_details_created_at ON solution_details(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE solution_details ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Enable read access for all users" ON solution_details;
DROP POLICY IF EXISTS "Enable insert access for all users" ON solution_details;
DROP POLICY IF EXISTS "Enable update access for all users" ON solution_details;
DROP POLICY IF EXISTS "Enable delete access for all users" ON solution_details;

-- Create policies for public access
CREATE POLICY "Enable read access for all users" ON solution_details
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON solution_details
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON solution_details
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON solution_details
  FOR DELETE USING (true);
