/**
 * Phone number normalisation.
 *
 * Every channel hands us the same human's number in a different shape:
 *   WhatsApp webhook  -> "919876543210"   (digits, country code, no plus)
 *   Twilio SMS        -> "+919876543210"  (E.164, with plus)
 *   Website signup    -> whatever the user typed: "+91 98765 43210",
 *                        "98765-43210", "9876543210", ...
 *
 * Lookups are exact (`.eq('phone_number', x)`), so without a single canonical
 * form a merchant who registered on the web is invisible to the bot, and the
 * Razorpay webhook cannot find the payer it needs to activate — i.e. the
 * payment succeeds and the subscription silently never turns on.
 *
 * Canonical form: digits only, including country code, no '+'.
 * This matches what the WhatsApp Cloud API sends and the existing seed data.
 */

/** Default country code. This product is India-only (INR pricing, Razorpay). */
const DEFAULT_COUNTRY_CODE = '91';

/**
 * Reduce any input to the canonical stored form: digits only, with country code.
 *
 * A bare 10-digit Indian mobile (starts 6-9) is assumed to be Indian and gets
 * the 91 prefix, because the website historically accepted numbers without one.
 * Returns '' for input with no digits, so callers can reject it.
 */
export function normalizePhone(input: string | null | undefined): string {
  if (!input) return '';

  // Strip '+', spaces, dashes, brackets — anything that isn't a digit.
  let digits = String(input).replace(/\D/g, '');
  if (!digits) return '';

  // "0098..." / "0091..." international prefix
  if (digits.startsWith('00')) digits = digits.slice(2);

  // Indian trunk prefix on an 11-digit number: 0 98765 43210
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);

  // Bare 10-digit Indian mobile -> prepend country code.
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    digits = DEFAULT_COUNTRY_CODE + digits;
  }

  return digits;
}

/** True when the value looks like a storable international number. */
export function isValidPhone(input: string | null | undefined): boolean {
  const n = normalizePhone(input);
  return n.length >= 10 && n.length <= 15;
}
