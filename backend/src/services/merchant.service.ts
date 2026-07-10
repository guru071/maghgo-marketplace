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
    case 'trial': return 1;
    case 'basic': return 50;
    case 'starter': return 150;
    case 'pro': return 300;
    case 'advanced': return 600;
    case 'premium': return 1000;
    case 'business': return 2000;
    case 'agency': return 5000;
    case 'vip': return 15000;
    case 'enterprise': return Infinity;
    case 'custom': return Infinity;
    default: return 1;
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
export async function reactivateSubscription(phoneNumber: string, plan: 'basic' | 'starter' | 'pro' | 'advanced' | 'premium' | 'business' | 'agency' | 'vip' | 'enterprise' | 'custom'): Promise<void> {
  // Fetch current merchant to check their existing expiry
  const { data: merchant, error: fetchError } = await supabase
    .from('merchants')
    .select('trial_ends_at, is_active')
    .eq('phone_number', phoneNumber)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch merchant for reactivation: ${fetchError.message}`);
  }

  const now = new Date();
  const currentExpiry = new Date(merchant.trial_ends_at);
  
  // If they are currently active and expiry is in the future, add 30 days to their existing expiry.
  // Otherwise, add 30 days from now.
  const newExpiry = (merchant.is_active && currentExpiry > now) 
    ? new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

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
