import { supabase } from '../db/supabase';
import { Merchant } from '../types/whatsapp';
import { normalizePhone } from '../utils/phone';
import { hasAccess } from '../utils/plans';

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

/** Look up an active store by its public slug (for customer bot shopping). */
export async function getMerchantBySlug(slug: string): Promise<Merchant | null> {
  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('store_slug', slug.toLowerCase())
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Store lookup failed: ${error.message}`);
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

/**
 * Set the store's physical address (shown as "Visit us" on the storefront and
 * used for the shopper bot's Directions button). Graceful if migration 15
 * hasn't added the column yet.
 */
export async function updateStoreAddress(merchantId: string, address: string): Promise<void> {
  const value = (address || '').trim().slice(0, 300) || null;
  const { error } = await supabase
    .from('merchants')
    .update({ store_address: value })
    .eq('id', merchantId);

  if (error) {
    if (/store_address|schema cache|42703|PGRST204/i.test(error.message || '')) {
      throw new Error('Store address needs one setup step (migration 15) before it can be saved.');
    }
    throw new Error(`Failed to save address: ${error.message}`);
  }
}

/** Set what kind of shop this is (Clothing, Grocery…). Graceful pre-migration 22. */
export async function updateStoreCategory(merchantId: string, category: string): Promise<void> {
  const value = (category || '').trim().slice(0, 60) || null;
  const { error } = await supabase
    .from('merchants')
    .update({ store_category: value })
    .eq('id', merchantId);
  if (error && !/store_category|schema cache|42703|PGRST204/i.test(error.message || '')) {
    throw new Error(`Failed to save category: ${error.message}`);
  }
}

/**
 * Claim (or clear, with null) a custom domain. Normalises pasted URLs, and maps
 * DB errors to friendly messages (missing migration 14 / already taken).
 */
export async function setCustomDomain(merchantId: string, raw: string | null): Promise<string | null> {
  let domain: string | null = null;
  if (raw && raw.trim()) {
    const cleaned = raw.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/\.$/, '').toLowerCase();
    if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(cleaned)) {
      throw new Error('That doesn\'t look like a valid domain. Example: mystore.com');
    }
    domain = cleaned;
  }

  const { error } = await supabase
    .from('merchants')
    .update({ custom_domain: domain })
    .eq('id', merchantId);

  if (error) {
    const code = (error as any).code;
    if (code === '23505') throw new Error('That domain is already connected to another store.');
    if (code === '42703' || code === 'PGRST204' || /custom_domain|schema cache/i.test(error.message || '')) {
      throw new Error('Custom domains need one setup step (migration 14) first.');
    }
    throw new Error(`Failed to save domain: ${error.message}`);
  }
  return domain;
}

/** Set the shopper-facing bot language ('en' | 'ta' | 'hi'). Graceful pre-migration 23. */
export async function updateBotLanguage(merchantId: string, lang: 'en' | 'ta' | 'hi'): Promise<void> {
  const { error } = await supabase
    .from('merchants')
    .update({ bot_language: lang })
    .eq('id', merchantId);
  if (error && !/bot_language|schema cache|42703|PGRST204/i.test(error.message || '')) {
    throw new Error(`Failed to set language: ${error.message}`);
  }
}

// ─── Shop Razorpay keys (for the bot's PAYMENTS flow) ────────────────────────

/** Whether this shop has connected its own Razorpay (never returns the secret). */
export async function hasRazorpayKeys(merchantId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('merchants')
    .select('razorpay_key_id')
    .eq('id', merchantId)
    .maybeSingle();
  if (error) return false; // pre-migration 17 → not connected
  return !!data?.razorpay_key_id;
}

/** Save the shop's Razorpay keys (secret must arrive already encrypted). */
export async function setRazorpayKeys(merchantId: string, keyId: string, encryptedSecret: string): Promise<void> {
  const { error } = await supabase
    .from('merchants')
    .update({ razorpay_key_id: keyId, razorpay_key_secret: encryptedSecret })
    .eq('id', merchantId);
  if (error) {
    if (/razorpay|schema cache|42703|PGRST204/i.test(error.message || '')) {
      throw new Error('Payments need one setup step (migration 17) first.');
    }
    throw new Error(`Failed to save payment keys: ${error.message}`);
  }
}

export async function clearRazorpayKeys(merchantId: string): Promise<void> {
  const { error } = await supabase
    .from('merchants')
    .update({ razorpay_key_id: null, razorpay_key_secret: null })
    .eq('id', merchantId);
  if (error && !/razorpay|schema cache|42703|PGRST204/i.test(error.message || '')) {
    throw new Error(`Failed to disconnect payments: ${error.message}`);
  }
}

// ─── Themes (for the bot's theme picker) ─────────────────────────────────────

export interface ThemeSummary {
  id: string;
  name: string;
  plan_required: string;
}

/** Active themes, for listing in the bot (paged so all 46 are reachable). */
export async function listThemes(limit = 10, offset = 0): Promise<{ themes: ThemeSummary[]; total: number }> {
  const { data, error, count } = await supabase
    .from('themes')
    .select('id, name, plan_required', { count: 'exact' })
    .eq('is_active', true)
    .order('name')
    .range(offset, offset + limit - 1);
  if (error || !data) return { themes: [], total: 0 };
  return { themes: data as ThemeSummary[], total: count ?? data.length };
}

/**
 * Apply a theme to a merchant's store by copying the theme's config onto the
 * merchant. Returns the theme name on success, or null if not found.
 * Enforces the theme's plan requirement when `currentPlan` is given — the bot
 * must not hand out premium themes the plan doesn't include.
 */
export async function applyThemeById(merchantId: string, themeId: string, currentPlan?: string): Promise<string | null> {
  const { data: theme, error } = await supabase
    .from('themes')
    .select('name, config, plan_required')
    .eq('id', themeId)
    .eq('is_active', true)
    .single();
  if (error || !theme) return null;

  if (currentPlan && theme.plan_required && !hasAccess(theme.plan_required, currentPlan)) {
    throw new Error(
      `"${theme.name}" needs the ${String(theme.plan_required).toUpperCase()} plan. Reply UPGRADE ${String(theme.plan_required).toUpperCase()} to unlock it.`
    );
  }

  const { error: upErr } = await supabase
    .from('merchants')
    .update({ theme_config: theme.config, theme_id: themeId })
    .eq('id', merchantId);
  if (upErr) throw new Error(`Failed to apply theme: ${upErr.message}`);
  return theme.name as string;
}

