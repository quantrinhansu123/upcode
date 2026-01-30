# Hướng dẫn Cập nhật Database

Để sử dụng đầy đủ tính năng, vui lòng chạy các script sau trong **Supabase SQL Editor**:

1.  **Gán Người Phụ Trách (Mới)**
    Chạy `database/migration_task_assignee.sql`:
    ```sql
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES employees(id) ON DELETE SET NULL;
    ```

2.  **Loại Công việc**
    Chạy `database/migration_task_types.sql`.

3.  **Nhân sự**
    Chạy `database/migration_employees.sql`.

4.  **Task & Sessions (Cơ bản)**
    (Các script tạo bảng tasks, work_sessions đã có từ trước)

Sau khi chạy xong, hãy **Reload** trang web.
