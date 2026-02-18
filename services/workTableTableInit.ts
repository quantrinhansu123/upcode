import { supabase } from './supabaseClient';

export const initializeWorkTableTable = async (): Promise<boolean> => {
    try {
        const { error: checkError } = await supabase
            .from('work_tables')
            .select('id')
            .limit(1);

        if (!checkError) {
            return true;
        }

        if (checkError?.code === '42P01') {
            console.log('📦 Bảng work_tables chưa tồn tại. Đang tạo bảng tự động...');
            try {
                const { error: rpcError } = await supabase.rpc('auto_create_all_tables');
                if (!rpcError) {
                    console.log('✅ Bảng work_tables đã được tạo thành công qua RPC');
                    return true;
                }
                if (rpcError.code === '42883') {
                    console.warn('⚠️ RPC function chưa có. Vui lòng chạy migration_auto_init_tables.sql trong Supabase SQL Editor.');
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
        console.warn('⚠️ Lỗi khi khởi tạo bảng work_tables:', error?.message || error);
        return false;
    }
};
