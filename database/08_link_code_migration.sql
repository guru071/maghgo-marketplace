-- ============================================================
-- 8. MULTI-CHANNEL LINK CODE MIGRATION
-- ============================================================

-- Add link_code column to allow merchants to securely link multiple social channels
ALTER TABLE merchants 
ADD COLUMN IF NOT EXISTS link_code VARCHAR(10) UNIQUE;

-- Create an index for fast lookups when a user types LINK <code>
CREATE INDEX IF NOT EXISTS idx_merchants_link_code ON merchants(link_code);
