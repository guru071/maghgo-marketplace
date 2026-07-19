'use client';

import React, { useState, useTransition } from 'react';
import { extendSubscription, setMerchantPlan, setMerchantActive, deleteMerchant } from './actions';

const PLANS = ['basic', 'starter', 'pro', 'advanced', 'premium', 'business', 'agency', 'vip', 'enterprise', 'custom'];

/** Per-row controls: extend, change plan, suspend/reactivate, delete. */
export default function MerchantActions({ merchantId, storeName, plan, isActive }: {
  merchantId: string; storeName: string; plan: string; isActive: boolean;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => setMsg(await fn()));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => run(() => extendSubscription(merchantId, 30))}
        disabled={pending}
        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
      >
        +30d
      </button>
      <button
        onClick={() => run(() => extendSubscription(merchantId, 365))}
        disabled={pending}
        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
      >
        +1y
      </button>
      <select
        defaultValue={plan}
        disabled={pending}
        onChange={(e) => run(() => setMerchantPlan(merchantId, e.target.value))}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
        title="Change plan (admin override, no payment)"
      >
        {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <button
        onClick={() => run(() => setMerchantActive(merchantId, !isActive))}
        disabled={pending}
        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50 ${isActive ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
      >
        {isActive ? 'Suspend' : 'Reactivate'}
      </button>
      <button
        onClick={() => {
          if (!confirm(`PERMANENTLY delete "${storeName}"?\n\nAll their products, orders, coupons and reviews are deleted too. This cannot be undone.`)) return;
          if (!confirm('Really sure? Last chance.')) return;
          run(() => deleteMerchant(merchantId));
        }}
        disabled={pending}
        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
      >
        Delete
      </button>
      {msg && <span className={`text-[11px] ${msg.ok ? 'text-emerald-600' : 'text-red-500'}`}>{msg.message}</span>}
    </div>
  );
}
