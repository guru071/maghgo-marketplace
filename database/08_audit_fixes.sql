-- ============================================================
-- MAGHGO — Audit Fixes Migration
-- Applies fixes for critical schema issues found during audit
-- ============================================================

-- 1. Fix the overly restrictive CHECK constraint on subscription_plan
ALTER TABLE merchants DROP CONSTRAINT IF EXISTS merchants_subscription_plan_check;
ALTER TABLE merchants ADD CONSTRAINT merchants_subscription_plan_check 
  CHECK (subscription_plan IN ('inactive', 'trial', 'basic', 'starter', 'pro', 'advanced', 'premium', 'business', 'agency', 'vip', 'enterprise', 'custom'));

-- 2. Add the missing theme_config column used by the Store Builder
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS theme_config JSONB;

-- 3. Create the missing payments table to provide an audit trail for Razorpay webhooks
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

-- Add updated_at trigger for payments
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Add index for cleanup job on subscription_plan
CREATE INDEX IF NOT EXISTS idx_merchants_plan ON merchants(subscription_plan);

-- 5. Add triggers for plans and offers tables (from previous migrations)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'plans') THEN
    IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_plans_updated_at') THEN
      CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'offers') THEN
    IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_offers_updated_at') THEN
      CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'platform_settings') THEN
    IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_platform_settings_updated_at') THEN
      CREATE TRIGGER update_platform_settings_updated_at BEFORE UPDATE ON platform_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END IF;
END $$;
