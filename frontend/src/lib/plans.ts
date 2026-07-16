/**
 * Plan tiers — the single source of truth for "can this merchant do X?".
 *
 * This list used to be duplicated: the dashboard gated White-Label at
 * `business`, the white-label page told the merchant it was active, but the
 * storefront only dropped the "Powered by" footer for
 * ['agency','vip','enterprise','custom'] — `business` was missing. A merchant
 * paid ₹749/mo for white-label, was told it was on, and still shipped our
 * branding to their customers.
 *
 * Anything gated by plan must compare through hasAccess() so the sale, the
 * gate and the behaviour cannot drift apart again.
 */

export const PLAN_TIERS = [
  'inactive',
  'trial',
  'basic',
  'starter',
  'pro',
  'advanced',
  'premium',
  'business',
  'agency',
  'vip',
  'enterprise',
  'custom',
] as const;

export type PlanTier = (typeof PLAN_TIERS)[number];

/**
 * True when `currentPlan` is at least `requiredPlan`.
 * Unknown plans deny rather than allow: a typo should cost a feature, not give
 * away a paid one.
 */
export function hasAccess(requiredPlan: string, currentPlan: string): boolean {
  if (currentPlan === 'custom') return true;
  const current = PLAN_TIERS.indexOf(currentPlan as PlanTier);
  const required = PLAN_TIERS.indexOf(requiredPlan as PlanTier);
  if (current === -1 || required === -1) return false;
  return current >= required;
}

/**
 * The tiers we actually sell, in display order.
 *
 * Everything else (advanced, premium, agency, vip, enterprise) is grandfathered:
 * still honoured in full for merchants already on it — one is on `vip` today —
 * but no longer offered. Those rows must never be deleted, or getProductLimit()
 * would fall back to the 50-product default and lock a paying merchant out of
 * their own catalogue.
 *
 * Deliberately a constant rather than an `is_public` column: it needs no
 * migration, cannot drift out of sync with a half-applied database, and this
 * is a product decision that belongs in the codebase anyway.
 */
export const PUBLIC_PLAN_SLUGS = ['basic', 'starter', 'pro', 'business', 'custom'] as const;

/** Whether a plan should appear on the public pricing page. */
export function isPublicPlan(slug: string): boolean {
  return (PUBLIC_PLAN_SLUGS as readonly string[]).includes(slug);
}

/** Lowest plan that removes Maghgo branding from the storefront. */
export const WHITE_LABEL_MIN_PLAN = 'business';

/** Whether this merchant's storefront should show the "Powered by" footer. */
export function showsPoweredByFooter(plan: string): boolean {
  return !hasAccess(WHITE_LABEL_MIN_PLAN, plan);
}
