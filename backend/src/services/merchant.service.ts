import { supabase } from '../db/supabase';
import { Merchant } from '../types/whatsapp';

// ─── Merchant Lookup Service ─────────────────────────────────────────────────

/**
 * Look up a merchant by their WhatsApp phone number.
 *
 * @param phoneNumber - The sender's phone number (without '+' prefix).
 * @returns The merchant record, or `null` if not registered.
 */
export async function getMerchantByPhone(
  phoneNumber: string
): Promise<Merchant | null> {
  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('phone_number', phoneNumber)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Merchant lookup failed: ${error.message}`);
  }

  return data as Merchant;
}

/**
 * Creates a new merchant in the database (Registration).
 */
export async function createMerchant(
  phoneNumber: string,
  storeName: string,
  storeSlug: string
): Promise<Merchant> {
  // Generate trial end date (4 days from now)
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 4);

  const { data, error } = await supabase
    .from('merchants')
    .insert([
      {
        phone_number: phoneNumber,
        store_name: storeName,
        store_slug: storeSlug,
        subscription_plan: 'trial',
        is_active: true,
        trial_ends_at: trialEndsAt.toISOString(),
      },
    ])
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('This store name or phone number is already registered.');
    }
    throw new Error(`Registration failed: ${error.message}`);
  }

  return data as Merchant;
}

/**
 * Returns the maximum number of products allowed for a given subscription plan.
 */
export function getProductLimit(plan: string): number {
  switch (plan) {
    case 'trial':
      return 1;
    case 'basic':
      return 20;
    case 'premium':
      return 50;
    case 'enterprise':
      return 100;
    default:
      return 1;
  }
}

/**
 * Checks if the merchant's subscription/trial is still active.
 */
export function isSubscriptionActive(merchant: Merchant): boolean {
  const trialEnds = new Date(merchant.trial_ends_at);
  const now = new Date();
  return merchant.is_active && trialEnds > now;
}

/**
 * Reactivates the merchant's subscription for 30 days and sets them active.
 */
export async function reactivateSubscription(phoneNumber: string, plan: 'basic' | 'premium' | 'enterprise'): Promise<void> {
  // Extending by 30 days
  const newExpiry = new Date();
  newExpiry.setDate(newExpiry.getDate() + 30);

  const { error } = await supabase
    .from('merchants')
    .update({
      is_active: true,
      subscription_plan: plan,
      trial_ends_at: newExpiry.toISOString(),
    })
    .eq('phone_number', phoneNumber);

  if (error) {
    throw new Error(`Failed to reactivate subscription: ${error.message}`);
  }
}
