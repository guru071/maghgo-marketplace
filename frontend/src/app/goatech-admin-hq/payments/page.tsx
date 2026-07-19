import React from 'react';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const inr = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

/** Subscription revenue ledger — every verified Razorpay payment, live. */
export default async function PaymentsPage() {
  const supabase = createAdminSupabaseClient();

  const { data: payments, error } = await supabase
    .from('payments')
    .select('id, amount, plan, is_yearly, status, razorpay_payment_id, created_at, merchant_id')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return <div className="p-8 text-red-500">Error loading payments: {error.message}</div>;

  // Resolve store names in one query.
  const ids = [...new Set((payments ?? []).map((p) => p.merchant_id).filter(Boolean))];
  const { data: merchants } = ids.length
    ? await supabase.from('merchants').select('id, store_name, store_slug').in('id', ids)
    : { data: [] as any[] };
  const nameOf = new Map((merchants ?? []).map((m: any) => [m.id, m]));

  const total = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const month = (payments ?? []).filter((p) => p.created_at >= monthStart).reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Subscription Payments</h1>
      <p className="text-gray-500 mb-6">Every verified payment from the Razorpay webhook. This is YOUR revenue.</p>

      <div className="flex gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 px-6 py-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase">All time</p>
          <p className="text-2xl font-black text-emerald-600">{inr(total)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 px-6 py-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase">This month</p>
          <p className="text-2xl font-black text-gray-900">{inr(month)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 px-6 py-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase">Payments</p>
          <p className="text-2xl font-black text-gray-900">{payments?.length ?? 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-4 font-semibold text-gray-600">When</th>
              <th className="p-4 font-semibold text-gray-600">Merchant</th>
              <th className="p-4 font-semibold text-gray-600">Plan</th>
              <th className="p-4 font-semibold text-gray-600">Amount</th>
              <th className="p-4 font-semibold text-gray-600">Razorpay ID</th>
            </tr>
          </thead>
          <tbody>
            {(payments ?? []).length > 0 ? payments!.map((p) => {
              const m = nameOf.get(p.merchant_id);
              return (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 text-sm text-gray-600">{new Date(p.created_at).toLocaleString('en-IN')}</td>
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{m?.store_name ?? '—'}</div>
                    {m && <div className="text-xs text-gray-400">/{m.store_slug}</div>}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-bold uppercase">
                      {p.plan}{p.is_yearly ? ' · yearly' : ''}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-emerald-600">{inr(Number(p.amount))}</td>
                  <td className="p-4 font-mono text-xs text-gray-400">{p.razorpay_payment_id}</td>
                </tr>
              );
            }) : (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">No payments yet — this fills up as merchants pay their subscription links.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
