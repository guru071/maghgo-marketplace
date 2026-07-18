'use client';

import React, { useEffect, useState } from 'react';

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percent' | 'flat';
  discount_value: number;
  is_active: boolean;
  max_uses: number | null;
  used_count: number;
  min_order: number;
  expires_at: string | null;
}

const apiUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('maghgo_merchant_token') : ''}`,
});

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New-coupon form
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percent' | 'flat'>('percent');
  const [value, setValue] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expires, setExpires] = useState('');

  const load = async () => {
    try {
      const res = await fetch(`${apiUrl()}/api/dashboard/coupons`, { headers: authHeaders() });
      if (res.ok) setCoupons(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl()}/api/dashboard/coupons`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          code,
          discount_type: type,
          discount_value: Number(value),
          min_order: minOrder ? Number(minOrder) : 0,
          max_uses: maxUses ? Number(maxUses) : null,
          expires_at: expires ? new Date(expires).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create coupon');
      setCode(''); setValue(''); setMinOrder(''); setMaxUses(''); setExpires('');
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this coupon? Shoppers will no longer be able to use it.')) return;
    setCoupons((cs) => cs.filter((c) => c.id !== id));
    try {
      await fetch(`${apiUrl()}/api/dashboard/coupons/${id}`, { method: 'DELETE', headers: authHeaders() });
    } catch {
      load();
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Discount Coupons</h1>
        <p className="text-gray-500 mt-1">Create codes your customers apply at checkout — on the web store and in the chat bot.</p>
      </div>

      {/* Create form */}
      <form onSubmit={create} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">New coupon</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required placeholder="DIWALI20"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 uppercase tracking-wide focus:ring-accent focus:border-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-accent focus:border-accent">
              <option value="percent">% off</option>
              <option value="flat">₹ off (flat)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{type === 'percent' ? 'Percent (%)' : 'Amount (₹)'}</label>
            <input type="number" min="1" value={value} onChange={(e) => setValue(e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-accent focus:border-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min order (₹) <span className="text-gray-400">optional</span></label>
            <input type="number" min="0" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-accent focus:border-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max uses <span className="text-gray-400">optional</span></label>
            <input type="number" min="1" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Unlimited"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-accent focus:border-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expires <span className="text-gray-400">optional</span></label>
            <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-accent focus:border-accent" />
          </div>
        </div>
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
        <div className="mt-4">
          <button type="submit" disabled={saving}
            className="bg-accent text-white px-6 py-2.5 rounded-full font-medium hover:bg-black transition-colors disabled:opacity-50">
            {saving ? 'Creating…' : 'Create coupon'}
          </button>
        </div>
      </form>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading…</div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="text-4xl mb-4">🏷️</div>
            <p>No coupons yet. Create your first discount code above.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Code', 'Discount', 'Min order', 'Used', 'Expires', ''].map((h) => (
                  <th key={h} className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {coupons.map((c) => {
                const expired = c.expires_at && new Date(c.expires_at) < new Date();
                const usedUp = c.max_uses != null && c.used_count >= c.max_uses;
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-gray-900">
                      {c.code}
                      {(expired || usedUp || !c.is_active) && (
                        <span className="ml-2 text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase">
                          {!c.is_active ? 'Inactive' : expired ? 'Expired' : 'Used up'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {c.discount_type === 'percent' ? `${c.discount_value}% off` : `₹${Number(c.discount_value).toLocaleString('en-IN')} off`}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{Number(c.min_order) > 0 ? `₹${Number(c.min_order).toLocaleString('en-IN')}` : '—'}</td>
                    <td className="px-6 py-4 text-gray-600">{c.used_count}{c.max_uses != null ? ` / ${c.max_uses}` : ''}</td>
                    <td className="px-6 py-4 text-gray-600">{c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => remove(c.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
