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
  // Default new users to starter and give them 30 days free.
  const subEndsAt = new Date();
  subEndsAt.setDate(subEndsAt.getDate() + 30);

  const insertData: any = {
    store_name: storeName,
    store_slug: storeSlug,
    subscription_plan: 'starter',
    is_active: true,
    subscription_ends_at: subEndsAt.toISOString(),
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
  const subEnds = new Date(merchant.subscription_ends_at);
  const now = new Date();
  return merchant.is_active && subEnds > now;
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
    .select('subscription_ends_at, is_active')
    .eq(column, senderId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch merchant for reactivation: ${fetchError.message}`);
  }

  const now = new Date();
  const currentExpiry = new Date(merchant.subscription_ends_at);
  const daysToAdd = isYearly ? 365 : 30;
  
  const newExpiry = (merchant.is_active && currentExpiry > now) 
    ? new Date(currentExpiry.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

  const { error } = await supabase
    .from('merchants')
    .update({
      is_active: true,
      subscription_plan: plan,
      subscription_ends_at: newExpiry.toISOString(),
    })
    .eq(column, senderId);

  if (error) {
    throw new Error(`Failed to reactivate subscription: ${error.message}`);
  }
}

export async function generateLinkCode(channel: Channel, senderId: string): Promise<string> {
  let column = 'phone_number';
  if (channel === 'instagram') column = 'instagram_id';
  if (channel === 'messenger') column = 'messenger_id';

  // Generate a random 6 character alphanumeric code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const { error } = await supabase
    .from('merchants')
    .update({ link_code: code })
    .eq(column, senderId);

  if (error) {
    throw new Error(`Failed to generate link code: ${error.message}`);
  }

  return code;
}

export async function linkChannelToMerchant(
  code: string,
  newChannel: Channel,
  newSenderId: string
): Promise<Merchant> {
  // 1. Find merchant by link code
  const { data: merchant, error: lookupError } = await supabase
    .from('merchants')
    .select('*')
    .eq('link_code', code.toUpperCase())
    .single();

  if (lookupError || !merchant) {
    throw new Error('Invalid or expired link code.');
  }

  // 2. Update the merchant with the new channel ID
  let updateData: any = {};
  if (newChannel === 'instagram') updateData.instagram_id = newSenderId;
  if (newChannel === 'messenger') updateData.messenger_id = newSenderId;
  if (newChannel === 'whatsapp' || newChannel === 'sms') updateData.phone_number = newSenderId;

  // Clear the link code after successful linking for security
  updateData.link_code = null;

  const { data: updatedMerchant, error: updateError } = await supabase
    .from('merchants')
    .update(updateData)
    .eq('id', merchant.id)
    .select('*')
    .single();

  if (updateError) {
    throw new Error(`Failed to link channel: ${updateError.message}`);
  }

  return updatedMerchant as Merchant;
}

export async function updateStoreDescription(merchantId: string, description: string): Promise<void> {
  const { error } = await supabase
    .from('merchants')
    .update({ store_description: description })
    .eq('id', merchantId);

  if (error) {
    throw new Error(`Failed to update store description: ${error.message}`);
  }
}

export async function toggleStoreStatus(merchantId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('merchants')
    .update({ is_active: isActive })
    .eq('id', merchantId);

  if (error) {
    throw new Error(`Failed to toggle store status: ${error.message}`);
  }
}

