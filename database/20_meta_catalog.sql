-- ==============================================================================
-- 20_meta_catalog.sql
-- Lets a shop connect its OWN Facebook/Instagram (Meta) product catalogue and
-- import those products into Maghgo, where they then appear on the storefront
-- and in the chat bot like any other product.
--
-- The shop provides a Catalog ID and a Meta access token that has access to
-- that catalogue (from Meta Business settings / a System User). Reading your own
-- catalogue with your own token needs no Meta App Review.
--
-- Security: meta_catalog_token is a live secret — encrypted at rest and never
-- sent to any browser. Read only by the backend service_role key.
--
-- Additive and idempotent; degrades gracefully until applied.
-- ==============================================================================

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS meta_catalog_id        TEXT;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS meta_catalog_token     TEXT; -- encrypted
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS meta_catalog_last_sync TIMESTAMP WITH TIME ZONE;

-- ==============================================================================
-- Done. No data migration required.
-- ==============================================================================
