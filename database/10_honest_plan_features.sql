-- ============================================================
-- MAGHGO — Align advertised plan features with what actually ships
--
-- The pricing page reads `plans.features` from this table. It advertised
-- several features that are not built: Basic/Advanced Analytics, Custom
-- Domain Support, API Access, Custom Reports, Multiple Storefronts and
-- Custom Integrations. Those dashboard pages now render "Coming Soon" and
-- are no longer plan-gated, so the pricing copy must stop selling them.
--
-- Removed: analytics, custom domain, API access, custom reports,
--          multiple storefronts, custom integrations  (not implemented)
-- Added:   Visual Store Builder, Premium Themes       (real, and were
--                                                      never advertised)
-- Kept:    product limits, channels, white-label, and human service
--          promises (support tiers, account manager, SLA) which the
--          business fulfils manually rather than in software.
-- ============================================================

UPDATE plans SET features = '["Up to 50 Products", "WhatsApp Integration", "Shared Subdomain", "Standard Support"]'::jsonb WHERE slug = 'basic';

UPDATE plans SET features = '["Up to 200 Products", "WhatsApp + Instagram", "Visual Store Builder", "Premium Themes", "Shared Subdomain", "Standard Support"]'::jsonb WHERE slug = 'starter';

UPDATE plans SET features = '["Up to 1,000 Products", "All Channels", "Visual Store Builder", "Premium Themes", "Shared Subdomain", "Priority Support"]'::jsonb WHERE slug = 'pro';

UPDATE plans SET features = '["Up to 5,000 Products", "All Channels", "Visual Store Builder", "Premium Themes", "Shared Subdomain", "Priority Support"]'::jsonb WHERE slug = 'advanced';

UPDATE plans SET features = '["Up to 10,000 Products", "All Channels", "Visual Store Builder", "Premium Themes", "Shared Subdomain", "24/7 Priority Support"]'::jsonb WHERE slug = 'premium';

UPDATE plans SET features = '["Up to 25,000 Products", "All Channels", "Visual Store Builder", "Premium Themes", "White-label Storefront", "Dedicated Account Manager"]'::jsonb WHERE slug = 'business';

UPDATE plans SET features = '["Up to 50,000 Products", "All Channels", "Visual Store Builder", "Premium Themes", "White-label Storefront", "Dedicated Account Manager"]'::jsonb WHERE slug = 'agency';

UPDATE plans SET features = '["Up to 100,000 Products", "All Channels", "Full White-label", "SLA Guarantee", "Dedicated Account Manager"]'::jsonb WHERE slug = 'vip';

UPDATE plans SET features = '["Up to 500,000 Products", "All Channels", "Full White-label", "SLA Guarantee", "On-site Support"]'::jsonb WHERE slug = 'enterprise';

-- 'custom' is left unchanged: its claims are bespoke commitments, not software features.
