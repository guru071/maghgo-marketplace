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
