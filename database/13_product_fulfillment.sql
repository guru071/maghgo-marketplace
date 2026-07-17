-- ============================================================
-- MAGHGO — Pre-book vs Buy
--
-- Adds a per-product fulfilment mode:
--   'buy'     — the shop delivers the product to the customer (default)
--   'prebook' — the customer reserves it and collects/pays at the shop
--
-- One line. Safe to run any time. The app reads `fulfillment_type || 'buy'`,
-- so every existing product keeps behaving exactly as before until a merchant
-- explicitly marks one as pre-book — nothing breaks before or after this runs.
--
-- Run this once in the Supabase SQL editor.
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS fulfillment_type VARCHAR(10) NOT NULL DEFAULT 'buy'
  CHECK (fulfillment_type IN ('buy', 'prebook'));

-- Verify:
--   SELECT title, fulfillment_type FROM products LIMIT 5;
