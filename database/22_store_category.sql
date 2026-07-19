-- ==============================================================================
-- 22_store_category.sql
-- What kind of shop this is (Clothing, Electronics, Grocery…). Asked during
-- registration (bot wizard + web form) and editable any time (SET CATEGORY /
-- dashboard Settings). Additive and idempotent; degrades gracefully until run.
-- ==============================================================================

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS store_category TEXT;
