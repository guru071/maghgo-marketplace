import { supabase } from '../db/supabase';

// ─── Coupon Service ──────────────────────────────────────────────────────────
// Merchant-defined discount codes a shopper can apply at checkout. Codes are
// validated and redeemed entirely server-side — the browser/bot only ever sends
// a code string, never a discount amount, so a tampered request cannot conjure
// a cheaper order.
//
// The `coupons` table ships in migration 16. Until it's applied every function
// here degrades to "no coupons": listing returns [], validation returns null,
// creation surfaces a friendly setup message. Nothing else breaks.

export type DiscountType = 'percent' | 'flat';

export interface Coupon {
  id: string;
  merchant_id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  is_active: boolean;
  max_uses: number | null;
  used_count: number;
  min_order: number;
  expires_at: string | null;
  created_at: string;
}

/** True when the error means the coupons table hasn't been created yet. */
function isMissingTable(error: any): boolean {
  const code = error?.code;
  return (
    code === '42P01' ||           // Postgres: relation does not exist
    code === 'PGRST205' ||        // PostgREST: table not in schema cache
    /coupons.*(does not exist|schema cache)|relation .*coupons/i.test(error?.message || '')
  );
}

const MIGRATION_HINT =
  'Coupons need one setup step (migration 16) before they can be used.';

/** Normalise a code to its canonical stored form: upper-case, no spaces. */
export function normalizeCode(code: string): string {
  return (code || '').trim().toUpperCase().replace(/\s+/g, '');
}

/** All of a merchant's coupons, newest first. */
export async function listCoupons(merchantId: string): Promise<Coupon[]> {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingTable(error)) return [];
    throw new Error(`Failed to load coupons: ${error.message}`);
  }
  return (data ?? []) as Coupon[];
}

export interface CreateCouponInput {
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  max_uses?: number | null;
  min_order?: number;
  expires_at?: string | null;
}

export async function createCoupon(merchantId: string, input: CreateCouponInput): Promise<Coupon> {
  const code = normalizeCode(input.code);
  if (!code) throw new Error('A coupon code is required.');
  if (!/^[A-Z0-9]{3,20}$/.test(code)) {
    throw new Error('Code must be 3–20 letters/numbers, e.g. DIWALI20.');
  }
  if (input.discount_type !== 'percent' && input.discount_type !== 'flat') {
    throw new Error("discount_type must be 'percent' or 'flat'.");
  }
  const value = Number(input.discount_value);
  if (!Number.isFinite(value) || value <= 0) throw new Error('Discount must be greater than 0.');
  if (input.discount_type === 'percent' && value > 90) {
    throw new Error('A percentage discount cannot exceed 90%.');
  }

  const { data, error } = await supabase
    .from('coupons')
    .insert({
      merchant_id: merchantId,
      code,
      discount_type: input.discount_type,
      discount_value: value,
      max_uses: input.max_uses ?? null,
      min_order: input.min_order ?? 0,
      expires_at: input.expires_at ?? null,
    })
    .select()
    .single();

  if (error) {
    if (isMissingTable(error)) throw new Error(MIGRATION_HINT);
    if ((error as any).code === '23505') throw new Error(`Code "${code}" already exists.`);
    throw new Error(`Failed to create coupon: ${error.message}`);
  }
  return data as Coupon;
}

/** Permanently remove a coupon. Scoped to the merchant. */
export async function deleteCoupon(merchantId: string, id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('coupons')
    .delete()
    .eq('id', id)
    .eq('merchant_id', merchantId)
    .select('id');

  if (error) {
    if (isMissingTable(error)) return false;
    throw new Error(`Failed to delete coupon: ${error.message}`);
  }
  return (data?.length ?? 0) > 0;
}

export interface AppliedCoupon {
  id: string;
  code: string;
  discount: number; // rupees off, already clamped to the subtotal
}

/**
 * Validate a code for a merchant against an order subtotal.
 *
 * @returns the applicable discount, or null if the code isn't usable.
 * @throws a shopper-friendly Error explaining why a real-but-invalid code
 *         (expired, used up, below minimum) can't be applied.
 */
export async function validateCoupon(
  merchantId: string,
  rawCode: string,
  subtotal: number
): Promise<AppliedCoupon | null> {
  const code = normalizeCode(rawCode);
  if (!code) return null;

  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('code', code)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) return null;
    throw new Error(`Failed to check coupon: ${error.message}`);
  }
  const coupon = data as Coupon | null;
  if (!coupon || !coupon.is_active) {
    throw new Error(`Coupon "${code}" is not valid.`);
  }
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    throw new Error(`Coupon "${code}" has expired.`);
  }
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) {
    throw new Error(`Coupon "${code}" has already been fully redeemed.`);
  }
  if (subtotal < Number(coupon.min_order)) {
    throw new Error(`Coupon "${code}" needs a minimum order of ₹${Number(coupon.min_order).toLocaleString('en-IN')}.`);
  }

  const discount =
    coupon.discount_type === 'percent'
      ? Math.round((subtotal * Number(coupon.discount_value)) / 100)
      : Number(coupon.discount_value);

  return { id: coupon.id, code, discount: Math.min(discount, subtotal) };
}

/** Increment a coupon's redemption count. Best-effort — never blocks an order. */
export async function redeemCoupon(id: string): Promise<void> {
  try {
    const { data } = await supabase.from('coupons').select('used_count').eq('id', id).maybeSingle();
    if (!data) return;
    await supabase.from('coupons').update({ used_count: (data.used_count ?? 0) + 1 }).eq('id', id);
  } catch (err) {
    console.error('Failed to redeem coupon (non-fatal):', (err as any)?.message || err);
  }
}
