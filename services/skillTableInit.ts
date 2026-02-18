import { supabase } from './supabaseClient';

/**
 * Tự động tạo bảng skills từ code backend
 * Không cần chạy migration SQL thủ công
 */
export const initializeSkillsTable = async (): Promise<boolean> => {
    try {
        // Kiểm tra xem bảng đã tồn tại chưa
        const { error: checkError } = await supabase
            .from('skills')
            .select('id')
            .limit(1);

        // Nếu bảng đã tồn tại, return true
        if (!checkError) {
            return true;
        }

        // Nếu bảng không tồn tại (error code 42P01)
        if (checkError?.code === '42P01') {
            console.log('📦 Bảng skills chưa tồn tại. Đang tạo bảng tự động...');
            
            // Tạo bảng bằng cách sử dụng Supabase REST API với raw SQL
            // Sử dụng PostgREST để execute SQL thông qua RPC
            // Trước tiên, cần tạo function trong DB một lần, sau đó gọi từ đây
            
            // Cách 1: Gọi RPC function nếu đã có
            try {
                const { error: rpcError } = await supabase.rpc('create_skills_table_if_not_exists');
                
                if (!rpcError) {
                    console.log('✅ Bảng skills đã được tạo thành công qua RPC');
                    return true;
                }
                
                // Nếu RPC function chưa tồn tại, tạo bảng bằng cách khác
                if (rpcError.code === '42883') {
                    console.log('⚠️ RPC function chưa có. Đang tạo bảng bằng cách khác...');
                    return await createTableViaInsert();
                }
            } catch (rpcErr: any) {
                // Ignore extension errors
                if (rpcErr?.message?.includes('extension') || 
                    rpcErr?.message?.includes('runtime') ||
                    rpcErr?.message?.includes('lastError')) {
                    return await createTableViaInsert();
                }
                console.warn('RPC error:', rpcErr?.message);
                return await createTableViaInsert();
            }
        }

        return false;
    } catch (error: any) {
        // Ignore extension errors
        if (error?.message?.includes('extension') || 
            error?.message?.includes('runtime') ||
            error?.message?.includes('lastError') ||
            error?.message?.includes('Receiving end')) {
            return false;
        }
        console.warn('⚠️ Lỗi khi khởi tạo bảng skills:', error?.message || error);
        return false;
    }
};

/**
 * Tạo bảng bằng cách thử insert và xử lý lỗi
 * Đây là workaround vì Supabase client không hỗ trợ raw SQL
 */
const createTableViaInsert = async (): Promise<boolean> => {
    // Không thể tạo bảng từ insert, nhưng có thể hướng dẫn user
    console.warn('📝 Không thể tạo bảng tự động từ code.');
    console.warn('   Vui lòng chạy một trong các migration sau trong Supabase SQL Editor:');
    console.warn('   1. migration_skills_rpc.sql (khuyến nghị - cho phép tự động tạo bảng)');
    console.warn('   2. migration_skills.sql (tạo bảng thủ công)');
    
    // Return false để app vẫn chạy được, chỉ không có bảng
    return false;
};

/**
 * Tự động tạo RPC function và bảng (chạy một lần trong Supabase SQL Editor)
 * Function này chỉ để reference, không thể chạy từ code
 */
export const getMigrationSQL = (): string => {
    return `
-- Chạy SQL này một lần trong Supabase SQL Editor để cho phép tự động tạo bảng từ code

-- Tạo function để tự động tạo bảng
CREATE OR REPLACE FUNCTION create_skills_table_if_not_exists()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
END;
$$;

GRANT EXECUTE ON FUNCTION create_skills_table_if_not_exists() TO anon, authenticated;
    `;
};
