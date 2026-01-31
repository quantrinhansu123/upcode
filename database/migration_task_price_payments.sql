-- Migration: Add price to tasks and create task_payments table

-- 1. Add price column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS price DECIMAL(12, 2) DEFAULT 0;

-- 2. Create task_payments table to track payment history
CREATE TABLE IF NOT EXISTS task_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payment_method VARCHAR(50), -- 'cash', 'bank_transfer', 'other'
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS) for task_payments
ALTER TABLE task_payments ENABLE ROW LEVEL SECURITY;

-- 4. Create policies for public access
-- Drop policy if it exists to avoid "policy already exists" error
DROP POLICY IF EXISTS "Allow all access to task_payments" ON task_payments;

CREATE POLICY "Allow all access to task_payments" ON task_payments
  FOR ALL USING (true) WITH CHECK (true);

-- 5. Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_task_payments_task_id ON task_payments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_payments_payment_date ON task_payments(payment_date);
