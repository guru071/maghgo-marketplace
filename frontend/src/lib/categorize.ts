/**
 * Auto-categorise a product from its title, so the storefront can organise
 * itself around what's actually being sold — a fashion store groups into
 * Clothing / Footwear, an electronics store into Phones / Audio, etc. — without
 * the seller tagging anything.
 *
 * Keyword match is deliberately broad and case-insensitive. Anything unmatched
 * falls into "More", so every product is always shown.
 */

export interface Category {
  key: string;
  label: string;
  icon: string;
}

// Order matters: the first category whose keywords match wins.
const RULES: { cat: Category; keywords: string[] }[] = [
  { cat: { key: 'clothing', label: 'Clothing', icon: '👕' },
    keywords: ['shirt', 't-shirt', 'tshirt', 'tee', 'kurta', 'kurti', 'saree', 'sari', 'dress', 'top', 'jeans', 'pant', 'trouser', 'jacket', 'hoodie', 'sweater', 'lehenga', 'blouse', 'skirt', 'shorts', 'suit', 'ethnic', 'frock', 'legging'] },
  { cat: { key: 'footwear', label: 'Footwear', icon: '👟' },
    keywords: ['shoe', 'sneaker', 'sandal', 'slipper', 'heel', 'boot', 'loafer', 'flip flop', 'flipflop', 'footwear', 'chappal'] },
  { cat: { key: 'accessories', label: 'Accessories', icon: '👜' },
    keywords: ['bag', 'handbag', 'wallet', 'belt', 'watch', 'sunglass', 'cap', 'hat', 'scarf', 'purse', 'backpack', 'clutch'] },
  { cat: { key: 'jewellery', label: 'Jewellery', icon: '💍' },
    keywords: ['ring', 'necklace', 'earring', 'bracelet', 'bangle', 'jewel', 'pendant', 'chain', 'anklet', 'nose pin', 'jhumka'] },
  { cat: { key: 'electronics', label: 'Electronics', icon: '📱' },
    keywords: ['phone', 'mobile', 'laptop', 'charger', 'cable', 'earphone', 'headphone', 'earbud', 'speaker', 'tv', 'camera', 'watch', 'smartwatch', 'power bank', 'powerbank', 'mouse', 'keyboard', 'usb', 'adapter', 'tablet'] },
  { cat: { key: 'beauty', label: 'Beauty', icon: '💄' },
    keywords: ['cream', 'lipstick', 'serum', 'lotion', 'makeup', 'perfume', 'shampoo', 'soap', 'skincare', 'cosmetic', 'kajal', 'foundation', 'nail', 'facewash', 'moisturiser', 'moisturizer'] },
  { cat: { key: 'food', label: 'Food', icon: '🍫' },
    keywords: ['cake', 'chocolate', 'snack', 'sweet', 'biscuit', 'cookie', 'namkeen', 'pickle', 'masala', 'tea', 'coffee', 'honey', 'ghee', 'spice', 'dryfruit', 'dry fruit', 'laddu', 'mithai'] },
  { cat: { key: 'home', label: 'Home', icon: '🏠' },
    keywords: ['cushion', 'bedsheet', 'curtain', 'lamp', 'candle', 'vase', 'plate', 'bottle', 'mug', 'cup', 'towel', 'blanket', 'pillow', 'decor', 'planter', 'basket'] },
  { cat: { key: 'kids', label: 'Kids & Toys', icon: '🧸' },
    keywords: ['toy', 'kids', 'baby', 'infant', 'doll', 'puzzle', 'stroller', 'diaper'] },
];

const MORE: Category = { key: 'more', label: 'More', icon: '✨' };

/** Detect the category of a single product title. */
export function categorize(title: string): Category {
  const t = (title || '').toLowerCase();
  for (const { cat, keywords } of RULES) {
    if (keywords.some((k) => t.includes(k))) return cat;
  }
  return MORE;
}

/**
 * Group products by detected category, preserving product order within each.
 * Returns only the categories that actually have products, in RULES order,
 * with "More" last. Used to decide whether the store is worth organising into
 * sections at all (a single-category store just shows a plain grid).
 */
export function groupByCategory<T extends { title: string }>(products: T[]): { category: Category; products: T[] }[] {
  const buckets = new Map<string, { category: Category; products: T[] }>();
  for (const p of products) {
    const cat = categorize(p.title);
    if (!buckets.has(cat.key)) buckets.set(cat.key, { category: cat, products: [] });
    buckets.get(cat.key)!.products.push(p);
  }
  const order = [...RULES.map((r) => r.cat.key), MORE.key];
  return [...buckets.values()].sort((a, b) => order.indexOf(a.category.key) - order.indexOf(b.category.key));
}
