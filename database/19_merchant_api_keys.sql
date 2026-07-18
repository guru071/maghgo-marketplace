-- ==============================================================================
-- 19_merchant_api_keys.sql
-- Gives each shop a developer API key so their own website or any external
-- system can sync products and read orders over HTTP — the no-approval-needed
-- alternative to a Meta catalog integration.
--
-- Security: we store only a SHA-256 HASH of the key (never the key itself), plus
-- a short non-secret prefix for display ("mgk_live_ab12…"). The full key is shown
-- exactly once, at generation time. Read only by the backend service_role key.
--
-- Additive and idempotent; the app degrades gracefully until applied (the API
-- and the dashboard's "API" panel simply report not-configured).
-- ==============================================================================

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS api_key_hash       TEXT;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS api_key_prefix     TEXT;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS api_key_created_at TIMESTAMP WITH TIME ZONE;

-- The API auth middleware looks a merchant up by this hash on every request.
CREATE INDEX IF NOT EXISTS idx_merchants_api_key_hash ON merchants(api_key_hash);

-- ==============================================================================
-- Done. No data migration required.
-- ==============================================================================
