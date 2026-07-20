import type { Channel } from '../services/merchant.service';

/**
 * Plan tiers and what each unlocks.
 *
 * Mirrors frontend/src/lib/plans.ts. The two must agree: the frontend decides
 * what to show, this decides what the bot actually does.
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
 * Lowest plan that may use each channel, matching what the plans actually sell:
 *   basic   -> "WhatsApp Integration"
 *   starter -> "WhatsApp + Instagram"
 *   pro     -> "All Channels"
 *
 * Until now nothing enforced this: the bot served every channel to every active
 * merchant, so "All Channels" was not a real reason to be on Pro and the
 * cheaper tiers advertised a restriction that did not exist.
 */
export const CHANNEL_MIN_PLAN: Record<Channel, PlanTier> = {
  whatsapp: 'basic',
  instagram: 'starter',
  telegram: 'starter',
  messenger: 'pro',
  sms: 'pro',
};

const CHANNEL_LABEL: Record<Channel, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  telegram: 'Telegram',
  messenger: 'Facebook Messenger',
  sms: 'SMS',
};

export function channelLabel(channel: Channel): string {
  return CHANNEL_LABEL[channel] ?? channel;
}

export function canUseChannel(plan: string, channel: Channel): boolean {
  return hasAccess(CHANNEL_MIN_PLAN[channel], plan);
}

/** The cheapest plan that can use this channel — what to upsell. */
export function minPlanForChannel(channel: Channel): PlanTier {
  return CHANNEL_MIN_PLAN[channel];
}

/**
 * The feature → minimum-plan matrix. THE single source of truth for what each
 * subscription unlocks beyond product limits and channels.
 *
 * Everything here is enforced SERVER-SIDE (dashboard routes + bot commands),
 * not just hidden in the UI — before this, coupons/domain/Meta-import worked on
 * any plan if you called the API directly, so the paid tiers sold restrictions
 * that didn't exist.
 *
 * Free on every plan (the core selling loop is never paywalled): products,
 * orders + customer notifications, online payments via the shop's own Razorpay,
 * stock, product details/options, store QR, address.
 */
export type GatedFeature = 'coupons' | 'premium_themes' | 'custom_domain' | 'meta_import';

export const FEATURE_MIN_PLAN: Record<GatedFeature, PlanTier> = {
  coupons: 'starter',        // discount codes
  premium_themes: 'starter', // rich full-layout themes (per-theme plan_required still applies)
  custom_domain: 'pro',
  meta_import: 'pro',        // Facebook/Instagram catalogue import
};

const FEATURE_LABEL: Record<GatedFeature, string> = {
  coupons: 'Discount coupons',
  premium_themes: 'Premium themes',
  custom_domain: 'Custom domain',
  meta_import: 'Meta catalogue import',
};

export function canUseFeature(plan: string, feature: GatedFeature): boolean {
  return hasAccess(FEATURE_MIN_PLAN[feature], plan);
}

export function minPlanForFeature(feature: GatedFeature): PlanTier {
  return FEATURE_MIN_PLAN[feature];
}

export function featureLabel(feature: GatedFeature): string {
  return FEATURE_LABEL[feature];
}

/** Uniform upsell copy for a locked feature (used by routes and the bot). */
export function featureLockedMessage(feature: GatedFeature, plan: string): string {
  const needed = FEATURE_MIN_PLAN[feature].toUpperCase();
  return `${FEATURE_LABEL[feature]} needs the ${needed} plan (you're on ${(plan || 'basic').toUpperCase()}). Reply UPGRADE ${needed} to unlock it.`;
}
