import { supabase } from '../db/supabase';
import { Merchant } from '../types/whatsapp';

export type Channel = 'whatsapp' | 'instagram' | 'messenger' | 'sms';

export async function getMerchantByChannel(
  channel: Channel,
  senderId: string
): Promise<Merchant | null> {
  let column = 'phone_number';
  if (channel === 'instagram') column = 'instagram_id';
  if (channel === 'messenger') column = 'messenger_id';

  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq(column, senderId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Merchant lookup failed: ${error.message}`);
  }

  return data as Merchant;
}

export async function createMerchant(
  channel: Channel,
  senderId: string,
  storeName: string,
  storeSlug: string
): Promise<Merchant> {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 4);

  const insertData: any = {
    store_name: storeName,
    store_slug: storeSlug,
    subscription_plan: 'inactive',
    is_active: false,
    trial_ends_at: new Date(0).toISOString(),
  };

  if (channel === 'whatsapp') insertData.phone_number = senderId;
  if (channel === 'instagram') insertData.instagram_id = senderId;
  if (channel === 'messenger') insertData.messenger_id = senderId;

  const { data, error } = await supabase
    .from('merchants')
    .insert([insertData])
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('This store name or account is already registered.');
    }
    throw new Error(`Registration failed: ${error.message}`);
  }

  return data as Merchant;
}

export async function getProductLimit(plan: string): Promise<number> {
  const { data, error } = await supabase
    .from('plans')
    .select('product_limit')
    .eq('slug', plan.toLowerCase())
    .single();

  if (error || !data) {
    return 50; // fallback basic limit
  }

  return data.product_limit;
}

export function isSubscriptionActive(merchant: Merchant): boolean {
  const trialEnds = new Date(merchant.trial_ends_at);
  const now = new Date();
  return merchant.is_active && trialEnds > now;
}

export async function reactivateSubscription(
  channel: Channel,
  senderId: string, 
  plan: 'basic' | 'starter' | 'pro' | 'advanced' | 'premium' | 'business' | 'agency' | 'vip' | 'enterprise' | 'custom',
  isYearly: boolean = false
): Promise<void> {
  let column = 'phone_number';
  if (channel === 'instagram') column = 'instagram_id';
  if (channel === 'messenger') column = 'messenger_id';

  const { data: merchant, error: fetchError } = await supabase
    .from('merchants')
    .select('trial_ends_at, is_active')
    .eq(column, senderId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch merchant for reactivation: ${fetchError.message}`);
  }

  const now = new Date();
  const currentExpiry = new Date(merchant.trial_ends_at);
  const daysToAdd = isYearly ? 365 : 30;
  
  const newExpiry = (merchant.is_active && currentExpiry > now) 
    ? new Date(currentExpiry.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

  const { error } = await supabase
    .from('merchants')
    .update({
      is_active: true,
      subscription_plan: plan,
      trial_ends_at: newExpiry.toISOString(),
    })
    .eq(column, senderId);

  if (error) {
    throw new Error(`Failed to reactivate subscription: ${error.message}`);
  }
}
