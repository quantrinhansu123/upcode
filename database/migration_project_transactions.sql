-- Migration: Add project transactions (thu chi) table

-- Create project_transactions table to track income and expenses
CREATE TABLE IF NOT EXISTS project_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')), -- 'income' = thu, 'expense' = chi
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recipient_id UUID REFERENCES employees(id) ON DELETE SET NULL, -- Người nhận (chỉ cho expense)
  receipt_image_url TEXT, -- URL ảnh hóa đơn (chỉ cho expense)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns if table already exists (for migration)
ALTER TABLE project_transactions ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE project_transactions ADD COLUMN IF NOT EXISTS receipt_image_url TEXT;

-- Enable Row Level Security (RLS) for project_transactions
ALTER TABLE project_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
-- Drop policy if it exists to avoid "policy already exists" error
DROP POLICY IF EXISTS "Allow all access to project_transactions" ON project_transactions;

CREATE POLICY "Allow all access to project_transactions" ON project_transactions
  FOR ALL USING (true) WITH CHECK (true);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_transactions_project_id ON project_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_transactions_type ON project_transactions(type);
CREATE INDEX IF NOT EXISTS idx_project_transactions_transaction_date ON project_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_project_transactions_recipient_id ON project_transactions(recipient_id) WHERE recipient_id IS NOT NULL;
-- Composite index for common queries (project + type + date)
CREATE INDEX IF NOT EXISTS idx_project_transactions_project_type_date ON project_transactions(project_id, type, transaction_date DESC);

-- ============================================
-- Insert Sample Data (Optional)
-- ============================================

-- Sample Income transactions (Thu)
INSERT INTO project_transactions (project_id, type, amount, description, transaction_date)
SELECT 
  p.id,
  'income',
  5000000.00,
  'Thanh toán đợt 1 từ khách hàng',
  NOW() - INTERVAL '10 days'
FROM projects p
WHERE p.name = 'Website Redesign'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO project_transactions (project_id, type, amount, description, transaction_date)
SELECT 
  p.id,
  'income',
  3000000.00,
  'Thanh toán đợt 2 - 50% còn lại',
  NOW() - INTERVAL '5 days'
FROM projects p
WHERE p.name = 'Website Redesign'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Sample Expense transactions (Chi)
INSERT INTO project_transactions (project_id, type, amount, description, transaction_date, recipient_id)
SELECT 
  p.id,
  'expense',
  500000.00,
  'Chi phí thiết kế UI/UX',
  NOW() - INTERVAL '8 days',
  (SELECT id FROM employees LIMIT 1)
FROM projects p
WHERE p.name = 'Website Redesign'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO project_transactions (project_id, type, amount, description, transaction_date, recipient_id)
SELECT 
  p.id,
  'expense',
  200000.00,
  'Chi phí hosting và domain',
  NOW() - INTERVAL '3 days',
  NULL
FROM projects p
WHERE p.name = 'Website Redesign'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Sample transactions for Mobile App Development
INSERT INTO project_transactions (project_id, type, amount, description, transaction_date)
SELECT 
  p.id,
  'income',
  10000000.00,
  'Thanh toán đợt đầu dự án mobile app',
  NOW() - INTERVAL '15 days'
FROM projects p
WHERE p.name = 'Mobile App Development'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO project_transactions (project_id, type, amount, description, transaction_date, recipient_id)
SELECT 
  p.id,
  'expense',
  1500000.00,
  'Chi phí phát triển backend',
  NOW() - INTERVAL '12 days',
  (SELECT id FROM employees LIMIT 1)
FROM projects p
WHERE p.name = 'Mobile App Development'
LIMIT 1
ON CONFLICT DO NOTHING;