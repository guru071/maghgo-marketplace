'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { getPlans, updatePlanPrice } from './actions';
import Button from '@/components/ui/Button';

export default function PlansAdminPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getPlans().then(data => {
      setPlans(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const handleSave = (id: number, e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const monthly = parseInt(formData.get('monthly') as string);
    const yearly = parseInt(formData.get('yearly') as string);
    const limit = parseInt(formData.get('limit') as string);

    startTransition(async () => {
      await updatePlanPrice(id, monthly, yearly, limit);
      setPlans(plans.map(p => p.id === id ? { ...p, monthly_price: monthly, yearly_price: yearly, product_limit: limit } : p));
      setEditingId(null);
    });
  };

  if (loading) return <div className="p-8">Loading plans...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Subscription Plans</h1>
        <p className="text-gray-500 mt-2">Edit pricing and product limits for all plans dynamically. Changes reflect instantly on the live site.</p>
      </div>

      <div className="grid gap-4">
        {plans.map(plan => (
          <div key={plan.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            {editingId === plan.id ? (
              <form onSubmit={(e) => handleSave(plan.id, e)} className="flex-1 flex gap-4 items-end">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Plan Name</label>
                  <input disabled value={plan.name} className="w-full border rounded-lg p-2 bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Monthly (₹)</label>
                  <input name="monthly" type="number" defaultValue={plan.monthly_price} className="w-full border rounded-lg p-2" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Yearly (₹)</label>
                  <input name="yearly" type="number" defaultValue={plan.yearly_price} className="w-full border rounded-lg p-2" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Product Limit</label>
                  <input name="limit" type="number" defaultValue={plan.product_limit} className="w-full border rounded-lg p-2" required />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isPending}>{isPending ? '...' : 'Save'}</Button>
                  <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                  <div>
                    <h3 className="font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-sm text-gray-500">{plan.slug}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Monthly</span>
                    <p className="font-semibold">₹{plan.monthly_price}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Yearly</span>
                    <p className="font-semibold">₹{plan.yearly_price}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Limit</span>
                    <p className="font-semibold">{plan.product_limit.toLocaleString()} items</p>
                  </div>
                </div>
                <div>
                  <Button onClick={() => setEditingId(plan.id)} variant="secondary">Edit Pricing</Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
