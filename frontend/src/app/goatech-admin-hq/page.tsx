import React from 'react';
import Link from 'next/link';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic'; // always-live numbers, never cached

const inr = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

/**
 * The real platform overview — every number queried live from the database
 * with the service key. This replaces the old page, which was nothing but a
 * redirect to Themes.
 */
export default async function AdminOverview() {
  const supabase = createAdminSupabaseClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [merchantsQ, paymentsQ, ordersQ, productsQ, reviewsQ] = await Promise.all([
    supabase.from('merchants').select('id, store_name, store_slug, subscription_plan, subscription_ends_at, is_active, created_at').order('created_at', { ascending: false }),
    supabase.from('payments').select('amount, plan, is_yearly, created_at').order('created_at', { ascending: false }),
    supabase.from('order_logs').select('total, status, created_at'),
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('store_reviews').select('rating'),
  ]);

  const merchants = merchantsQ.data ?? [];
  const payments = paymentsQ.data ?? [];
  const orders = ordersQ.data ?? [];
  const productCount = productsQ.count ?? 0;
  const reviews = reviewsQ.data ?? [];

  const activeSubs = merchants.filter((m) => new Date(m.subscription_ends_at) > now).length;
  const expired = merchants.length - activeSubs;
  const newThisMonth = merchants.filter((m) => m.created_at >= monthStart).length;

  const platformRevenue = payments.reduce((s, p) => s + Number(p.amount), 0);
  const revenueThisMonth = payments.filter((p) => p.created_at >= monthStart).reduce((s, p) => s + Number(p.amount), 0);

  const gmvOrders = orders.filter((o) => o.status !== 'cancelled');
  const gmv = gmvOrders.reduce((s, o) => s + Number(o.total), 0);
  const gmvThisMonth = gmvOrders.filter((o) => o.created_at >= monthStart).reduce((s, o) => s + Number(o.total), 0);

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  const stats: { label: string; value: string; sub?: string; accent?: string }[] = [
    { label: 'Your revenue (subscriptions)', value: inr(platformRevenue), sub: `${inr(revenueThisMonth)} this month`, accent: 'text-emerald-600' },
    { label: 'Merchants', value: String(merchants.length), sub: `${activeSubs} active · ${expired} expired · +${newThisMonth} this month` },
    { label: 'Ecosystem sales (GMV)', value: inr(gmv), sub: `${inr(gmvThisMonth)} this month · ${gmvOrders.length} orders` },
    { label: 'Products live', value: String(productCount), sub: avgRating ? `⭐ ${avgRating}/5 avg store rating (${reviews.length})` : 'No ratings yet' },
  ];

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-3xl font-black text-gray-900 mb-1">Platform Overview</h1>
      <p className="text-gray-500 mb-8">Live numbers, straight from the database.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-black mt-1 ${s.accent ?? 'text-gray-900'}`}>{s.value}</p>
            {s.sub && <p className="text-xs text-gray-500 mt-1">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Latest merchants</h2>
            <Link href="/goatech-admin-hq/merchants" className="text-sm text-indigo-600 hover:underline">Manage all →</Link>
          </div>
          {merchants.slice(0, 6).map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="min-w-0">
                <p className="font-medium text-gray-800 truncate">{m.store_name}</p>
                <p className="text-xs text-gray-400">/{m.store_slug} · {new Date(m.created_at).toLocaleDateString('en-IN')}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-600">{m.subscription_plan}</span>
                <p className={`text-[11px] mt-0.5 ${new Date(m.subscription_ends_at) > now ? 'text-emerald-600' : 'text-red-500'}`}>
                  {new Date(m.subscription_ends_at) > now ? `until ${new Date(m.subscription_ends_at).toLocaleDateString('en-IN')}` : 'expired'}
                </p>
              </div>
            </div>
          ))}
          {merchants.length === 0 && <p className="text-sm text-gray-400">No merchants yet.</p>}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Latest subscription payments</h2>
            <Link href="/goatech-admin-hq/payments" className="text-sm text-indigo-600 hover:underline">Full ledger →</Link>
          </div>
          {payments.slice(0, 6).map((p, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="font-medium text-gray-800">{inr(Number(p.amount))}</p>
                <p className="text-xs text-gray-400">{new Date(p.created_at).toLocaleString('en-IN')}</p>
              </div>
              <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                {p.plan}{p.is_yearly ? ' · yearly' : ''}
              </span>
            </div>
          ))}
          {payments.length === 0 && <p className="text-sm text-gray-400">No payments yet — they appear the moment a merchant pays a subscription link.</p>}
        </div>
      </div>
    </div>
  );
}
