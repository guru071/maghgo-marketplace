import { ParsedProduct } from '../types/whatsapp';

// ─── Caption → Product Parser ────────────────────────────────────────────────
// Supports Indian price formats:
//   "Red Cotton T-Shirt Rs 499"     → {title: "Red Cotton T-Shirt", price: 499}
//   "Blue Jeans ₹1,299"             → {title: "Blue Jeans", price: 1299}
//   "Sneakers INR 2499"             → {title: "Sneakers", price: 2499}
//   "Kurta 999"                     → {title: "Kurta", price: 999}
//   "Silk Saree Rs. 2,499.00"       → {title: "Silk Saree", price: 2499}

/**
 * Price prefixes we recognise (case-insensitive).
 * Order matters – longer prefixes must come first so the regex is greedy.
 */
const PRICE_PREFIX = '(?:Rs\\.?|₹|INR|MRP)';

/**
 * A number that may contain commas and an optional decimal portion.
 * Examples: 499  |  1,299  |  2,499.00
 */
const PRICE_NUMBER = '([\\d,]+(?:\\.\\d{1,2})?)';

/**
 * Primary pattern: an explicit currency prefix followed by optional whitespace
 * and the price number.
 *   "Red Cotton T-Shirt Rs 499"
 *   "Blue Jeans ₹1,299"
 *   "Silk Saree Rs. 2,499.00"
 */
const PREFIXED_PRICE_REGEX = new RegExp(
  `^(.+?)\\s*${PRICE_PREFIX}\\s*${PRICE_NUMBER}\\s*$`,
  'i'
);

/**
 * Fallback pattern: title followed by a standalone number at the end of the
 * string.  The title part must end with a non-digit so we don't accidentally
 * swallow part of the price into the title.
 *   "Kurta 999"
 */
const BARE_PRICE_REGEX = new RegExp(
  `^(.+?)\\s+${PRICE_NUMBER}\\s*$`
);

/**
 * Parse a WhatsApp image caption into a product title and price.
 *
 * @returns ParsedProduct if both title and price are found, otherwise `null`.
 */
export function parseCaption(caption: string): ParsedProduct | null {
  const trimmed = caption.trim();
  if (!trimmed) return null;

  // Try the explicit-prefix pattern first
  let match = PREFIXED_PRICE_REGEX.exec(trimmed);

  // Fall back to trailing bare number
  if (!match) {
    match = BARE_PRICE_REGEX.exec(trimmed);
  }

  if (!match) return null;

  const title = match[1].trim();
  const rawPrice = match[2];

  if (!title) return null;

  // Strip commas, parse to float, then round to integer paise-safe value
  const price = Math.round(parseFloat(rawPrice.replace(/,/g, '')));

  if (isNaN(price) || price <= 0) return null;

  return { title, price };
}
