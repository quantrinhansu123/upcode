// Test Database Connection
// Chạy file này để kiểm tra kết nối với Supabase

import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { projectService, taskService } from '../services/databaseService';

export async function testDatabaseConnection() {
    console.log('🔌 Đang kiểm tra kết nối Supabase...');

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
        console.warn('⚠️ Supabase chưa được cấu hình. Vui lòng tạo file .env.local với VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY');
        return false;
    }

    try {
        // Test 1: Kiểm tra kết nối cơ bản
        const { data, error } = await supabase.from('projects').select('count');

        if (error) {
            console.error('❌ Lỗi kết nối database:', error.message);
            console.log('💡 Hãy chắc chắn bạn đã:');
            console.log('   1. Chạy SQL schema trên Supabase Dashboard');
            console.log('   2. Kiểm tra VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong .env.local');
            return false;
        }

        console.log('✅ Kết nối Supabase thành công!');

        // Test 2: Lấy danh sách projects
        console.log('\n📂 Đang load projects...');
        const projects = await projectService.getAll();
        console.log(`✅ Tìm thấy ${projects.length} projects`);
        if (projects.length > 0) {
            console.log('   Projects:', projects.map(p => p.name).join(', '));
        }

        // Test 3: Lấy danh sách tasks
        console.log('\n📋 Đang load tasks...');
        const tasks = await taskService.getAll();
        console.log(`✅ Tìm thấy ${tasks.length} tasks`);
        if (tasks.length > 0) {
            console.log('   Tasks:', tasks.map(t => t.title).join(', '));
        }

        console.log('\n🎉 Tất cả tests đều pass! Database đã sẵn sàng.');
        return true;

    } catch (error) {
        console.error('❌ Lỗi không mong đợi:', error);
        return false;
    }
}

// Export để có thể gọi từ App.tsx
export default testDatabaseConnection;
