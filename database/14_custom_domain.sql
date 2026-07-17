-- ============================================================
-- MAGHGO — Custom domain
--
-- Lets a merchant point their own domain (e.g. rameshmobiles.com) at their
-- Maghgo storefront. This column stores the domain they've claimed; the actual
-- routing is completed by adding the domain in the hosting provider (Vercel)
-- and pointing DNS — see the dashboard's Custom Domain page for the exact
-- records.
--
-- Unique so two merchants can't claim the same domain. NULL means "not set",
-- which is every existing merchant, so nothing changes until one is saved.
--
-- Run this once in the Supabase SQL editor.
-- ============================================================

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_merchants_custom_domain
  ON merchants (custom_domain)
  WHERE custom_domain IS NOT NULL;

-- Verify:
--   SELECT store_slug, custom_domain FROM merchants WHERE custom_domain IS NOT NULL;
