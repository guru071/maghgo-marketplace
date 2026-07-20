-- ==============================================================================
-- 27_shop_telegram_bots.sql
-- A shop's OWN branded Telegram bot (the Telegram twin of dedicated WhatsApp
-- numbers, but self-serve): the owner creates a bot at @BotFather (free, 2
-- minutes, no approval), pastes the token into Maghgo, and Maghgo runs it —
-- their customers chat with THEIR bot, auto-scoped to their store.
--
-- telegram_bot_token is a live credential: stored ENCRYPTED (AES-256-GCM, same
-- as Razorpay secrets), never sent to any browser.
-- Additive & idempotent.
-- ==============================================================================

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS telegram_bot_token    TEXT;         -- encrypted
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS telegram_bot_username TEXT;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS telegram_bot_secret   TEXT;         -- webhook header secret
