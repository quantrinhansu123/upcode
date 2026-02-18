-- Migration: Tạo RPC function tổng hợp để tự động tạo TẤT CẢ các bảng từ code
-- Chạy migration này MỘT LẦN để cho phép tự động tạo bảng từ backend

-- Tạo function tổng hợp để tự động tạo tất cả các bảng
CREATE OR REPLACE FUNCTION auto_create_all_tables()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- ============ SKILLS TABLE ============
    CREATE TABLE IF NOT EXISTS skills (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(255) NOT NULL,
        requirement JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_skills_type ON skills(type);
    CREATE INDEX IF NOT EXISTS idx_skills_created_at ON skills(created_at);

    ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Enable read access for all users" ON skills;
    DROP POLICY IF EXISTS "Enable insert access for all users" ON skills;
    DROP POLICY IF EXISTS "Enable update access for all users" ON skills;
    DROP POLICY IF EXISTS "Enable delete access for all users" ON skills;

    CREATE POLICY "Enable read access for all users" ON skills
        FOR SELECT USING (true);

    CREATE POLICY "Enable insert access for all users" ON skills
        FOR INSERT WITH CHECK (true);

    CREATE POLICY "Enable update access for all users" ON skills
        FOR UPDATE USING (true);

    CREATE POLICY "Enable delete access for all users" ON skills
        FOR DELETE USING (true);

    -- ============ PROBLEM SOLUTIONS TABLE ============
    CREATE TABLE IF NOT EXISTS problem_solutions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        problem TEXT NOT NULL,
        solution TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_problem_solutions_created_at ON problem_solutions(created_at);

    ALTER TABLE problem_solutions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Enable read access for all users" ON problem_solutions;
    DROP POLICY IF EXISTS "Enable insert access for all users" ON problem_solutions;
    DROP POLICY IF EXISTS "Enable update access for all users" ON problem_solutions;
    DROP POLICY IF EXISTS "Enable delete access for all users" ON problem_solutions;

    CREATE POLICY "Enable read access for all users" ON problem_solutions
        FOR SELECT USING (true);

    CREATE POLICY "Enable insert access for all users" ON problem_solutions
        FOR INSERT WITH CHECK (true);

    CREATE POLICY "Enable update access for all users" ON problem_solutions
        FOR UPDATE USING (true);

    CREATE POLICY "Enable delete access for all users" ON problem_solutions
        FOR DELETE USING (true);

    -- ============ SOLUTION DETAILS TABLE ============
    CREATE TABLE IF NOT EXISTS solution_details (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        problem_solution_id UUID NOT NULL REFERENCES problem_solutions(id) ON DELETE CASCADE,
        solution TEXT NOT NULL,
        advantages JSONB, -- Ưu điểm dạng JSON array: [{"text": "...", "checked": false}]
        disadvantages JSONB, -- Nhược điểm dạng JSON array: [{"text": "...", "checked": false}]
        steps JSONB, -- Các bước thực hiện: [{"stepNumber": 1, "description": "..."}]
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_solution_details_problem_solution_id ON solution_details(problem_solution_id);
    CREATE INDEX IF NOT EXISTS idx_solution_details_created_at ON solution_details(created_at);

    ALTER TABLE solution_details ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Enable read access for all users" ON solution_details;
    DROP POLICY IF EXISTS "Enable insert access for all users" ON solution_details;
    DROP POLICY IF EXISTS "Enable update access for all users" ON solution_details;
    DROP POLICY IF EXISTS "Enable delete access for all users" ON solution_details;

    CREATE POLICY "Enable read access for all users" ON solution_details
        FOR SELECT USING (true);

    CREATE POLICY "Enable insert access for all users" ON solution_details
        FOR INSERT WITH CHECK (true);

    CREATE POLICY "Enable update access for all users" ON solution_details
        FOR UPDATE USING (true);

    CREATE POLICY "Enable delete access for all users" ON solution_details
        FOR DELETE USING (true);

    -- ============ WORK TABLES TABLE ============
    CREATE TABLE IF NOT EXISTS work_tables (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        problem TEXT NOT NULL,
        solution TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_work_tables_created_at ON work_tables(created_at);

    ALTER TABLE work_tables ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Enable read access for all users" ON work_tables;
    DROP POLICY IF EXISTS "Enable insert access for all users" ON work_tables;
    DROP POLICY IF EXISTS "Enable update access for all users" ON work_tables;
    DROP POLICY IF EXISTS "Enable delete access for all users" ON work_tables;

    CREATE POLICY "Enable read access for all users" ON work_tables
        FOR SELECT USING (true);

    CREATE POLICY "Enable insert access for all users" ON work_tables
        FOR INSERT WITH CHECK (true);

    CREATE POLICY "Enable update access for all users" ON work_tables
        FOR UPDATE USING (true);

    CREATE POLICY "Enable delete access for all users" ON work_tables
        FOR DELETE USING (true);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION auto_create_all_tables() TO anon, authenticated;
