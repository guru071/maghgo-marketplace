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
