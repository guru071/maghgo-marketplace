-- ==============================================================================
-- 26_link_code_expiry.sql
-- Link codes get an expiry. Admin-generated codes (support flow: shop owner
-- asks, admin picks the shop and mints a code) live 2 MINUTES; bot-generated
-- codes live 15 minutes. Previously codes lived until used — a forgotten code
-- was a standing invitation.
-- Additive & idempotent; without it codes simply don't expire (as before).
-- ==============================================================================

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS link_code_expires_at TIMESTAMP WITH TIME ZONE;
