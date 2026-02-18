-- Migration: Tạo RPC function để tự động tạo bảng skills
-- Chạy migration này TRƯỚC để có thể tự động tạo bảng từ code

-- Tạo function để tự động tạo bảng skills
CREATE OR REPLACE FUNCTION create_skills_table_if_not_exists()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Tạo bảng nếu chưa tồn tại
    CREATE TABLE IF NOT EXISTS skills (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(255) NOT NULL,
        requirement JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Tạo indexes
    CREATE INDEX IF NOT EXISTS idx_skills_type ON skills(type);
    CREATE INDEX IF NOT EXISTS idx_skills_created_at ON skills(created_at);

    -- Enable RLS
    ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies nếu có
    DROP POLICY IF EXISTS "Enable read access for all users" ON skills;
    DROP POLICY IF EXISTS "Enable insert access for all users" ON skills;
    DROP POLICY IF EXISTS "Enable update access for all users" ON skills;
    DROP POLICY IF EXISTS "Enable delete access for all users" ON skills;

    -- Tạo policies
    CREATE POLICY "Enable read access for all users" ON skills
        FOR SELECT USING (true);

    CREATE POLICY "Enable insert access for all users" ON skills
        FOR INSERT WITH CHECK (true);

    CREATE POLICY "Enable update access for all users" ON skills
        FOR UPDATE USING (true);

    CREATE POLICY "Enable delete access for all users" ON skills
        FOR DELETE USING (true);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_skills_table_if_not_exists() TO anon, authenticated;
