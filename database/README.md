# 🗄️ Hướng dẫn Setup Database Supabase cho ProTrack AI

## 📋 Tổng quan
ProTrack AI sử dụng Supabase làm backend database. File này hướng dẫn chi tiết cách thiết lập và sử dụng database.

## 🔧 Bước 1: Cài đặt và Cấu hình

### ✅ Đã hoàn thành:
- ✅ Đã cài đặt `@supabase/supabase-js` package
- ✅ Đã cấu hình `.env.local` với Supabase credentials
- ✅ Đã tạo Supabase client (`services/supabaseClient.ts`)
- ✅ Đã tạo Database service layer (`services/databaseService.ts`)
- ✅ Đã tạo SQL schema (`database/schema.sql`)

## 🗃️ Bước 2: Tạo Database Tables trên Supabase

### Cách 1: Sử dụng Supabase Dashboard (Khuyến nghị)

1. **Truy cập Supabase Dashboard**
   - Đăng nhập vào: https://app.supabase.com
   - Chọn project của bạn: `orucrotvccndrjkujyzf`

2. **Chạy SQL Schema**
   - Click vào **SQL Editor** ở sidebar bên trái
   - Click **New Query**
   - Copy toàn bộ nội dung từ file `database/schema.sql`
   - Paste vào SQL Editor
   - Click **Run** (hoặc nhấn Ctrl+Enter)

3. **Kiểm tra kết quả**
   - Click vào **Table Editor** ở sidebar
   - Bạn sẽ thấy 2 tables mới:
     - ✅ `projects` - Lưu trữ thông tin dự án
     - ✅ `tasks` - Lưu trữ các task/công việc

### Cách 2: Sử dụng Supabase CLI (Nâng cao)

```bash
# Cài đặt Supabase CLI
npm install -g supabase

# Login vào Supabase
supabase login

# Link với project
supabase link --project-ref orucrotvccndrjkujyzf

# Chạy migration
supabase db push
```

## 📊 Cấu trúc Database

### Table: `projects`
```
id              UUID (Primary Key)
name            VARCHAR(255) - Tên dự án
description     TEXT - Mô tả dự án
color           VARCHAR(50) - Màu sắc đại diện
created_at      TIMESTAMP - Thời gian tạo
```

### Table: `tasks`
```
id              UUID (Primary Key)
project_id      UUID (Foreign Key -> projects.id)
title           VARCHAR(500) - Tiêu đề task
description     TEXT - Mô tả chi tiết
deadline        TIMESTAMP - Hạn hoàn thành
is_completed    BOOLEAN - Trạng thái hoàn thành
completed_at    TIMESTAMP - Thời gian hoàn thành
priority        VARCHAR(10) - Mức độ ưu tiên (Low/Medium/High)
created_at      TIMESTAMP - Thời gian tạo
```

## 🔐 Row Level Security (RLS)

Database đã được cấu hình với RLS policies để bảo mật:
- ✅ **Public Access**: Hiện tại cho phép public access (có thể điều chỉnh sau)
- ✅ **Future Auth**: Sẵn sàng tích hợp authentication khi cần

## 💻 Sử dụng Database Service

### Import Services
```typescript
import { projectService, taskService } from './services/databaseService';
```

### Project Operations
```typescript
// Lấy tất cả projects
const projects = await projectService.getAll();

// Tạo project mới
const newProject = await projectService.create({
  name: 'My New Project',
  description: 'Project description',
  color: '#3b82f6'
});

// Cập nhật project
const updated = await projectService.update(projectId, {
  name: 'Updated Name'
});

// Xóa project
await projectService.delete(projectId);
```

### Task Operations
```typescript
// Lấy tất cả tasks
const tasks = await taskService.getAll();

// Lấy tasks của một project
const projectTasks = await taskService.getByProjectId(projectId);

// Tạo task mới
const newTask = await taskService.create({
  projectId: 'project-uuid',
  title: 'Complete documentation',
  description: 'Write comprehensive docs',
  deadline: new Date().toISOString(),
  priority: 'High',
  isCompleted: false
});

// Toggle hoàn thành task
await taskService.toggleComplete(taskId);

// Lấy tasks quá hạn
const overdueTasks = await taskService.getOverdue();

// Xóa task
await taskService.delete(taskId);
```

## 🔄 Realtime Subscriptions (Optional)

Lắng nghe thay đổi realtime:

```typescript
import { subscribeToProjects, subscribeToTasks } from './services/databaseService';

// Subscribe to project changes
const projectChannel = subscribeToProjects((payload) => {
  console.log('Project changed:', payload);
  // Update your UI here
});

// Subscribe to task changes
const taskChannel = subscribeToTasks((payload) => {
  console.log('Task changed:', payload);
  // Update your UI here
});

// Unsubscribe when component unmounts
// projectChannel.unsubscribe();
// taskChannel.unsubscribe();
```

## 🧪 Test Connection

Để test kết nối database, bạn có thể thêm code sau vào `App.tsx`:

```typescript
import { projectService, taskService } from './services/databaseService';

// Trong useEffect
useEffect(() => {
  const testDatabase = async () => {
    try {
      console.log('🔌 Testing database connection...');
      
      const projects = await projectService.getAll();
      console.log('✅ Projects loaded:', projects.length);
      
      const tasks = await taskService.getAll();
      console.log('✅ Tasks loaded:', tasks.length);
      
      console.log('🎉 Database connected successfully!');
    } catch (error) {
      console.error('❌ Database connection error:', error);
    }
  };
  
  testDatabase();
}, []);
```

## 📝 Sample Data

Schema đã bao gồm sample data mẫu:
- 3 projects mẫu
- 2 tasks mẫu

Bạn có thể xóa các dòng INSERT trong `schema.sql` nếu không muốn dữ liệu mẫu.

## 🔍 Monitoring & Debugging

### Supabase Dashboard:
- **Table Editor**: Xem và chỉnh sửa dữ liệu trực tiếp
- **SQL Editor**: Chạy custom queries
- **Database**: Xem schema, relationships, triggers
- **API Docs**: Auto-generated API documentation

### Console Logs:
Service layer đã có logging cho mọi operations. Check browser console để debug.

## ⚡ Performance Tips

1. **Indexes**: Schema đã tạo indexes cho các trường thường query
2. **Pagination**: Sử dụng `.range()` cho large datasets
3. **Select specific columns**: Chỉ select columns cần thiết
4. **Use filters**: Filter ở database level thay vì client side

## 🚀 Next Steps

1. ✅ Chạy SQL schema trên Supabase Dashboard
2. ✅ Test connection với code mẫu
3. ✅ Tích hợp vào App.tsx
4. ⏳ (Optional) Setup Supabase Auth
5. ⏳ (Optional) Enable Realtime subscriptions

## 📞 Support

Nếu có vấn đề:
1. Check Supabase Dashboard logs
2. Check browser console
3. Verify `.env.local` credentials
4. Ensure RLS policies are set correctly

---

**Tạo bởi:** Antigravity AI Assistant  
**Ngày:** 27/01/2026  
**Project:** ProTrack AI - Quản lý dự án thông minh
