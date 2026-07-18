import { CartItem } from '@/types';

/**
 * Format a price for Indian locale display.
 * Uses Intl.NumberFormat('en-IN') for proper Indian number grouping (e.g., ₹1,29,999).
 */
export function formatPrice(price: number, currency: string = 'INR'): string {
  const symbols: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };

  const symbol = symbols[currency] || currency + ' ';
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);

  return `${symbol}${formatted}`;
}

/**
 * Generate a WhatsApp deep link with a pre-filled message.
 * Strips non-digit chars from phone and constructs wa.me URL.
 */
export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Generate a structured checkout message for WhatsApp.
 * Lists each cart item with quantity, title, and line total,
 * followed by the grand total.
 */
export function generateCheckoutMessage(
  storeName: string,
  items: CartItem[]
): string {
  if (items.length === 0) return '';

  const currency = items[0]?.currency || 'INR';

  // Include each product's image URL so the shop owner can actually see what
  // was ordered — WhatsApp shows a preview for the first link, and the rest are
  // tappable. (A wa.me click-to-chat link can only carry text, not attachments.)
  const itemLines = items
    .map((item, i) => {
      const lineTotal = item.price * item.quantity;
      const tag = item.fulfillment_type === 'prebook' ? ' (Pre-book — collect at shop)' : '';
      const line = `${i + 1}. ${item.title} × ${item.quantity}${tag} — ${formatPrice(lineTotal, currency)}`;
      return item.image_url ? `${line}\n   📷 ${item.image_url}` : line;
    })
    .join('\n');

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const hasPrebook = items.some((i) => i.fulfillment_type === 'prebook');
  const hasBuy = items.some((i) => i.fulfillment_type !== 'prebook');

  // Delivery vs collection changes what we ask the shop for. A mixed cart asks
  // for both so nothing is missed.
  let closing = 'Please share payment & delivery details. 🙏';
  if (hasPrebook && !hasBuy) closing = 'I\'d like to pre-book these and collect at your shop. Please confirm availability & timing. 🙏';
  else if (hasPrebook && hasBuy) closing = 'Some items are for delivery and some are pre-book (collect at shop). Please share payment, delivery & pickup details. 🙏';

  return [
    `Hi! I'd like to order from ${storeName}:`,
    '',
    itemLines,
    '',
    `Total: ${formatPrice(total, currency)}`,
    '',
    closing,
  ].join('\n');
}
