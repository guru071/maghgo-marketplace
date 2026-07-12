-- ============================================================
-- MAGHGO — Database Migration
-- WhatsApp-to-Web Auto-Catalog Platform
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension (usually enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. MERCHANTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,      -- E.164 format: +919876543210
  password_hash VARCHAR(255),                    -- For web dashboard login
  store_name VARCHAR(100) NOT NULL,
  store_slug VARCHAR(100) UNIQUE NOT NULL,        -- URL-safe slug
  store_description TEXT DEFAULT '',
  store_logo_url TEXT,
  theme_config JSONB,
  is_active BOOLEAN DEFAULT true,
  subscription_plan VARCHAR(20) DEFAULT 'starter'
    CHECK (subscription_plan IN ('inactive', 'basic', 'starter', 'pro', 'advanced', 'premium', 'business', 'agency', 'vip', 'enterprise', 'custom')),
  subscription_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. PRODUCTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  currency VARCHAR(3) DEFAULT 'INR',
  original_image_url TEXT,
  processed_image_url TEXT,
  description TEXT DEFAULT '',
  is_available BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. ORDER LOGS TABLE (for analytics, not payment processing)
-- ============================================================
CREATE TABLE IF NOT EXISTS order_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  customer_phone VARCHAR(20),
  customer_name VARCHAR(100),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
  currency VARCHAR(3) DEFAULT 'INR',
  status VARCHAR(20) DEFAULT 'sent'
    CHECK (status IN ('sent', 'confirmed', 'processing', 'delivered', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3.5. PAYMENTS TABLE (for Razorpay webhooks)
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  razorpay_payment_id VARCHAR(100),
  razorpay_payment_link_id VARCHAR(100),
  amount DECIMAL(10, 2) NOT NULL,
  plan VARCHAR(50) NOT NULL,
  is_yearly BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'captured',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_merchants_phone ON merchants(phone_number);
CREATE INDEX IF NOT EXISTS idx_merchants_slug ON merchants(store_slug);
CREATE INDEX IF NOT EXISTS idx_merchants_active ON merchants(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_merchant ON products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_products_merchant_available 
  ON products(merchant_id, is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_products_sort ON products(merchant_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_order_logs_merchant ON order_logs(merchant_id);
CREATE INDEX IF NOT EXISTS idx_order_logs_status ON order_logs(merchant_id, status);
CREATE INDEX IF NOT EXISTS idx_order_logs_created ON order_logs(created_at DESC);

-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_logs ENABLE ROW LEVEL SECURITY;

-- Public can view active merchants (for storefront)
CREATE POLICY "Public can view active merchants"
  ON merchants FOR SELECT TO anon
  USING (is_active = true);

-- Public can view available products (for storefront)
CREATE POLICY "Public can view available products"
  ON products FOR SELECT TO anon
  USING (is_available = true);

-- Service role can do everything (backend uses service_role key)
-- Note: service_role key bypasses RLS by default in Supabase

-- ============================================================
-- 6. UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_merchants_updated_at
  BEFORE UPDATE ON merchants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_logs_updated_at
  BEFORE UPDATE ON order_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. STORAGE BUCKET (run via Supabase Dashboard or API)
-- ============================================================
-- Create a public bucket called 'product-images' via Dashboard:
-- Storage → New Bucket → Name: product-images → Public: ON
-- Or use the Supabase management API

-- ============================================================
-- 8. SEED DATA (optional — for testing)
-- ============================================================
INSERT INTO merchants (phone_number, store_name, store_slug, store_description)
VALUES 
  ('919876543210', 'Villupuram Threads', 'villupuram-threads', 'Premium handpicked clothing from Villupuram'),
  ('919876543211', 'Chennai Crafts', 'chennai-crafts', 'Handmade artisan crafts from Chennai')
ON CONFLICT (phone_number) DO NOTHING;
