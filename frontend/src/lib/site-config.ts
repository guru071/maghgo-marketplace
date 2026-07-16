/**
 * Single source of truth for the contact channels customers are sent to.
 *
 * These were previously read inline in four different files, each with its own
 * fallback — login/register fell back to 919876543210 while the pricing page
 * fell back to 15550000000, and the dashboard hardcoded the number outright.
 * A misconfigured deploy therefore looked fine while silently sending every
 * signup to a number nobody owns.
 *
 * NEXT_PUBLIC_* values are inlined at build time, so these must be referenced
 * as full `process.env.NEXT_PUBLIC_X` expressions for Next.js to replace them.
 */

export const siteConfig = {
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '',
  instagramHandle: process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE || '',
  messengerPage: process.env.NEXT_PUBLIC_MESSENGER_PAGE || '',
  smsNumber: process.env.NEXT_PUBLIC_SMS_NUMBER || '',
} as const;

/** True when the WhatsApp channel is actually configured. */
export const isWhatsappConfigured = Boolean(siteConfig.whatsappNumber);

/**
 * Link to the WhatsApp bot with a prefilled message.
 * Returns null when unconfigured so callers can hide the button rather than
 * render a link to nowhere.
 */
export function whatsappLink(text?: string): string | null {
  if (!siteConfig.whatsappNumber) return null;
  const base = `https://wa.me/${siteConfig.whatsappNumber}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function instagramLink(): string | null {
  return siteConfig.instagramHandle ? `https://ig.me/m/${siteConfig.instagramHandle}` : null;
}

export function messengerLink(): string | null {
  return siteConfig.messengerPage ? `https://m.me/${siteConfig.messengerPage}` : null;
}

export function smsLink(body?: string): string | null {
  if (!siteConfig.smsNumber) return null;
  const base = `sms:+${siteConfig.smsNumber}`;
  return body ? `${base}?body=${encodeURIComponent(body)}` : base;
}
