-- ============================================================
-- MAGHGO — Store address (location)
--
-- Adds a free-text address the storefront shows as a "Visit us" block with a
-- Google Maps *link* (a plain URL, no Maps API / key involved). Contacts
-- (phone, Instagram, Facebook, X) already exist on the merchant row.
--
-- Nullable, so every existing store is unaffected until an address is saved.
-- Also grant the column to anon so the public storefront can read it.
--
-- Run this once in the Supabase SQL editor.
-- ============================================================

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS store_address TEXT;

-- Public storefront reads via the anon role (see migration 09), so it needs
-- read access to the new column.
GRANT SELECT (store_address) ON public.merchants TO anon, authenticated;

-- Verify:
--   SELECT store_slug, store_address FROM merchants WHERE store_address IS NOT NULL;
