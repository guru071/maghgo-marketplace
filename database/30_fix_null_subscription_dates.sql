-- ==============================================================================
-- 30_fix_null_subscription_dates.sql
--
-- One-time migration to repair legacy merchant rows where subscription_ends_at
-- is NULL or stuck at the Unix epoch (1970), which causes:
--   • isSubscriptionActive() → always returns false  (bot blocks the merchant)
--   • The storefront always shows "Store Unavailable"  (new Date(null) = 1970)
--   • RESUME command is unreachable (sub-gate fires before the handler)
--
-- Safe to run multiple times — the WHERE clause is idempotent.
-- ==============================================================================

-- 1. Fix NULL subscription_ends_at rows.
--    Set to NOW() so the subscription appears expired rather than missing
--    (expired = polite "please renew" message; NULL = silent hard block).
--    An admin can immediately backdate/renew from the dashboard for any merchant
--    that has a valid paid account but just lacks the date.
UPDATE merchants
SET subscription_ends_at = NOW()
WHERE subscription_ends_at IS NULL;

-- 2. Fix epoch dates (anything before 2020 is data corruption, not a real date).
--    Same treatment: mark expired so the merchant gets a proper renewal prompt
--    instead of the confusing "Store Unavailable" screen.
UPDATE merchants
SET subscription_ends_at = NOW()
WHERE subscription_ends_at < '2020-01-01 00:00:00+00';

-- 3. Grant read access to the column for the anon role in case it was missing
--    (harmless if already granted).
GRANT SELECT (subscription_ends_at) ON public.merchants TO anon, authenticated;

-- Verify:
--   SELECT store_slug, subscription_plan, subscription_ends_at, is_active
--   FROM merchants
--   WHERE subscription_ends_at IS NULL OR subscription_ends_at < '2020-01-01'
--   LIMIT 20;
