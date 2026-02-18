import { supabase } from './supabaseClient';

export const initializeSolutionDetailTable = async (): Promise<boolean> => {
    try {
        const { error: checkError } = await supabase
            .from('solution_details')
            .select('id')
            .limit(1);

        if (!checkError) {
            return true;
        }

        if (checkError?.code === '42P01') {
            console.log('📦 Bảng solution_details chưa tồn tại. Đang tạo bảng tự động...');
            try {
                const { error: rpcError } = await supabase.rpc('create_solution_details_table_if_not_exists');
                if (!rpcError) {
                    console.log('✅ Bảng solution_details đã được tạo thành công qua RPC');
                    return true;
                }
                if (rpcError.code === '42883') {
                    console.warn('⚠️ RPC function chưa có. Vui lòng chạy migration_solution_details_rpc.sql trong Supabase SQL Editor.');
                    return false;
                }
            } catch (rpcErr: any) {
                if (rpcErr?.message?.includes('extension') || rpcErr?.message?.includes('runtime') || rpcErr?.message?.includes('lastError')) {
                    return false;
                }
                console.warn('RPC error:', rpcErr?.message);
                return false;
            }
        }
        return false;
    } catch (error: any) {
        if (error?.message?.includes('extension') || error?.message?.includes('runtime') || error?.message?.includes('lastError') || error?.message?.includes('Receiving end')) {
            return false;
        }
        console.warn('⚠️ Lỗi khi khởi tạo bảng solution_details:', error?.message || error);
        return false;
    }
};
