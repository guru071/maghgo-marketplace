-- ==============================================================================
-- RUN_NEXT.sql — the only migrations still pending on your database.
-- Paste this whole file into Supabase → SQL Editor → Run. Safe to re-run.
-- (Verified 26 already applied; these are 27 + 28.)
-- ==============================================================================

-- ── 27: a shop's OWN branded Telegram bot ────────────────────────────────────
-- Owner creates a bot at @BotFather, sends CONNECT TELEGRAM, pastes the token.
-- The token is stored ENCRYPTED and never leaves the server.
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS telegram_bot_token    TEXT;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS telegram_bot_username TEXT;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS telegram_bot_secret   TEXT;

-- ── 28: MRP ("was" price) + storefront announcement ticker ───────────────────
-- MRP powers the amber "₹110 Off" badge and the struck-through price.
-- announcement is the scrolling offer strip above the navbar.
ALTER TABLE products  ADD COLUMN IF NOT EXISTS mrp          NUMERIC;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS announcement TEXT;

-- ==============================================================================
-- Done. Nothing else is pending.
-- ==============================================================================
