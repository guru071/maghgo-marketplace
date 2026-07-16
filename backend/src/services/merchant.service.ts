import { supabase } from '../db/supabase';
import { Merchant } from '../types/whatsapp';
import { normalizePhone } from '../utils/phone';

export type Channel = 'whatsapp' | 'instagram' | 'messenger' | 'sms';

/**
 * Resolve the lookup column and the canonical value for a channel.
 * WhatsApp/SMS senderIds are phone numbers and MUST be normalised — each
 * channel formats them differently and lookups are exact matches.
 * Instagram/Messenger ids are opaque and must be used verbatim.
 */
function channelLookup(channel: Channel, senderId: string): { column: string; value: string } {
  if (channel === 'instagram') return { column: 'instagram_id', value: senderId };
  if (channel === 'messenger') return { column: 'messenger_id', value: senderId };
  return { column: 'phone_number', value: normalizePhone(senderId) };
}

export async function getMerchantByChannel(
  channel: Channel,
  senderId: string
): Promise<Merchant | null> {
  const { column, value } = channelLookup(channel, senderId);

  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq(column, value)
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

  if (channel === 'whatsapp' || channel === 'sms') insertData.phone_number = normalizePhone(senderId);
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

/**
 * Whether the merchant's SUBSCRIPTION (billing) is current.
 *
 * Deliberately ignores `is_active`. That column is the merchant's own PAUSE
 * switch for storefront visibility, not a billing signal. Conflating the two
 * meant PAUSE looked identical to an expired subscription: the bot demanded
 * payment for a subscription that was perfectly valid, and RESUME — which sits
 * below the subscription gate — became unreachable, permanently locking the
 * merchant out of their own store. Paying would have "fixed" it by setting
 * is_active = true, i.e. charging them to undo their own pause button.
 *
 * Storefront visibility is enforced separately and correctly: the store page
 * 404s when is_active is false, and shows "Store Unavailable" once the
 * subscription end date has passed.
 */
export function isSubscriptionActive(merchant: Merchant): boolean {
  if (merchant.subscription_plan === 'inactive') return false;
  const subEnds = new Date(merchant.subscription_ends_at);
  return subEnds > new Date();
}

export async function reactivateSubscription(
  channel: Channel,
  senderId: string, 
  plan: 'basic' | 'starter' | 'pro' | 'advanced' | 'premium' | 'business' | 'agency' | 'vip' | 'enterprise' | 'custom',
  isYearly: boolean = false
): Promise<void> {
  const { column, value } = channelLookup(channel, senderId);

  const { data: merchant, error: fetchError } = await supabase
    .from('merchants')
    .select('subscription_ends_at, is_active')
    .eq(column, value)
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
    .eq(column, value);

  if (error) {
    throw new Error(`Failed to reactivate subscription: ${error.message}`);
  }
}

export async function generateLinkCode(channel: Channel, senderId: string): Promise<string> {
  const { column, value } = channelLookup(channel, senderId);

  // Generate a random 6 character alphanumeric code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const { error } = await supabase
    .from('merchants')
    .update({ link_code: code })
    .eq(column, value);

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
  if (newChannel === 'whatsapp' || newChannel === 'sms') updateData.phone_number = normalizePhone(newSenderId);

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

export async function updateMerchantSocial(merchantId: string, platform: 'instagram_handle' | 'facebook_url' | 'phone_number', value: string): Promise<void> {
  const updateData: any = {};
  // phone_number is a lookup key for the bot and the payment webhook, so it
  // must be stored in the same canonical form everything else searches by.
  updateData[platform] = platform === 'phone_number' ? normalizePhone(value) : value;
  
  const { error } = await supabase
    .from('merchants')
    .update(updateData)
    .eq('id', merchantId);

  if (error) {
    throw new Error(`Failed to update ${platform}: ${error.message}`);
  }
}

