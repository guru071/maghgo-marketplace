-- ============================================================
-- MAGHGO — Normalise existing merchant phone numbers
--
-- WHY: phone_number is an exact-match lookup key for the bot
-- (getMerchantByChannel) and for the Razorpay webhook (which decides whether a
-- payer's subscription activates). Each channel supplies a different shape:
--   WhatsApp -> 919876543210      Twilio -> +919876543210
--   Website  -> whatever the user typed ("+91 98765 43210", "9876543210", ...)
--
-- Rows already stored in a non-canonical shape are invisible to the bot, and a
-- payment from such a merchant would be received but never activate their plan.
-- The application now normalises on every write (backend/src/utils/phone.ts);
-- this migration brings existing rows into the same canonical form:
--   digits only, including country code, no '+'.
--
-- Safe to re-run: already-canonical rows are left untouched.
-- ============================================================

-- 1. Strip '+', spaces, dashes and brackets from every number.
UPDATE merchants
SET phone_number = regexp_replace(phone_number, '[^0-9]', '', 'g')
WHERE phone_number IS NOT NULL
  AND phone_number <> regexp_replace(phone_number, '[^0-9]', '', 'g');

-- 2. Drop an international '00' prefix (e.g. 0091... -> 91...).
UPDATE merchants
SET phone_number = substring(phone_number from 3)
WHERE phone_number LIKE '00%';

-- 3. Drop the Indian trunk '0' on 11-digit numbers (0 98765 43210).
UPDATE merchants
SET phone_number = substring(phone_number from 2)
WHERE length(phone_number) = 11
  AND phone_number LIKE '0%';

-- 4. Add the country code to bare 10-digit Indian mobiles (start 6-9).
--    This is the case that affects real data today.
UPDATE merchants
SET phone_number = '91' || phone_number
WHERE length(phone_number) = 10
  AND phone_number ~ '^[6-9]';

-- Verify — every row should now be 12 digits for an Indian mobile:
--   SELECT store_slug, phone_number, length(phone_number) FROM merchants ORDER BY created_at;
