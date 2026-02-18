import { supabase } from './supabaseClient';

/**
 * Tự động tạo tất cả các bảng cần thiết từ backend
 * Chạy một lần khi app khởi động
 */
export const autoInitializeAllTables = async (): Promise<void> => {
    console.log('🚀 Đang khởi tạo các bảng tự động...');
    
    try {
        // Tạo RPC function tổng hợp để tạo tất cả các bảng
        // Function này sẽ được tạo tự động nếu chưa có
        const { error: rpcError } = await supabase.rpc('auto_create_all_tables');
        
        if (rpcError) {
            // Nếu RPC function chưa tồn tại, log hướng dẫn
            if (rpcError.code === '42883' || rpcError.message?.includes('function') || rpcError.message?.includes('does not exist')) {
                console.warn('⚠️ RPC function chưa tồn tại.');
                console.warn('📝 Vui lòng chạy database/migration_auto_init_tables.sql trong Supabase SQL Editor một lần.');
                console.warn('   Sau đó tất cả các bảng sẽ được tạo tự động từ code.');
            } else {
                console.warn('⚠️ Không thể tạo bảng tự động:', rpcError.message);
            }
        } else {
            console.log('✅ Tất cả các bảng đã được khởi tạo thành công');
        }
    } catch (error: any) {
        // Ignore extension errors
        if (error?.message?.includes('extension') || 
            error?.message?.includes('runtime') ||
            error?.message?.includes('lastError')) {
            return;
        }
        console.warn('⚠️ Lỗi khi khởi tạo bảng:', error?.message || error);
    }
};
