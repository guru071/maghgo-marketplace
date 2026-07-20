-- ==============================================================================
-- 28_mrp_announcement.sql
-- Real-e-commerce polish (modelled on classic Indian shop sites):
--   1. products.mrp — the "was" price. Card shows a "₹110 Off" badge and the
--      MRP struck through next to the selling price.
--   2. merchants.announcement — the scrolling offer ticker across the top of
--      the storefront ("Free delivery over ₹499 ✨ …").
-- Additive & idempotent.
-- ==============================================================================

ALTER TABLE products  ADD COLUMN IF NOT EXISTS mrp NUMERIC;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS announcement TEXT;
