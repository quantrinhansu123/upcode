-- Migration: Add price column to projects table

-- Add price column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS price DECIMAL(12, 2) DEFAULT 0;
