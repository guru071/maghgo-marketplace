'use client';

import React, { useEffect, useState } from 'react';

interface OrderLineItem {
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

/** RFC4180 escaping — titles routinely contain commas and quotes. */
function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function download(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
  // BOM so Excel opens ₹ and non-ASCII names correctly instead of mojibake.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('maghgo_merchant_token');
    if (!token) return setLoading(false);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/api/dashboard/orders`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to load');
        return res.json();
      })
      .then(setOrders)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const exportOrders = () => {
    const rows: string[][] = [['Order ID', 'Date', 'Customer', 'Phone', 'Items', 'Total (INR)', 'Status']];
    for (const o of orders) {
      rows.push([
        o.id,
        new Date(o.created_at).toLocaleString('en-IN'),
        o.customer_name ?? '',
        o.customer_phone ?? '',
        (o.items ?? []).map((i) => `${i.quantity} x ${i.title}`).join('; '),
        String(o.total),
        o.status,
      ]);
    }
    download(`maghgo_orders_${today}.csv`, rows);
  };

  const exportLineItems = () => {
    const rows: string[][] = [['Order ID', 'Date', 'Product', 'Unit Price', 'Quantity', 'Subtotal', 'Status']];
    for (const o of orders) {
      for (const li of o.items ?? []) {
        rows.push([
          o.id,
          new Date(o.created_at).toLocaleDateString('en-IN'),
          li.title,
          String(li.price),
          String(li.quantity),
          String(li.subtotal),
          o.status,
        ]);
      }
    }
    download(`maghgo_line_items_${today}.csv`, rows);
  };

  if (loading) return <div className="text-gray-500">Loading…</div>;
  if (error) return <div className="text-red-500">Could not load reports: {error}</div>;

  const lineCount = orders.reduce((n, o) => n + (o.items?.length ?? 0), 0);

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-black text-gray-900 mb-2">Reports</h1>
      <p className="text-gray-600 mb-8">Export your real sales data as CSV — open it in Excel or Google Sheets.</p>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 shadow-sm text-center">
          <div className="text-6xl mb-4">📈</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Nothing to export yet</h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            Once customers start ordering from your store, you can export the full history here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <h2 className="text-xl font-bold mb-6">Available reports</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl gap-4">
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900">Orders export</h3>
                <p className="text-sm text-gray-500">
                  One row per order — customer, items, total and status. {orders.length} order(s).
                </p>
              </div>
              <button
                onClick={exportOrders}
                className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shrink-0"
              >
                Download CSV
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl gap-4">
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900">Line items export</h3>
                <p className="text-sm text-gray-500">
                  One row per product sold — ideal for a pivot table. {lineCount} line(s).
                </p>
              </div>
              <button
                onClick={exportLineItems}
                className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shrink-0"
              >
                Download CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
