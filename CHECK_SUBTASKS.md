# 🔍 Kiểm tra và khắc phục lỗi Subtasks

## ❌ Lỗi: "Không thể thêm subtask"

### Bước 1: Kiểm tra bảng subtasks đã được tạo chưa

1. Truy cập: https://app.supabase.com
2. Chọn project: `orucrotvccndrjkujyzf`
3. Vào **Table Editor** (sidebar trái)
4. Kiểm tra xem có bảng **`subtasks`** không

**Nếu CHƯA có bảng `subtasks`:**

1. Vào **SQL Editor** (sidebar trái)
2. Click **New Query**
3. Copy toàn bộ nội dung từ file `database/migration_subtasks.sql`
4. Paste vào SQL Editor
5. Click **Run** (hoặc Ctrl+Enter)
6. Đợi vài giây để chạy xong
7. Refresh lại Table Editor để kiểm tra

### Bước 2: Kiểm tra RLS Policies

Sau khi tạo bảng, kiểm tra RLS policies:

1. Vào **Authentication** > **Policies** (hoặc **Table Editor** > chọn bảng `subtasks` > tab **Policies**)
2. Đảm bảo có 4 policies:
   - ✅ Enable read access for all users (SELECT)
   - ✅ Enable insert access for all users (INSERT)
   - ✅ Enable update access for all users (UPDATE)
   - ✅ Enable delete access for all users (DELETE)

**Nếu thiếu policies, chạy lại SQL migration hoặc tạo thủ công:**

```sql
CREATE POLICY "Enable read access for all users" ON subtasks
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON subtasks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON subtasks
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON subtasks
  FOR DELETE USING (true);
```

### Bước 3: Kiểm tra Console để xem lỗi chi tiết

1. Mở ứng dụng: http://localhost:3001
2. Nhấn **F12** để mở Developer Tools
3. Vào tab **Console**
4. Thử thêm subtask lại
5. Xem lỗi chi tiết trong Console

**Các lỗi thường gặp:**

- `relation "subtasks" does not exist` 
  → Bảng chưa được tạo → Chạy migration_subtasks.sql

- `new row violates row-level security policy`
  → RLS policies chưa đúng → Kiểm tra và tạo lại policies

- `permission denied for table subtasks`
  → Không có quyền truy cập → Kiểm tra RLS policies

### Bước 4: Test kết nối trực tiếp

Mở Console (F12) và chạy lệnh này để test:

```javascript
// Test tạo subtask (thay YOUR_TASK_ID bằng ID của một task thực tế)
fetch('https://orucrotvccndrjkujyzf.supabase.co/rest/v1/subtasks', {
  method: 'POST',
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ydWNyb3R2Y2NuZHJqa3VqeXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTE1MDUsImV4cCI6MjA4NTA4NzUwNX0.QK32w5l5Lb64ApzGO6YnD5b-wIm-Nk6hx8JWFmK4BQA',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ydWNyb3R2Y2NuZHJqa3VqeXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTE1MDUsImV4cCI6MjA4NTA4NzUwNX0.QK32w5l5Lb64ApzGO6YnD5b-wIm-Nk6hx8JWFmK4BQA',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify({
    task_id: 'YOUR_TASK_ID_HERE', // Thay bằng ID task thực tế
    title: 'Test subtask',
    is_completed: false
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ Success:', data);
})
.catch(error => {
  console.error('❌ Error:', error);
});
```

### Bước 5: Restart Server

Sau khi fix database:

1. Dừng server: Nhấn **Ctrl+C** trong terminal
2. Chạy lại: `npm run dev`
3. Refresh trình duyệt (F5)

## ✅ Sau khi fix xong

Thử lại thêm subtask trong ứng dụng. Nếu vẫn lỗi, kiểm tra Console để xem thông báo lỗi chi tiết (đã được cải thiện trong code).
