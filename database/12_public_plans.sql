-- ============================================================
-- MAGHGO — Separate "sellable" plans from "grandfathered" plans
--
-- WHY: the pricing page offered nine paid tiers whose only real difference was
-- a product limit. Pro (₹249) and Advanced (₹349) were identical apart from
-- 1,000 vs 5,000 products; Business (₹749) and Agency (₹999) apart from 25,000
-- vs 50,000. Nobody selling through Instagram DMs has 25,000 products, so the
-- higher tiers charged for a number the merchant would never approach.
--
-- The genuine feature breaks in the code are only three:
--   starter  -> Visual Builder + Premium Themes
--   pro      -> all channels
--   business -> white-label storefront
-- which gives four sellable tiers, plus Custom for bespoke deals.
--
-- Deprecated tiers are HIDDEN, NOT DELETED. Merchants are still on them (as of
-- writing, one is on 'vip'), and dropping the row would make getProductLimit()
-- fall back to the 50-product default — locking a paying merchant out of their
-- own catalogue. They keep their plan, price and limits for as long as they
-- stay on it.
-- ============================================================

ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

COMMENT ON COLUMN plans.is_public IS
  'Show this plan on the public pricing page. Deprecated tiers stay in the table with is_public = false so existing merchants keep their limits.';

-- The four tiers we actually sell, plus Custom (rendered separately as a
-- "contact us" card via is_custom).
UPDATE plans SET is_public = true
WHERE slug IN ('basic', 'starter', 'pro', 'business', 'custom');

-- Grandfathered: no longer sellable, still fully honoured for anyone on them.
UPDATE plans SET is_public = false
WHERE slug IN ('advanced', 'premium', 'agency', 'vip', 'enterprise');

-- 'pro' is the recommended tier: it is the first with all channels.
UPDATE plans SET is_popular = (slug = 'pro');

-- Verify:
--   SELECT slug, monthly_price, product_limit, is_public, is_popular
--   FROM plans ORDER BY monthly_price;
--
-- And confirm nobody is stranded (every merchant's plan must still exist):
--   SELECT m.subscription_plan, count(*)
--   FROM merchants m LEFT JOIN plans p ON p.slug = m.subscription_plan
--   WHERE p.slug IS NULL GROUP BY 1;
