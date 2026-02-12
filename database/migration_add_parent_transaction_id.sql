-- Migration: Add parent_transaction_id column to project_transactions table
-- This allows transactions to have a parent-child relationship
-- For example: A "pending expense" can have child transactions representing partial payments

-- Add parent_transaction_id column (nullable, references project_transactions.id)
ALTER TABLE project_transactions 
ADD COLUMN IF NOT EXISTS parent_transaction_id UUID REFERENCES project_transactions(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_project_transactions_parent_id 
ON project_transactions(parent_transaction_id);

-- Add comment
COMMENT ON COLUMN project_transactions.parent_transaction_id IS 'Reference to parent transaction (for child transactions created from pending expenses)';
