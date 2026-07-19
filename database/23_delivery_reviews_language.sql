-- ==============================================================================
-- 23_delivery_reviews_language.sql
-- Three features in one additive migration:
--   1. Delivery address on orders — checkout finally captures WHERE to deliver.
--   2. Real store ratings — customers rate after delivery (RATE 1-5 in chat);
--      the storefront shows the average. Replaces the fake testimonials we
--      removed with something honest.
--   3. Store bot language — the shopper-facing bot can speak Tamil/Hindi.
-- Idempotent; the app degrades gracefully until applied.
-- ==============================================================================

-- 1. Delivery address
ALTER TABLE order_logs ADD COLUMN IF NOT EXISTS delivery_address TEXT;

-- 2. Ratings (one per order; only delivered orders get the RATE prompt)
CREATE TABLE IF NOT EXISTS store_reviews (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id    UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    order_id       UUID NOT NULL UNIQUE REFERENCES order_logs(id) ON DELETE CASCADE,
    rating         INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment        TEXT,
    customer_phone TEXT,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_reviews_merchant ON store_reviews(merchant_id);

-- Ratings are public content (shown on every storefront), but only the backend
-- writes them. RLS on + anon may read rating/created_at rows; writes stay
-- service-role-only (no insert/update policy for anon).
ALTER TABLE store_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "store_reviews_public_read" ON store_reviews;
CREATE POLICY "store_reviews_public_read" ON store_reviews FOR SELECT USING (true);

-- 3. Shopper-bot language ('en' default; 'ta' Tamil, 'hi' Hindi)
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS bot_language TEXT DEFAULT 'en';

-- ==============================================================================
-- Done.
-- ==============================================================================
