import { supabase } from '../db/supabase';
import { normalizePhone } from '../utils/phone';

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
}

export interface OrderLineItem {
  product_id: string;
  title: string;
  price: number;
  quantity: number;
  subtotal: number;
}

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
  created_at: string;
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
  customer: { name?: string; phone?: string; notes?: string } = {}
): Promise<Order | null> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('An order must contain at least one item.');
  }
  if (items.length > MAX_ITEMS_PER_ORDER) {
    throw new Error(`An order cannot contain more than ${MAX_ITEMS_PER_ORDER} distinct items.`);
  }

  // Collapse duplicate lines and clamp quantities before touching the database.
  const wanted = new Map<string, number>();
  for (const item of items) {
    if (!item || typeof item.product_id !== 'string') continue;
    const qty = Math.floor(Number(item.quantity));
    if (!Number.isFinite(qty) || qty < 1) continue;
    wanted.set(item.product_id, Math.min((wanted.get(item.product_id) ?? 0) + qty, MAX_QTY_PER_ITEM));
  }
  if (wanted.size === 0) throw new Error('No valid items in this order.');

  const { data: merchant, error: merchantError } = await supabase
    .from('merchants')
    .select('id, is_active, subscription_ends_at')
    .eq('store_slug', storeSlug)
    .single();

  if (merchantError || !merchant) return null;

  // Don't take orders for a store the storefront itself would refuse to show.
  const subEnds = new Date(merchant.subscription_ends_at);
  if (!merchant.is_active || subEnds < new Date()) return null;

  // Authoritative prices — scoped to this merchant so a product id from another
  // store cannot be smuggled into the cart.
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, title, price, currency')
    .eq('merchant_id', merchant.id)
    .eq('is_available', true)
    .in('id', [...wanted.keys()]);

  if (productsError) throw new Error(`Failed to price order: ${productsError.message}`);
  if (!products || products.length === 0) return null;

  const lineItems: OrderLineItem[] = products.map((p) => {
    const quantity = wanted.get(p.id)!;
    const price = Number(p.price);
    return { product_id: p.id, title: p.title, price, quantity, subtotal: price * quantity };
  });

  const total = lineItems.reduce((sum, li) => sum + li.subtotal, 0);

  const { data, error } = await supabase
    .from('order_logs')
    .insert({
      merchant_id: merchant.id,
      customer_name: customer.name?.trim().slice(0, 100) || null,
      customer_phone: customer.phone ? normalizePhone(customer.phone).slice(0, 20) : null,
      items: lineItems,
      total,
      currency: products[0].currency || 'INR',
      status: 'sent',
      notes: customer.notes?.trim().slice(0, 500) || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to record order: ${error.message}`);

  return data as Order;
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
    .select('id');

  if (error) throw new Error(`Failed to update order: ${error.message}`);
  return (data?.length ?? 0) > 0;
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
