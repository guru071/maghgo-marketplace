-- ==============================================================================
-- 31_grant_missing_anon_columns.sql
--
-- Migrations 17, 27, and 28 added columns to the merchants table but omitted
-- the GRANT SELECT to anon/authenticated that migration 09 made mandatory
-- (09 revoked blanket SELECT and requires every column to be explicitly granted).
--
-- Missing grants:
--   razorpay_key_id      (migration 17) — merchant's Razorpay publishable key,
--                                         needed by the storefront to init checkout
--   telegram_bot_username (migration 27) — public @username of the shop's bot
--   announcement         (migration 28) — scrolling ticker text shown on storefront
--
-- Without these grants, any SELECT that includes even ONE of these columns returns
-- "permission denied for table merchants" from PostgREST — the storefront's
-- fallback regex did not match this error and called notFound(), causing a hard
-- 404 for every store that the frontend tried to load with the full column set.
--
-- Safe to run multiple times (GRANT is idempotent).
-- ==============================================================================

-- Grant the three columns missed by migrations 17, 27, 28.
GRANT SELECT (razorpay_key_id)       ON public.merchants TO anon, authenticated;
GRANT SELECT (telegram_bot_username) ON public.merchants TO anon, authenticated;
GRANT SELECT (announcement)          ON public.merchants TO anon, authenticated;

-- Verify — all three must return data (not permission error) with the anon key:
--   SET ROLE anon;
--   SELECT razorpay_key_id, telegram_bot_username, announcement
--   FROM merchants LIMIT 1;
--   RESET ROLE;
