-- ==============================================================================
-- 07_dynamic_plans_and_offers.sql
-- Moves hardcoded pricing plans to the database and adds promotional offers
-- ==============================================================================

-- 1. Create Plans Table
CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    monthly_price INTEGER NOT NULL,
    yearly_price INTEGER NOT NULL,
    product_limit INTEGER NOT NULL,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    description TEXT,
    color_theme VARCHAR(50),
    button_variant VARCHAR(50),
    is_popular BOOLEAN DEFAULT false,
    is_custom BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Allow public read access to plans
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view plans" ON plans FOR SELECT TO public USING (true);

-- Insert seed data for plans
INSERT INTO plans (slug, name, monthly_price, yearly_price, product_limit, description, color_theme, button_variant, is_popular, is_custom, features) VALUES
('basic', 'Basic', 99, 1010, 50, 'Perfect for starting out', 'gray', 'outline', false, false, '["Up to 50 Products", "WhatsApp Integration", "Basic Analytics", "Standard Support", "Shared Subdomain"]'::jsonb),
('starter', 'Starter', 149, 1520, 200, 'Great for small businesses', 'gray', 'outline', false, false, '["Up to 200 Products", "WhatsApp + Instagram", "Basic Analytics", "Standard Support", "Shared Subdomain"]'::jsonb),
('pro', 'Pro', 249, 2540, 1000, 'Most popular for growing stores', 'blue', 'primary', true, false, '["Up to 1,000 Products", "All Channels", "Advanced Analytics", "Priority Support", "Custom Domain Support"]'::jsonb),
('advanced', 'Advanced', 349, 3560, 5000, 'For established businesses', 'gray', 'outline', false, false, '["Up to 5,000 Products", "All Channels", "Advanced Analytics", "Priority Support", "Custom Domain Support", "API Access"]'::jsonb),
('premium', 'Premium', 499, 5090, 10000, 'High volume selling', 'gray', 'outline', false, false, '["Up to 10,000 Products", "All Channels", "Advanced Analytics", "24/7 Priority Support", "Custom Domain Support", "API Access"]'::jsonb),
('business', 'Business', 749, 7640, 25000, 'Enterprise grade features', 'gray', 'outline', false, false, '["Up to 25,000 Products", "All Channels", "Custom Reports", "Dedicated Account Manager", "White-label Options"]'::jsonb),
('agency', 'Agency', 999, 10190, 50000, 'For multiple storefronts', 'gray', 'outline', false, false, '["Up to 50,000 Products", "Multiple Storefronts", "Custom Reports", "Dedicated Account Manager", "White-label Options"]'::jsonb),
('vip', 'VIP', 1499, 15290, 100000, 'Maximum performance', 'gray', 'outline', false, false, '["Up to 100,000 Products", "Custom Integrations", "SLA Guarantee", "Dedicated Account Manager", "Full White-label"]'::jsonb),
('enterprise', 'Enterprise', 1999, 20390, 500000, 'Unlimited scaling', 'gray', 'outline', false, false, '["Up to 500,000 Products", "Custom Integrations", "SLA Guarantee", "On-site Support", "Full White-label"]'::jsonb),
('custom', 'Custom', 0, 0, 999999999, 'Tailored to your exact needs', 'gray', 'outline', false, true, '["Unlimited Products", "Custom Infrastructure", "Dedicated Engineering Team", "Custom SLA", "Source Code Access"]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- 2. Create Offers Table
CREATE TABLE offers (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    poster_url TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Allow public read access to offers
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view offers" ON offers FOR SELECT TO public USING (true);

-- Insert a default (inactive) Diwali offer
INSERT INTO offers (title, subtitle, poster_url, is_active) VALUES
('Diwali Mega Sale! 🪔', 'Get 50% off on all Yearly Plans. Use code DIWALI50.', null, false);
