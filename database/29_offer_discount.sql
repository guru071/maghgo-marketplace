-- ==============================================================================
-- 29_offer_discount.sql
-- Makes the admin "offer" REAL. Until now an offer was only a banner: it could
-- advertise "50% off" while every plan still charged full price — the payment
-- link, the pricing page and the webhook all ignored it.
--
-- discount_percent is now applied to the displayed plan prices AND to the
-- amount on the Razorpay link, and the subscription webhook accepts the
-- discounted amount (otherwise a discounted payment would be taken but the
-- plan never activated).
-- ==============================================================================

ALTER TABLE offers ADD COLUMN IF NOT EXISTS discount_percent INTEGER NOT NULL DEFAULT 0;
