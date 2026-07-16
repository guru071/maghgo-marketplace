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
  messenger: 'pro',
  sms: 'pro',
};

const CHANNEL_LABEL: Record<Channel, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
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
