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

  const itemLines = items
    .map((item) => {
      const lineTotal = item.price * item.quantity;
      return `${item.quantity}x ${item.title} — ${formatPrice(lineTotal, currency)}`;
    })
    .join('\n');

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return [
    `Hi! I'd like to order from ${storeName}:`,
    '',
    itemLines,
    '',
    `Total: ${formatPrice(total, currency)}`,
    '',
    'Please share payment & delivery details. 🙏',
  ].join('\n');
}
