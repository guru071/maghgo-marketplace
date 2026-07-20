'use server';

import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

// ─── Merchant management actions ─────────────────────────────────────────────
// Full platform-owner control over any merchant. All run server-side with the
// service key, behind the admin basic-auth (the middleware matches these page
// paths for every HTTP method, so the actions are protected too).

const VALID_PLANS = ['inactive', 'trial', 'basic', 'starter', 'pro', 'advanced', 'premium', 'business', 'agency', 'vip', 'enterprise', 'custom'];

function done(ok: boolean, message: string) {
  revalidatePath('/goatech-admin-hq/merchants');
  revalidatePath('/goatech-admin-hq');
  return { ok, message };
}

/** Extend a merchant's subscription by N days (from expiry if still active, else from now). */
export async function extendSubscription(merchantId: string, days: number) {
  const supabase = createAdminSupabaseClient();
  const d = Math.max(1, Math.min(3650, Math.floor(days)));

  const { data: m, error: fetchErr } = await supabase
    .from('merchants').select('subscription_ends_at').eq('id', merchantId).single();
  if (fetchErr || !m) return done(false, 'Merchant not found');

  const now = new Date();
  const current = new Date(m.subscription_ends_at || 0);
  const base = current > now ? current : now;
  const next = new Date(base.getTime() + d * 24 * 60 * 60 * 1000);

  const { error } = await supabase
    .from('merchants')
    .update({ subscription_ends_at: next.toISOString(), is_active: true })
    .eq('id', merchantId);
  if (error) return done(false, error.message);
  return done(true, `Extended ${d} days → ${next.toLocaleDateString('en-IN')}`);
}

/** Change a merchant's plan (admin override — no payment involved). */
export async function setMerchantPlan(merchantId: string, plan: string) {
  if (!VALID_PLANS.includes(plan)) return done(false, 'Invalid plan');
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from('merchants').update({ subscription_plan: plan }).eq('id', merchantId);
  if (error) return done(false, error.message);
  return done(true, `Plan set to ${plan.toUpperCase()}`);
}

/** Suspend / reactivate a storefront (the merchant's own pause switch, forced). */
export async function setMerchantActive(merchantId: string, active: boolean) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from('merchants').update({ is_active: active }).eq('id', merchantId);
  if (error) return done(false, error.message);
  return done(true, active ? 'Store reactivated' : 'Store suspended');
}

/**
 * Permanently delete a merchant. Products, orders, coupons and reviews go with
 * it via FK cascade. Irreversible — the UI double-confirms before calling this.
 */
export async function deleteMerchant(merchantId: string) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from('merchants').delete().eq('id', merchantId);
  if (error) return done(false, error.message);
  return done(true, 'Merchant permanently deleted');
}

/**
 * Support flow: a shop owner asks to link a new chat app; the admin picks their
 * shop here and mints a code that expires in 2 MINUTES. The owner sends
 * "LINK <code>" on the new app within that window.
 */
export async function generateAdminLinkCode(merchantId: string) {
  const supabase = createAdminSupabaseClient();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));

  const expires = new Date(Date.now() + 2 * 60 * 1000).toISOString();
  let { error } = await supabase
    .from('merchants')
    .update({ link_code: code, link_code_expires_at: expires })
    .eq('id', merchantId);

  // Expiry column missing (migration 26 not run) → still mint, but say so.
  let note = 'expires in 2 minutes';
  if (error && /link_code_expires_at|schema cache|42703|PGRST204/i.test(error.message || '')) {
    ({ error } = await supabase.from('merchants').update({ link_code: code }).eq('id', merchantId));
    note = 'no expiry — run migration 26 for the 2-minute limit';
  }
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const, code, message: note };
}
