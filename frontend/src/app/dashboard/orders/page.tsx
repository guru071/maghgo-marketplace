'use client';

import React, { useEffect, useState } from 'react';

interface OrderLineItem {
  product_id: string;
  title: string;
  price: number;
  quantity: number;
  subtotal: number;
}

interface Order {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  items: OrderLineItem[];
  total: number;
  status: string;
  created_at: string;
}

const STATUSES = ['sent', 'confirmed', 'processing', 'delivered', 'cancelled'] as const;

const STATUS_STYLE: Record<string, string> = {
  sent: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-amber-100 text-amber-800',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

const inr = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [saving, setSaving] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const load = async () => {
    const token = localStorage.getItem('maghgo_merchant_token');
    if (!token) return setLoading(false);
    try {
      const res = await fetch(`${apiUrl}/api/dashboard/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load orders');
      setOrders(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id: string, status: string) => {
    const token = localStorage.getItem('maghgo_merchant_token');
    const previous = orders;
    // Optimistic: the merchant is often working through a queue and shouldn't
    // wait on a round trip for each one. Rolled back if the request fails.
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)));
    setSaving(id);
    try {
      const res = await fetch(`${apiUrl}/api/dashboard/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Update failed');
    } catch {
      setOrders(previous);
      alert('Could not update that order. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const shown = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  if (loading) return <div className="text-gray-500">Loading orders…</div>;
  if (error) return <div className="text-red-500">Could not load orders: {error}</div>;

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-black text-gray-900 mb-2">Orders</h1>
      <p className="text-gray-600 mb-8">
        Every order placed from your store, so you don&apos;t have to scroll back through chats.
      </p>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 shadow-sm text-center">
          <div className="text-6xl mb-4">🧾</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">No orders yet</h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            When a customer checks out from your store, the order is recorded here — items, total
            and status — even though they finish the conversation in chat.
          </p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-6 flex-wrap">
            {['all', ...STATUSES].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                  filter === s ? 'bg-accent text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s} {s !== 'all' && `(${orders.filter((o) => o.status === s).length})`}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {shown.map((o) => (
              <div key={o.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex justify-between items-start gap-4 mb-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-xs text-gray-400">#{o.id.slice(0, 8)}</span>
                      <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${STATUS_STYLE[o.status] ?? 'bg-gray-100'}`}>
                        {o.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {new Date(o.created_at).toLocaleString('en-IN')}
                      {o.customer_name && ` · ${o.customer_name}`}
                      {o.customer_phone && ` · ${o.customer_phone}`}
                    </div>
                  </div>
                  <div className="text-2xl font-black text-gray-900 shrink-0">{inr(o.total)}</div>
                </div>

                <div className="border-t border-gray-100 pt-3 space-y-1 mb-4">
                  {(o.items ?? []).map((li) => (
                    <div key={li.product_id} className="flex justify-between text-sm">
                      <span className="text-gray-700 truncate pr-3">
                        {li.quantity} × {li.title}
                      </span>
                      <span className="text-gray-500 shrink-0">{inr(li.subtotal)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {STATUSES.filter((s) => s !== o.status).map((s) => (
                    <button
                      key={s}
                      disabled={saving === o.id}
                      onClick={() => setStatus(o.id, s)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      Mark {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
