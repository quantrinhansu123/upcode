# 🔧 Hướng dẫn khắc phục: Ứng dụng không hiển thị dữ liệu

## ✅ Bước 1: Kiểm tra Console (QUAN TRỌNG)

1. Mở trình duyệt tại **http://localhost:3001**
2. Nhấn **F12** để mở Developer Tools
3. Vào tab **Console**
4. Xem có lỗi gì không (thường là màu đỏ)

**Các lỗi thường gặp:**
- `relation "projects" does not exist` → Database chưa được setup
- `Invalid API key` → Supabase credentials sai
- `Network error` → Không kết nối được Supabase

## ✅ Bước 2: Kiểm tra Database đã được setup chưa

1. Truy cập: https://app.supabase.com
2. Đăng nhập và chọn project: `orucrotvccndrjkujyzf`
3. Vào **Table Editor** (sidebar trái)
4. Kiểm tra xem có 2 tables: `projects` và `tasks` không

**Nếu CHƯA có tables:**
1. Vào **SQL Editor** (sidebar trái)
2. Click **New Query**
3. Mở file `database/schema.sql` trong VS Code
4. Copy TOÀN BỘ nội dung (Ctrl+A, Ctrl+C)
5. Paste vào SQL Editor trên Supabase
6. Click **Run** (hoặc Ctrl+Enter)
7. Đợi vài giây để chạy xong
8. Refresh lại Table Editor để kiểm tra

## ✅ Bước 3: Tạo dữ liệu mẫu (nếu database trống)

Sau khi setup database xong, nếu chưa có dữ liệu:

**Cách 1: Tạo từ UI**
1. Trong ứng dụng, click nút **"+"** bên cạnh "Dự án" (sidebar trái)
2. Tạo một project mới
3. Click nút **"Thêm việc"** (góc trên bên phải)
4. Tạo task đầu tiên

**Cách 2: Chạy SQL để thêm dữ liệu mẫu**
1. Vào Supabase Dashboard > SQL Editor
2. Chạy đoạn SQL này:

```sql
-- Thêm projects mẫu
INSERT INTO projects (name, description, color) VALUES
  ('Website Redesign', 'Redesign company website with modern UI/UX', '#3b82f6'),
  ('Mobile App Development', 'Build cross-platform mobile application', '#10b981'),
  ('Marketing Campaign', 'Q1 Marketing campaign planning and execution', '#f59e0b')
ON CONFLICT DO NOTHING;

-- Thêm tasks mẫu
INSERT INTO tasks (project_id, title, description, deadline, priority) 
SELECT 
  p.id,
  'Create wireframes',
  'Design initial wireframes for all pages',
  NOW() + INTERVAL '7 days',
  'High'
FROM projects p
WHERE p.name = 'Website Redesign'
LIMIT 1
ON CONFLICT DO NOTHING;
```

## ✅ Bước 4: Restart Server

Sau khi setup database:

1. Dừng server hiện tại: Nhấn **Ctrl+C** trong terminal
2. Chạy lại: `npm run dev`
3. Refresh trình duyệt (F5)

## 🔍 Kiểm tra nhanh

Mở Console (F12) và chạy lệnh này để test kết nối:

```javascript
// Test kết nối Supabase
fetch('https://orucrotvccndrjkujyzf.supabase.co/rest/v1/projects?select=count', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ydWNyb3R2Y2NuZHJqa3VqeXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTE1MDUsImV4cCI6MjA4NTA4NzUwNX0.QK32w5l5Lb64ApzGO6YnD5b-wIm-Nk6hx8JWFmK4BQA',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ydWNyb3R2Y2NuZHJqa3VqeXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTE1MDUsImV4cCI6MjA4NTA4NzUwNX0.QK32w5l5Lb64ApzGO6YnD5b-wIm-Nk6hx8JWFmK4BQA'
  }
}).then(r => r.json()).then(console.log).catch(console.error);
```

Nếu thấy lỗi `relation "projects" does not exist` → Cần chạy schema.sql như ở Bước 2.

## 📞 Vẫn không được?

Kiểm tra:
- ✅ File `.env.local` có đúng credentials không?
- ✅ Server đã restart sau khi tạo `.env.local` chưa?
- ✅ Database tables đã được tạo chưa?
- ✅ Console có lỗi gì không?
