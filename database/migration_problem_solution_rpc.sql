-- Migration: Tạo RPC function để tự động tạo bảng problem_solutions
-- Chạy migration này TRƯỚC để có thể tự động tạo bảng từ code

-- Tạo function để tự động tạo bảng problem_solutions
CREATE OR REPLACE FUNCTION create_problem_solutions_table_if_not_exists()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Tạo bảng nếu chưa tồn tại
    CREATE TABLE IF NOT EXISTS problem_solutions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        problem TEXT NOT NULL,
        solution TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Tạo indexes
    CREATE INDEX IF NOT EXISTS idx_problem_solutions_created_at ON problem_solutions(created_at);

    -- Enable RLS
    ALTER TABLE problem_solutions ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies nếu có
    DROP POLICY IF EXISTS "Enable read access for all users" ON problem_solutions;
    DROP POLICY IF EXISTS "Enable insert access for all users" ON problem_solutions;
    DROP POLICY IF EXISTS "Enable update access for all users" ON problem_solutions;
    DROP POLICY IF EXISTS "Enable delete access for all users" ON problem_solutions;

    -- Tạo policies
    CREATE POLICY "Enable read access for all users" ON problem_solutions
        FOR SELECT USING (true);

    CREATE POLICY "Enable insert access for all users" ON problem_solutions
        FOR INSERT WITH CHECK (true);

    CREATE POLICY "Enable update access for all users" ON problem_solutions
        FOR UPDATE USING (true);

    CREATE POLICY "Enable delete access for all users" ON problem_solutions
        FOR DELETE USING (true);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_problem_solutions_table_if_not_exists() TO anon, authenticated;
