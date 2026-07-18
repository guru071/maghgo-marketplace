-- ==============================================================================
-- 18_product_variants.sql
-- Flipkart-style product options: a shirt can offer Size (S/M/L) and Colour
-- (Red/Blue), a phone can offer Storage (128/256GB), etc. The customer picks a
-- value for each option before adding to the cart, and their choice travels with
-- the order.
--
-- Shape: an array of option groups —
--   [{"name":"Size","values":["S","M","L","XL"]},
--    {"name":"Colour","values":["Red","Blue","Black"]}]
--
-- Additive and idempotent; the app degrades gracefully until this is applied
-- (products simply have no options to choose).
-- ==============================================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS variants JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ==============================================================================
-- Done. No data migration required.
-- ==============================================================================
