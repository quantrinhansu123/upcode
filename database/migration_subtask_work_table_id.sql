-- Migration: Add work_table_id to subtasks table
-- Liên kết subtask với bảng làm việc (vấn đề giải pháp)

ALTER TABLE subtasks
ADD COLUMN IF NOT EXISTS work_table_id UUID REFERENCES work_tables(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_subtasks_work_table_id ON subtasks(work_table_id);
