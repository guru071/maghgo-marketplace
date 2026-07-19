import { supabase } from '../db/supabase';
import { normalizePhone } from '../utils/phone';

// ─── Store reviews ───────────────────────────────────────────────────────────
// Real ratings from real delivered orders — the honest replacement for the
// fake testimonials this project once shipped. A customer replies "RATE 1-5"
// after the delivered notification; one review per order (upsert by order).
// Table ships in migration 23; everything degrades gracefully before it.

function isMissingTable(error: any): boolean {
  return /store_reviews.*(does not exist|schema cache)|relation .*store_reviews/i.test(error?.message || '')
    || error?.code === '42P01' || error?.code === 'PGRST205';
}

/**
 * Record a rating from a customer phone against their most recent DELIVERED
 * order. Returns the store name rated, or null when there's nothing to rate.
 */
export async function addReviewByPhone(
  customerPhone: string,
  rating: number,
  comment?: string
): Promise<string | null> {
  const phone = normalizePhone(customerPhone);
  if (!phone || !Number.isInteger(rating) || rating < 1 || rating > 5) return null;

  const { data: order } = await supabase
    .from('order_logs')
    .select('id, merchant_id')
    .eq('customer_phone', phone)
    .eq('status', 'delivered')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!order) return null;

  const { error } = await supabase
    .from('store_reviews')
    .upsert(
      {
        merchant_id: order.merchant_id,
        order_id: order.id,
        rating,
        comment: comment?.trim().slice(0, 500) || null,
        customer_phone: phone,
      },
      { onConflict: 'order_id' }
    );
  if (error) {
    if (isMissingTable(error)) return null;
    throw new Error(`Failed to save rating: ${error.message}`);
  }

  const { data: m } = await supabase.from('merchants').select('store_name').eq('id', order.merchant_id).maybeSingle();
  return m?.store_name ?? 'the store';
}

/** Average rating + count for a store (for the bot's SALES view etc.). */
export async function getStoreRating(merchantId: string): Promise<{ average: number; count: number } | null> {
  const { data, error } = await supabase
    .from('store_reviews')
    .select('rating')
    .eq('merchant_id', merchantId);
  if (error || !data || data.length === 0) return null;
  const average = data.reduce((s, r) => s + r.rating, 0) / data.length;
  return { average: Math.round(average * 10) / 10, count: data.length };
}
