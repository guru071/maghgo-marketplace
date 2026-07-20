import { supabase } from '../db/supabase';
import { normalizePhone } from '../utils/phone';
import { validateCoupon, redeemCoupon } from './coupon.service';
import { sendNotification } from './whatsapp.service';
import { env } from '../config/env';

// ─── Order Service ───────────────────────────────────────────────────────────
// Until now checkout only opened a WhatsApp link and the order left the system
// entirely: order_logs existed in the schema but nothing ever wrote to it.
// That is why "Analytics" had to invent a revenue figure and "Reports" exported
// a hardcoded CSV — there was no order data in the product at all.

export type OrderStatus = 'sent' | 'confirmed' | 'processing' | 'delivered' | 'cancelled';

export const ORDER_STATUSES: OrderStatus[] = ['sent', 'confirmed', 'processing', 'delivered', 'cancelled'];

export interface OrderItemInput {
  product_id: string;
  quantity: number;
  variant?: string; // buyer-selected options, e.g. "Size: M · Colour: Red"
}

export interface OrderLineItem {
  product_id: string;
  title: string;
  price: number;
  quantity: number;
  subtotal: number;
  image_url?: string | null;
  variant?: string;
}

export type PaymentStatus = 'unpaid' | 'paid';

export interface Order {
  id: string;
  merchant_id: string;
  customer_phone: string | null;
  customer_name: string | null;
  items: OrderLineItem[];
  total: number;
  currency: string;
  status: OrderStatus;
  notes: string | null;
  delivery_address?: string | null;
  created_at: string;
  // Added in migration 16 — optional so the type is valid pre-migration.
  discount?: number;
  coupon_code?: string | null;
  payment_status?: PaymentStatus;
  payment_link_url?: string | null;
  payment_link_id?: string | null;
  paid_at?: string | null;
}

const MAX_ITEMS_PER_ORDER = 50;
const MAX_QTY_PER_ITEM = 99;

/**
 * Record an order placed from a public storefront.
 *
 * Prices and titles are re-read from the database and the total is recomputed
 * server-side. The client's cart only contributes product ids and quantities:
 * anything a shopper can edit in devtools (price, title, total) is ignored, so
 * a tampered cart cannot write a ₹1 order into the merchant's books.
 *
 * @returns the created order, or null if the store/products don't resolve.
 */
export async function createOrder(
  storeSlug: string,
  items: OrderItemInput[],
  customer: { name?: string; phone?: string; notes?: string; couponCode?: string; deliveryAddress?: string } = {}
): Promise<Order | null> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('An order must contain at least one item.');
  }
  if (items.length > MAX_ITEMS_PER_ORDER) {
    throw new Error(`An order cannot contain more than ${MAX_ITEMS_PER_ORDER} distinct items.`);
  }

  // Collapse duplicate lines and clamp quantities before touching the database.
  // Keyed by product + chosen variant, so the same shirt in two sizes stays two
  // distinct order lines.
  interface Wanted { productId: string; variant?: string; qty: number }
  const wanted = new Map<string, Wanted>();
  for (const item of items) {
    if (!item || typeof item.product_id !== 'string') continue;
    const qty = Math.floor(Number(item.quantity));
    if (!Number.isFinite(qty) || qty < 1) continue;
    const variant = item.variant ? String(item.variant).trim().slice(0, 160) || undefined : undefined;
    const key = `${item.product_id}|${variant ?? ''}`;
    const prev = wanted.get(key);
    wanted.set(key, { productId: item.product_id, variant, qty: Math.min((prev?.qty ?? 0) + qty, MAX_QTY_PER_ITEM) });
  }
  if (wanted.size === 0) throw new Error('No valid items in this order.');
  const productIds = [...new Set([...wanted.values()].map((w) => w.productId))];

  const { data: merchant, error: merchantError } = await supabase
    .from('merchants')
    .select('id, is_active, subscription_ends_at')
    .eq('store_slug', storeSlug)
    .single();

  if (merchantError || !merchant) return null;

  // Don't take orders for a store the storefront itself would refuse to show.
  // Guard NULL/invalid dates: new Date(null) = epoch (1970) which is always < now,
  // so a legacy merchant with no subscription_ends_at would silently block all orders.
  const subEndsRaw = merchant.subscription_ends_at;
  const subEnds = subEndsRaw ? new Date(subEndsRaw) : null;
  const subExpired = subEnds && !isNaN(subEnds.getTime()) ? subEnds < new Date() : false;
  if (!merchant.is_active || subExpired) return null;

  // Authoritative prices — scoped to this merchant so a product id from another
  // store cannot be smuggled into the cart. `stock` is read where the column
  // exists (migration 16); pre-migration we fall back and simply don't track it.
  const baseCols = 'id, title, price, currency, processed_image_url, original_image_url';
  let products: any[] | null = null;
  let stockTracked = true;
  {
    let { data, error }: { data: any[] | null; error: any } = await supabase
      .from('products')
      .select(`${baseCols}, stock`)
      .eq('merchant_id', merchant.id)
      .eq('is_available', true)
      .in('id', productIds);

    if (error && /stock|schema cache|42703/i.test(error.message || '')) {
      stockTracked = false;
      ({ data, error } = await supabase
        .from('products')
        .select(baseCols)
        .eq('merchant_id', merchant.id)
        .eq('is_available', true)
        .in('id', productIds));
    }
    if (error) throw new Error(`Failed to price order: ${error.message}`);
    products = data;
  }
  if (!products || products.length === 0) return null;

  const byId = new Map(products.map((p) => [p.id, p]));
  const lineItems: OrderLineItem[] = [];
  for (const w of wanted.values()) {
    const p = byId.get(w.productId);
    if (!p) continue; // product from another store / unavailable / not found
    let quantity = w.qty;
    // Never sell more than is in stock. A tracked product at 0 is dropped from
    // the order entirely rather than overselling. (Stock is per product; it is
    // shared across a product's variants.)
    if (stockTracked && p.stock != null) {
      const available = Math.max(0, Number(p.stock));
      if (available === 0) continue;
      quantity = Math.min(quantity, available);
    }
    const price = Number(p.price);
    // Snapshot title/image/variant with the order so the owner sees exactly what
    // was ordered even if the product is later edited or removed.
    lineItems.push({
      product_id: p.id,
      title: p.title,
      price,
      quantity,
      subtotal: price * quantity,
      image_url: p.processed_image_url || p.original_image_url || null,
      ...(w.variant ? { variant: w.variant } : {}),
    });
  }

  // Everything the shopper asked for was out of stock.
  if (lineItems.length === 0) return null;

  const subtotal = lineItems.reduce((sum, li) => sum + li.subtotal, 0);

  // Coupons are re-validated here (server-side) even if the client already
  // showed a discount: an expired or used-up code is silently dropped rather
  // than blocking the sale, so the shopper never loses their order over it.
  let discount = 0;
  let couponCode: string | null = null;
  let couponId: string | null = null;
  if (customer.couponCode) {
    try {
      const applied = await validateCoupon(merchant.id, customer.couponCode, subtotal);
      if (applied) {
        discount = applied.discount;
        couponCode = applied.code;
        couponId = applied.id;
      }
    } catch {
      /* invalid/expired coupon → no discount, order proceeds */
    }
  }
  const total = Math.max(0, subtotal - discount);

  const insertRow: Record<string, any> = {
    merchant_id: merchant.id,
    customer_name: customer.name?.trim().slice(0, 100) || null,
    customer_phone: customer.phone ? normalizePhone(customer.phone).slice(0, 20) : null,
    items: lineItems,
    total,
    currency: products[0].currency || 'INR',
    status: 'sent',
    notes: customer.notes?.trim().slice(0, 500) || null,
    delivery_address: customer.deliveryAddress?.trim().slice(0, 400) || null,
    discount,
    coupon_code: couponCode,
  };

  const data = await insertOrderRow(insertRow);

  // Best-effort side effects — the order is already saved, so none of these may
  // throw back to the caller and undo a real sale.
  if (couponId) await redeemCoupon(couponId);
  if (stockTracked) await decrementStock(merchant.id, lineItems).catch(() => {});

  return data as Order;
}

/**
 * Insert an order row, tolerating a pre-migration-16 schema. If the discount /
 * coupon columns don't exist yet, strip them and retry so the order still saves.
 */
async function insertOrderRow(row: Record<string, any>): Promise<Order> {
  let { data, error } = await supabase.from('order_logs').insert(row).select().single();

  if (error && /discount|coupon_code|payment_status|delivery_address|schema cache|42703/i.test(error.message || '')) {
    const { discount, coupon_code, delivery_address, ...base } = row;
    ({ data, error } = await supabase.from('order_logs').insert(base).select().single());
  }
  if (error) throw new Error(`Failed to record order: ${error.message}`);
  return data as Order;
}

/**
 * Decrement stock for the ordered products. Only touches rows that actually
 * track stock (non-null). Best-effort and per-product so one failure can't stop
 * the rest; a rare race that lets stock dip slightly negative is corrected the
 * next time the merchant sets it.
 */
async function decrementStock(merchantId: string, lineItems: OrderLineItem[]): Promise<void> {
  const LOW_STOCK_AT = 2;
  const lowNow: string[] = [];
  for (const li of lineItems) {
    const { data } = await supabase
      .from('products')
      .select('stock')
      .eq('id', li.product_id)
      .eq('merchant_id', merchantId)
      .maybeSingle();
    if (!data || data.stock == null) continue;
    const prev = Number(data.stock);
    const next = Math.max(0, prev - li.quantity);
    await supabase.from('products').update({ stock: next }).eq('id', li.product_id).eq('merchant_id', merchantId);
    // Alert exactly when stock CROSSES the threshold, so the owner hears once,
    // not on every subsequent sale.
    if (prev > LOW_STOCK_AT && next <= LOW_STOCK_AT) {
      lowNow.push(`${li.title}: ${next === 0 ? 'OUT OF STOCK' : `only ${next} left`}`);
    }
  }
  if (lowNow.length) {
    const { data: m } = await supabase.from('merchants').select('phone_number').eq('id', merchantId).maybeSingle();
    if (m?.phone_number) {
      sendNotification(m.phone_number, `⚠️ *Low stock alert!*\n\n${lowNow.map((l) => `• ${l}`).join('\n')}\n\nRestock with: *STOCK <product> <qty>*`)
        .catch((e) => console.error('low-stock alert failed:', e?.message || e));
    }
  }
}

/** Find an order by its Razorpay payment-link id (used by the pay callback). */
export async function getOrderByPaymentLink(paymentLinkId: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('order_logs')
    .select('*')
    .eq('payment_link_id', paymentLinkId)
    .maybeSingle();
  if (error || !data) return null;
  return data as Order;
}

/** Persist the Razorpay payment link generated for an order. Best-effort. */
export async function attachOrderPaymentLink(orderId: string, url: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('order_logs')
    .update({ payment_link_url: url, payment_link_id: id })
    .eq('id', orderId);
  if (error && !/payment_link|schema cache|42703/i.test(error.message || '')) {
    console.error('Failed to attach payment link:', error.message);
  }
}

/**
 * Mark an order paid from a verified Razorpay webhook, looked up by its payment
 * link id. Returns the order + merchant so the caller can notify both parties.
 * Idempotent: an already-paid order is returned but not re-processed.
 */
export async function markOrderPaidByLink(
  paymentLinkId: string
): Promise<{ order: Order; alreadyPaid: boolean } | null> {
  const { data: order, error } = await supabase
    .from('order_logs')
    .select('*')
    .eq('payment_link_id', paymentLinkId)
    .maybeSingle();

  if (error || !order) return null;
  if ((order as Order).payment_status === 'paid') return { order: order as Order, alreadyPaid: true };

  await supabase
    .from('order_logs')
    .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', order.id);

  return { order: { ...(order as Order), payment_status: 'paid' }, alreadyPaid: false };
}

/**
 * Authoritatively price a cart without recording an order — used to validate a
 * coupon against a real, server-computed subtotal (never a client figure).
 * @returns the merchant id and subtotal, or null if the store/items don't resolve.
 */
export async function priceCart(
  storeSlug: string,
  items: OrderItemInput[]
): Promise<{ merchantId: string; subtotal: number } | null> {
  const wanted = new Map<string, number>();
  for (const item of Array.isArray(items) ? items : []) {
    if (!item || typeof item.product_id !== 'string') continue;
    const qty = Math.floor(Number(item.quantity));
    if (!Number.isFinite(qty) || qty < 1) continue;
    wanted.set(item.product_id, Math.min((wanted.get(item.product_id) ?? 0) + qty, MAX_QTY_PER_ITEM));
  }
  if (wanted.size === 0) return null;

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id')
    .eq('store_slug', storeSlug)
    .single();
  if (!merchant) return null;

  const { data: products } = await supabase
    .from('products')
    .select('id, price')
    .eq('merchant_id', merchant.id)
    .eq('is_available', true)
    .in('id', [...wanted.keys()]);
  if (!products || products.length === 0) return null;

  const subtotal = products.reduce((sum, p) => sum + Number(p.price) * wanted.get(p.id)!, 0);
  return { merchantId: merchant.id, subtotal };
}

/** Orders for a merchant, newest first. */
export async function getOrders(merchantId: string, limit = 100): Promise<Order[]> {
  const { data, error } = await supabase
    .from('order_logs')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch orders: ${error.message}`);
  return (data ?? []) as Order[];
}

/**
 * Move an order along its status flow.
 * Scoped by merchant_id so one merchant cannot touch another's orders.
 */
export async function updateOrderStatus(
  merchantId: string,
  orderId: string,
  status: OrderStatus
): Promise<boolean> {
  if (!ORDER_STATUSES.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${ORDER_STATUSES.join(', ')}`);
  }

  const { data, error } = await supabase
    .from('order_logs')
    .update({ status })
    .eq('id', orderId)
    .eq('merchant_id', merchantId)
    .select('id, customer_phone, total, currency')
    .single();

  if (error) {
    if ((error as any).code === 'PGRST116') return false; // no row matched
    throw new Error(`Failed to update order: ${error.message}`);
  }
  if (!data) return false;

  // Keep the customer in the loop over WhatsApp — but never let a notification
  // failure roll back a status the merchant successfully changed.
  notifyCustomerOfStatus(merchantId, data.id, data.customer_phone, status, Number(data.total), data.currency)
    .catch((e) => console.error('Order status notification failed:', e?.message || e));

  return true;
}

/**
 * Message the shopper when their order moves forward. Only fires when we have a
 * phone number for them (orders placed by phone-based channels) and only for the
 * transitions a customer cares about — 'sent' is the initial state and produces
 * no message.
 */
const STATUS_MESSAGES: Partial<Record<OrderStatus, (store: string, total: string) => string>> = {
  confirmed: (store, total) => `✅ Your order at *${store}* (${total}) is *confirmed*! We'll update you as it progresses. 🙏`,
  processing: (store, total) => `📦 Good news — your order at *${store}* (${total}) is now being *prepared*.`,
  delivered: (store, total) => `🎉 Your order at *${store}* (${total}) has been *delivered*. Thank you for shopping with us!\n\n⭐ How was it? Reply *RATE 5* (1–5) to rate the shop.`,
  cancelled: (store, total) => `⚠️ Your order at *${store}* (${total}) has been *cancelled*. Please reach out if you have any questions.`,
};

async function notifyCustomerOfStatus(
  merchantId: string,
  orderId: string,
  customerPhone: string | null,
  status: OrderStatus,
  total: number,
  currency: string
): Promise<void> {
  const build = STATUS_MESSAGES[status];
  if (!build || !customerPhone) return;

  // Only a real phone number can receive a WhatsApp message (Instagram/Messenger
  // ids are stored elsewhere and aren't reachable this way).
  const phone = normalizePhone(customerPhone);
  if (!/^[1-9]\d{9,14}$/.test(phone)) return;

  const { data: merchant } = await supabase
    .from('merchants')
    .select('store_name')
    .eq('id', merchantId)
    .maybeSingle();

  const store = merchant?.store_name || 'the store';
  const symbol = currency === 'INR' ? '₹' : `${currency} `;
  const totalStr = `${symbol}${Number(total).toLocaleString('en-IN')}`;
  await sendNotification(phone, `${build(store, totalStr)}\n\n🔎 Track: ${env.FRONTEND_URL}/o/${orderId}`);
}

export interface Analytics {
  revenue: number;          // delivered + confirmed + processing (excludes cancelled)
  revenue_this_month: number;
  order_count: number;
  orders_this_month: number;
  average_order_value: number;
  by_status: Record<OrderStatus, number>;
  top_products: { title: string; quantity: number; revenue: number }[];
  recent_days: { date: string; orders: number; revenue: number }[];
}

/**
 * Real analytics, aggregated from real orders.
 *
 * Cancelled orders are excluded from revenue: counting them would overstate
 * what the merchant actually earned, which is the whole reason the old
 * hardcoded "₹45,231" was worse than showing nothing.
 */
export async function getAnalytics(merchantId: string): Promise<Analytics> {
  const { data, error } = await supabase
    .from('order_logs')
    .select('total, status, items, created_at')
    .eq('merchant_id', merchantId);

  if (error) throw new Error(`Failed to compute analytics: ${error.message}`);

  const orders = data ?? [];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const earns = (s: string) => s !== 'cancelled';

  const by_status = ORDER_STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: 0 }),
    {} as Record<OrderStatus, number>
  );

  let revenue = 0, revenue_this_month = 0, orders_this_month = 0, counted = 0;
  const productTotals = new Map<string, { quantity: number; revenue: number }>();
  const dayTotals = new Map<string, { orders: number; revenue: number }>();

  for (const o of orders) {
    by_status[o.status as OrderStatus] = (by_status[o.status as OrderStatus] ?? 0) + 1;
    if (!earns(o.status)) continue;

    const total = Number(o.total) || 0;
    const created = new Date(o.created_at);
    revenue += total;
    counted++;

    if (created >= monthStart) {
      revenue_this_month += total;
      orders_this_month++;
    }

    const day = created.toISOString().slice(0, 10);
    const d = dayTotals.get(day) ?? { orders: 0, revenue: 0 };
    dayTotals.set(day, { orders: d.orders + 1, revenue: d.revenue + total });

    for (const li of (o.items as OrderLineItem[]) ?? []) {
      const p = productTotals.get(li.title) ?? { quantity: 0, revenue: 0 };
      productTotals.set(li.title, {
        quantity: p.quantity + (li.quantity ?? 0),
        revenue: p.revenue + (li.subtotal ?? 0),
      });
    }
  }

  const top_products = [...productTotals.entries()]
    .map(([title, v]) => ({ title, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Last 14 days, including days with no orders so a chart doesn't lie by
  // omitting the gaps.
  const recent_days: Analytics['recent_days'] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
    const v = dayTotals.get(d) ?? { orders: 0, revenue: 0 };
    recent_days.push({ date: d, ...v });
  }

  return {
    revenue,
    revenue_this_month,
    order_count: orders.length,
    orders_this_month,
    average_order_value: counted > 0 ? Math.round(revenue / counted) : 0,
    by_status,
    top_products,
    recent_days,
  };
}
