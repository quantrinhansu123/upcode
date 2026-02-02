-- Migration: Add payment_date and status to project_transactions
-- payment_date: Ngày thu (cho income) hoặc ngày sẽ chi (cho expense)
-- status: 'pending' (chờ thanh toán/chờ chi) hoặc 'paid' (đã thanh toán/đã chi)

-- Add payment_date column
ALTER TABLE project_transactions 
ADD COLUMN IF NOT EXISTS payment_date DATE;

-- Add status column
ALTER TABLE project_transactions 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) CHECK (status IN ('pending', 'paid'));

-- Set default status for existing transactions
UPDATE project_transactions 
SET status = 'paid' 
WHERE status IS NULL;

-- Add comment
COMMENT ON COLUMN project_transactions.payment_date IS 'Ngày thu tiền (cho income) hoặc ngày sẽ chi (cho expense)';
COMMENT ON COLUMN project_transactions.status IS 'Trạng thái: pending (chờ thanh toán/chờ chi) hoặc paid (đã thanh toán/đã chi)';
