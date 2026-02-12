-- Migration: Add feasibility_percentage column to project_transactions table
-- This allows tracking the feasibility percentage (0-100) for each transaction

-- Add feasibility_percentage column (nullable, 0-100)
ALTER TABLE project_transactions 
ADD COLUMN IF NOT EXISTS feasibility_percentage DECIMAL(5, 2) CHECK (feasibility_percentage >= 0 AND feasibility_percentage <= 100);

-- Add comment
COMMENT ON COLUMN project_transactions.feasibility_percentage IS 'Phần trăm khả thi của giao dịch (0-100)';
