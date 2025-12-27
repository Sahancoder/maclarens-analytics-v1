-- McLarens Analytics - Database Migration
-- Add P&L Template fields to financial_data table
-- Version: 2.0
-- Date: 2025-12-27

-- ============================================
-- MIGRATION: Add Excel P&L Template Fields
-- ============================================

-- Add exchange rate column
ALTER TABLE financial_data 
ADD COLUMN IF NOT EXISTS exchange_rate FLOAT DEFAULT 1.0;

-- Add Revenue fields
ALTER TABLE financial_data 
ADD COLUMN IF NOT EXISTS revenue_lkr_actual FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS revenue_lkr_budget FLOAT DEFAULT 0;

-- Add GP fields
ALTER TABLE financial_data 
ADD COLUMN IF NOT EXISTS gp_actual FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS gp_budget FLOAT DEFAULT 0;

-- Add Other Income fields
ALTER TABLE financial_data 
ADD COLUMN IF NOT EXISTS other_income_actual FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_income_budget FLOAT DEFAULT 0;

-- Add Expense Breakdown fields
ALTER TABLE financial_data 
ADD COLUMN IF NOT EXISTS personal_exp_actual FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS personal_exp_budget FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS admin_exp_actual FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS admin_exp_budget FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS selling_exp_actual FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS selling_exp_budget FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS finance_exp_actual FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS finance_exp_budget FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS depreciation_actual FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS depreciation_budget FLOAT DEFAULT 0;

-- Add Adjustment fields
ALTER TABLE financial_data 
ADD COLUMN IF NOT EXISTS provisions_actual FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS provisions_budget FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS exchange_gl_actual FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS exchange_gl_budget FLOAT DEFAULT 0;

-- Add Non-Operating fields
ALTER TABLE financial_data 
ADD COLUMN IF NOT EXISTS non_ops_exp_actual FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS non_ops_exp_budget FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS non_ops_income_actual FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS non_ops_income_budget FLOAT DEFAULT 0;

-- Add Azure OID to users table for Microsoft auth
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS azure_oid VARCHAR(255) UNIQUE;

-- Create index on azure_oid for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_azure_oid ON users(azure_oid);

-- ============================================
-- DATA MIGRATION: Copy legacy data to new fields
-- ============================================

-- Copy legacy revenue data to new LKR fields
UPDATE financial_data 
SET revenue_lkr_actual = revenue_actual,
    revenue_lkr_budget = revenue_budget
WHERE revenue_lkr_actual = 0 AND revenue_actual > 0;

-- Estimate GP from revenue - cost (temporary until proper data is entered)
UPDATE financial_data 
SET gp_actual = revenue_actual - cost_actual,
    gp_budget = revenue_budget - cost_budget
WHERE gp_actual = 0 AND revenue_actual > 0;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check new columns exist
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'financial_data' 
-- ORDER BY ordinal_position;

-- Check migration success
-- SELECT COUNT(*) as rows_migrated 
-- FROM financial_data 
-- WHERE revenue_lkr_actual > 0;

-- ============================================
-- ROLLBACK (if needed)
-- ============================================

-- To rollback, run:
-- ALTER TABLE financial_data 
--   DROP COLUMN IF EXISTS exchange_rate,
--   DROP COLUMN IF EXISTS revenue_lkr_actual,
--   DROP COLUMN IF EXISTS revenue_lkr_budget,
--   ... (continue for all new columns)
