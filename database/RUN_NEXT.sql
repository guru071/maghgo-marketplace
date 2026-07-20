-- ==============================================================================
-- RUN_NEXT.sql — the only migrations still pending on your database.
-- Paste this whole file into Supabase → SQL Editor → Run. Safe to re-run.
-- (Verified 26 already applied; these are 27 + 28 + 29.)
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

-- ── 29: make the admin "offer" a REAL discount, not just a banner ────────────
-- Without this the offer bar can advertise a discount while every plan still
-- charges list price. With it, discount_percent is applied to the pricing page,
-- the Razorpay link and the webhook's amount check, consistently.
ALTER TABLE offers ADD COLUMN IF NOT EXISTS discount_percent INTEGER NOT NULL DEFAULT 0;
