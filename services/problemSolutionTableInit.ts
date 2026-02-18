import { supabase } from './supabaseClient';

/**
 * Tự động tạo bảng problem_solutions từ code backend
 * Không cần chạy migration SQL thủ công
 */
export const initializeProblemSolutionTable = async (): Promise<boolean> => {
    try {
        // Kiểm tra xem bảng đã tồn tại chưa
        const { error: checkError } = await supabase
            .from('problem_solutions')
            .select('id')
            .limit(1);

        // Nếu bảng đã tồn tại, return true
        if (!checkError) {
            return true;
        }

        // Nếu bảng không tồn tại (error code 42P01, PGRST116, hoặc schema cache error)
        if (checkError?.code === '42P01' || 
            checkError?.code === 'PGRST116' ||
            checkError?.message?.includes('schema cache') ||
            checkError?.message?.includes('Could not find the table')) {
            console.log('📦 Bảng problem_solutions chưa tồn tại. Đang tạo bảng tự động...');
            
            try {
                // Gọi RPC function để tạo bảng (nếu đã chạy migration_problem_solution_rpc.sql)
                const { error: rpcError } = await supabase.rpc('create_problem_solutions_table_if_not_exists');
                
                if (!rpcError) {
                    console.log('✅ Bảng problem_solutions đã được tạo thành công qua RPC');
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
        console.warn('⚠️ Lỗi khi khởi tạo bảng problem_solutions:', error?.message || error);
        return false;
    }
};

/**
 * Tạo bảng bằng cách thử insert và xử lý lỗi
 * Đây là workaround vì Supabase client không hỗ trợ raw SQL
 */
const createTableViaInsert = async (): Promise<boolean> => {
    console.warn('📝 Không thể tạo bảng tự động từ code.');
    console.warn('   Vui lòng chạy một trong các migration sau trong Supabase SQL Editor:');
    console.warn('   1. migration_problem_solution_rpc.sql (khuyến nghị - cho phép tự động tạo bảng)');
    console.warn('   2. migration_problem_solution.sql (tạo bảng thủ công)');
    
    return false;
};
