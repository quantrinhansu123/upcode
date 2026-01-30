# ⏱️ Hướng dẫn Setup Timer cho Subtasks

## ✅ Đã hoàn thành

- ✅ Thêm timer vào subtask (thay vì task)
- ✅ Tính tổng giờ từ tất cả subtasks cho task
- ✅ Nút Start/Pause trong mỗi subtask
- ✅ Hiển thị timer đang chạy và tổng giờ đã làm

## 🗄️ Bước 1: Chạy Migration SQL

Bạn cần chạy migration SQL để tạo bảng `subtask_work_sessions`:

1. Truy cập: https://app.supabase.com
2. Chọn project: `orucrotvccndrjkujyzf`
3. Vào **SQL Editor** → **New Query**
4. Copy toàn bộ nội dung từ file `database/migration_subtask_sessions.sql`
5. Paste và **Run**

### SQL Migration:

```sql
-- Create work_sessions table for subtasks
CREATE TABLE IF NOT EXISTS subtask_work_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subtask_id UUID NOT NULL REFERENCES subtasks(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_subtask_sessions_subtask_id ON subtask_work_sessions(subtask_id);
CREATE INDEX IF NOT EXISTS idx_subtask_sessions_ended_at ON subtask_work_sessions(ended_at);

-- Enable RLS
ALTER TABLE subtask_work_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON subtask_work_sessions;
DROP POLICY IF EXISTS "Enable insert access for all users" ON subtask_work_sessions;
DROP POLICY IF EXISTS "Enable update access for all users" ON subtask_work_sessions;
DROP POLICY IF EXISTS "Enable delete access for all users" ON subtask_work_sessions;

-- RLS Policies for subtask_work_sessions
CREATE POLICY "Enable read access for all users" ON subtask_work_sessions
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON subtask_work_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON subtask_work_sessions
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON subtask_work_sessions
  FOR DELETE USING (true);
```

## 🎯 Cách sử dụng

### 1. Thêm Subtask
- Click vào task
- Click "Thêm subtask"
- Nhập tên subtask

### 2. Bắt đầu Timer
- Click nút **▶️ Play** bên cạnh subtask
- Timer sẽ bắt đầu đếm và hiển thị thời gian đã làm

### 3. Tạm dừng Timer
- Click nút **⏸️ Pause** để tạm dừng
- Thời gian đã làm sẽ được lưu

### 4. Xem Tổng Giờ
- Tổng giờ từ tất cả subtasks sẽ hiển thị ở task level
- Format: "Tổng: X.Xh"

## 📊 Tính năng

- ✅ Timer riêng cho mỗi subtask
- ✅ Tự động tính tổng giờ từ tất cả subtasks
- ✅ Hiển thị timer đang chạy (màu indigo, có animation)
- ✅ Hiển thị tổng giờ đã làm (màu slate)
- ✅ Nhiều sessions cho mỗi subtask (có thể start/pause nhiều lần)

## 🔍 Kiểm tra

Sau khi chạy migration:

1. Refresh ứng dụng (F5)
2. Thêm một subtask mới
3. Click nút Play để bắt đầu timer
4. Kiểm tra xem timer có hiển thị không
5. Click Pause để tạm dừng
6. Kiểm tra tổng giờ ở task level

## ⚠️ Lưu ý

- Timer chỉ hoạt động khi subtask chưa hoàn thành
- Tổng giờ chỉ tính các sessions đã kết thúc (có ended_at)
- Timer đang chạy sẽ được tính real-time và hiển thị riêng
