-- ============================================================
-- 5. MULTI-CHANNEL MIGRATION (INSTAGRAM & MESSENGER)
-- ============================================================

ALTER TABLE merchants 
ADD COLUMN IF NOT EXISTS instagram_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS messenger_id VARCHAR(255) UNIQUE;

-- Allow phone_number to be null in case a merchant registers exclusively via social
ALTER TABLE merchants 
ALTER COLUMN phone_number DROP NOT NULL;

-- Create indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_merchants_instagram_id ON merchants(instagram_id);
CREATE INDEX IF NOT EXISTS idx_merchants_messenger_id ON merchants(messenger_id);
