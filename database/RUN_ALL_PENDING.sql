-- ==============================================================================
-- RUN_ALL_PENDING.sql — one-paste setup
--
-- Paste this WHOLE file into the Supabase SQL Editor and click Run ONCE.
-- It applies migrations 13 → 21 (fulfilment, custom domain, store contact,
-- payments/stock/coupons, shop Razorpay + product specs, variants,
-- Meta catalog, plan feature matrix).
--
-- Every statement is idempotent (IF NOT EXISTS / plain UPDATEs), so running it
-- again — or after some of these were already applied — is completely safe.
-- ==============================================================================


-- ▼▼▼ 13_product_fulfillment.sql ▼▼▼

-- ============================================================
-- MAGHGO — Pre-book vs Buy
--
-- Adds a per-product fulfilment mode:
--   'buy'     — the shop delivers the product to the customer (default)
--   'prebook' — the customer reserves it and collects/pays at the shop
--
-- One line. Safe to run any time. The app reads `fulfillment_type || 'buy'`,
-- so every existing product keeps behaving exactly as before until a merchant
-- explicitly marks one as pre-book — nothing breaks before or after this runs.
--
-- Run this once in the Supabase SQL editor.
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS fulfillment_type VARCHAR(10) NOT NULL DEFAULT 'buy'
  CHECK (fulfillment_type IN ('buy', 'prebook'));

-- Verify:
--   SELECT title, fulfillment_type FROM products LIMIT 5;

-- ▼▼▼ 14_custom_domain.sql ▼▼▼

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

-- ▼▼▼ 15_store_contact.sql ▼▼▼

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

-- ▼▼▼ 16_commerce_features.sql ▼▼▼

-- ==============================================================================
-- 16_commerce_features.sql
-- Closes the commerce loop: online payment on customer orders, order-status
-- notifications, product stock, discount coupons, and the store QR code.
--
-- Everything here is additive and guarded with IF NOT EXISTS, so running it more
-- than once is safe. The application degrades gracefully until this is applied:
-- payments/stock/coupons simply stay off, nothing breaks.
-- ==============================================================================

-- ── 1. Online payment on customer orders ─────────────────────────────────────
-- A shopper can pay for their order with a real Razorpay link instead of only
-- arranging it manually in chat.
ALTER TABLE order_logs ADD COLUMN IF NOT EXISTS payment_status  TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE order_logs ADD COLUMN IF NOT EXISTS payment_link_url TEXT;
ALTER TABLE order_logs ADD COLUMN IF NOT EXISTS payment_link_id  TEXT;
ALTER TABLE order_logs ADD COLUMN IF NOT EXISTS paid_at          TIMESTAMP WITH TIME ZONE;

-- Discount applied to this order (₹), and the coupon that produced it.
ALTER TABLE order_logs ADD COLUMN IF NOT EXISTS discount    NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE order_logs ADD COLUMN IF NOT EXISTS coupon_code TEXT;

-- The webhook looks orders up by their Razorpay payment-link id.
CREATE INDEX IF NOT EXISTS idx_order_logs_payment_link ON order_logs(payment_link_id);

-- ── 2. Product stock / inventory ─────────────────────────────────────────────
-- NULL means "not tracked" (sell freely). A number is the quantity on hand and
-- is decremented as orders come in; 0 shows as "Out of stock".
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER;

-- ── 3. Discount coupons ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id    UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    code           TEXT NOT NULL,
    discount_type  TEXT NOT NULL CHECK (discount_type IN ('percent', 'flat')),
    discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
    is_active      BOOLEAN NOT NULL DEFAULT true,
    max_uses       INTEGER,               -- NULL = unlimited
    used_count     INTEGER NOT NULL DEFAULT 0,
    min_order      NUMERIC NOT NULL DEFAULT 0,
    expires_at     TIMESTAMP WITH TIME ZONE,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (merchant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_coupons_merchant ON coupons(merchant_id);

-- Coupons are read and written only through the backend service_role key, never
-- from the browser, so RLS stays on with no public policy (default deny).
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- Done. No data migration required.
-- ==============================================================================

-- ▼▼▼ 17_merchant_payments_and_specs.sql ▼▼▼

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

-- ▼▼▼ 18_product_variants.sql ▼▼▼

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

-- ▼▼▼ 20_meta_catalog.sql ▼▼▼

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

-- ▼▼▼ 21_plan_feature_matrix.sql ▼▼▼

-- ==============================================================================
-- 21_plan_feature_matrix.sql
-- Make the advertised plan features match what the code now ENFORCES.
--
-- The single source of truth is backend/src/utils/plans.ts:
--   channels : basic=WhatsApp · starter=+Instagram · pro=all channels
--   coupons  : starter+        premium themes : starter+
--   domain   : pro+            Meta catalog import : pro+
--   white-label : business+
-- Free on EVERY plan (the core selling loop is never paywalled): storefront,
-- orders + customer WhatsApp updates, online payments via the shop's own
-- Razorpay, stock tracking, product details/specs/options, store QR.
--
-- Migration 10 last set these lists; they still advertised the removed
-- "Visual Store Builder" and missed everything shipped since. Idempotent.
-- ==============================================================================

UPDATE plans SET features = '["Up to 50 Products", "WhatsApp Store Bot", "Online Payments (your own Razorpay)", "Orders + Customer WhatsApp Updates", "Stock, Details & Size/Colour Options", "Store QR Code"]'::jsonb WHERE slug = 'basic';

UPDATE plans SET features = '["Up to 200 Products", "WhatsApp + Instagram Bots", "Discount Coupons", "50+ Premium Themes", "Online Payments (your own Razorpay)", "Orders + Customer WhatsApp Updates"]'::jsonb WHERE slug = 'starter';

UPDATE plans SET features = '["Up to 1,000 Products", "All Channels (WhatsApp, Instagram, Messenger, SMS)", "Custom Domain", "Meta Catalog Import (FB/Insta Shop)", "Discount Coupons + Premium Themes", "Priority Support"]'::jsonb WHERE slug = 'pro';

UPDATE plans SET features = '["Up to 5,000 Products", "All Channels", "Custom Domain", "Meta Catalog Import", "Discount Coupons + Premium Themes", "Priority Support"]'::jsonb WHERE slug = 'advanced';

UPDATE plans SET features = '["Up to 10,000 Products", "All Channels", "Custom Domain", "Meta Catalog Import", "Discount Coupons + Premium Themes", "24/7 Priority Support"]'::jsonb WHERE slug = 'premium';

UPDATE plans SET features = '["Up to 25,000 Products", "Everything in Premium", "White-label Storefront (no Maghgo branding)", "Dedicated Account Manager"]'::jsonb WHERE slug = 'business';

UPDATE plans SET features = '["Up to 50,000 Products", "Everything in Business", "White-label Storefront", "Dedicated Account Manager"]'::jsonb WHERE slug = 'agency';

UPDATE plans SET features = '["Up to 100,000 Products", "Everything in Agency", "Full White-label", "SLA Guarantee"]'::jsonb WHERE slug = 'vip';

UPDATE plans SET features = '["Up to 500,000 Products", "Everything in VIP", "Full White-label", "SLA Guarantee", "On-site Support"]'::jsonb WHERE slug = 'enterprise';

-- 'custom' stays bespoke.

-- ==============================================================================
-- Done.
-- ==============================================================================
