/**
 * Subscription status as the merchant should see it. Mirrors
 * getSubscriptionStatus in backend/src/services/merchant.service.ts — keep the
 * two in step, since the bot and the dashboard must never disagree about when
 * a plan ends.
 */
export interface SubscriptionStatus {
  plan: string;
  endsAt: Date | null;
  daysLeft: number; // negative once expired
  expired: boolean;
  expiringSoon: boolean; // 7 days or fewer remaining
  endsAtLabel: string;
  /** null when there is no plan at all — callers show a "choose a plan" state. */
  hasPlan: boolean;
}

export function getSubscriptionStatus(merchant: {
  subscription_plan?: string | null;
  subscription_ends_at?: string | null;
} | null | undefined): SubscriptionStatus {
  const plan = merchant?.subscription_plan || 'inactive';
  const raw = merchant?.subscription_ends_at;
  const endsAt = raw ? new Date(raw) : null;
  const valid = endsAt && !isNaN(endsAt.getTime());

  if (!valid) {
    return {
      plan, endsAt: null, daysLeft: 0, expired: true,
      expiringSoon: true, endsAtLabel: '—', hasPlan: plan !== 'inactive',
    };
  }

  const msLeft = endsAt!.getTime() - Date.now();
  // Calendar days, rounded up: an expiry later today reads as "1 day left".
  const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
  const expired = plan === 'inactive' || msLeft <= 0;

  return {
    plan,
    endsAt: endsAt!,
    daysLeft,
    expired,
    expiringSoon: !expired && daysLeft <= 7,
    endsAtLabel: endsAt!.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    hasPlan: plan !== 'inactive',
  };
}
