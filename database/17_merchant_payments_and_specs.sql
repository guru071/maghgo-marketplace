-- ==============================================================================
-- 17_merchant_payments_and_specs.sql
-- Two things that make Maghgo a real e-commerce platform rather than a demo:
--
--   1. Shop owners connect THEIR OWN Razorpay account, so money a customer pays
--      for an order lands in the shop's bank — not the platform's. (Subscription
--      payments to Maghgo keep using the platform keys, unchanged.)
--
--   2. Products carry proper details: a category and a list of specifications
--      (label/value pairs), so storefronts show real product pages.
--
-- Additive and idempotent. The app degrades gracefully until this is applied:
-- "Connect Razorpay" simply reports not-configured, specs render as empty.
-- ==============================================================================

-- ── 1. Per-merchant Razorpay credentials ─────────────────────────────────────
-- SECURITY: razorpay_key_secret is a live secret. It is NEVER included in any
-- column list sent to the browser (see MERCHANT_PUBLIC_COLUMNS / storefront
-- selects) and is read only by the backend service_role key. Encrypting it at
-- rest (pgcrypto / KMS) is recommended hardening.
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS razorpay_key_id     TEXT;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS razorpay_key_secret TEXT;

-- ── 2. Product details / specifications ──────────────────────────────────────
-- `description` already exists on products. Add a category and structured specs.
ALTER TABLE products ADD COLUMN IF NOT EXISTS category       TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS specifications JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ==============================================================================
-- Done. No data migration required.
-- ==============================================================================
