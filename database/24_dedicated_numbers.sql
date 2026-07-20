-- ==============================================================================
-- 24_dedicated_numbers.sql
-- Premium option: a shop can have its OWN WhatsApp number under the platform's
-- WhatsApp Business Account. Incoming messages on that number are automatically
-- scoped to that shop (customers never type "SHOP <name>"), and replies go out
-- from the shop's number.
--
-- Setup per shop (manual, by the platform admin): register the number in the
-- Meta app's WhatsApp settings, then store its Phone-Number-ID here.
-- Additive & idempotent; without it (or with NULL) everything works as today.
-- ==============================================================================

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT UNIQUE;
