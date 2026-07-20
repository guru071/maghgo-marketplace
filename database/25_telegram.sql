-- ==============================================================================
-- 25_telegram.sql
-- Telegram as a first-class bot channel. Easiest channel in the stack: free,
-- no Meta-style app review, instant bot creation via @BotFather.
-- Additive & idempotent; without it the Telegram webhook simply stays off.
-- ==============================================================================

-- A merchant's Telegram identity (chat id), like instagram_id/messenger_id.
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS telegram_id TEXT UNIQUE;

-- Admin kill-switch for the channel, like the other four.
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS telegram_enabled BOOLEAN DEFAULT true;
