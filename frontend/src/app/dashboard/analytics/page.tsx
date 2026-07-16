'use client';

import React, { useEffect, useState } from 'react';

interface Analytics {
  revenue: number;
  revenue_this_month: number;
  order_count: number;
  orders_this_month: number;
  average_order_value: number;
  by_status: Record<string, number>;
  top_products: { title: string; quantity: number; revenue: number }[];
  recent_days: { date: string; orders: number; revenue: number }[];
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</div>
      <div className="text-4xl font-black text-gray-900">{value}</div>
      {sub && <div className="text-sm text-gray-500 font-medium mt-2">{sub}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('maghgo_merchant_token');
    if (!token) {
      setLoading(false);
      return;
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/api/dashboard/analytics`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to load analytics');
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">Loading analytics…</div>;
  if (error) return <div className="text-red-500">Could not load analytics: {error}</div>;
  if (!data) return <div className="text-red-500">Failed to load analytics.</div>;

  const peak = Math.max(...data.recent_days.map((d) => d.revenue), 1);

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-black text-gray-900 mb-2">Analytics</h1>
      <p className="text-gray-600 mb-8">
        Real numbers from orders placed on your store. Cancelled orders are excluded from revenue.
      </p>

      {data.order_count === 0 ? (
        // No invented figures. An empty state is more useful than a fake one.
        <div className="bg-white rounded-2xl border border-gray-200 p-12 shadow-sm text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">No orders yet</h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            As soon as a customer checks out from your store, their order appears here — revenue,
            best sellers and daily totals, all calculated from real sales.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Stat label="Total Revenue" value={inr(data.revenue)} sub={`${inr(data.revenue_this_month)} this month`} />
            <Stat label="Orders" value={String(data.order_count)} sub={`${data.orders_this_month} this month`} />
            <Stat label="Avg Order Value" value={inr(data.average_order_value)} />
            <Stat label="Delivered" value={String(data.by_status.delivered ?? 0)} sub={`${data.by_status.cancelled ?? 0} cancelled`} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Revenue — last 14 days</h3>
            <div className="flex items-end gap-2 h-48">
              {data.recent_days.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end group">
                  <div className="text-[10px] text-gray-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {inr(d.revenue)}
                  </div>
                  <div
                    className="w-full bg-accent rounded-t transition-all hover:bg-accent-hover"
                    style={{ height: `${Math.max((d.revenue / peak) * 100, d.revenue > 0 ? 4 : 1)}%` }}
                    title={`${d.date}: ${inr(d.revenue)} from ${d.orders} order(s)`}
                  />
                  <div className="text-[9px] text-gray-400 mt-2">{d.date.slice(8)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Best sellers</h3>
            {data.top_products.length === 0 ? (
              <p className="text-gray-500">No sales recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {data.top_products.map((p, i) => (
                  <div key={p.title} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-bold text-gray-400 w-5 shrink-0">{i + 1}</span>
                      <span className="font-medium text-gray-900 truncate">{p.title}</span>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className="font-bold text-gray-900">{inr(p.revenue)}</div>
                      <div className="text-xs text-gray-500">{p.quantity} sold</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
