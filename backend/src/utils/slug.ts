/**
 * Store slug generation and reservation.
 *
 * Storefronts live at the URL root (`/[store_slug]`), so they share a namespace
 * with every static page on the site. Nothing validated this: a merchant naming
 * their shop "Login" got the slug `login`, and `/login` renders the login page —
 * their storefront was unreachable forever, with no error to explain why.
 *
 * Keep RESERVED_SLUGS in step with the top-level routes in frontend/src/app.
 */

/** Top-level paths a storefront can never occupy. */
export const RESERVED_SLUGS = new Set([
  // Real pages in frontend/src/app
  'login',
  'register',
  'dashboard',
  'demo',
  'privacy',
  'goatech-admin-hq',
  // Framework / infrastructure paths
  'api',
  '_next',
  'static',
  'public',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  'icon.jpg',
  // Obvious future pages — cheaper to reserve now than to migrate a live store later
  'about',
  'admin',
  'blog',
  'checkout',
  'contact',
  'help',
  'orders',
  'pricing',
  'settings',
  'signup',
  'signin',
  'support',
  'terms',
]);

/** Turn a store name into a URL-safe slug. */
export function slugify(storeName: string): string {
  return String(storeName || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

/**
 * Build a usable slug for a store name.
 *
 * Returns null when the name yields nothing usable (e.g. it was entirely
 * punctuation or non-Latin script), so callers can ask for a different name
 * instead of writing an empty slug that would collide with the homepage.
 *
 * Reserved slugs are suffixed rather than rejected: "Demo Store" is a
 * reasonable shop name, and `demo-store` is fine — only bare `demo` is not.
 */
export function buildStoreSlug(storeName: string): string | null {
  const base = slugify(storeName);
  if (!base) return null;
  return isReservedSlug(base) ? `${base}-store` : base;
}
