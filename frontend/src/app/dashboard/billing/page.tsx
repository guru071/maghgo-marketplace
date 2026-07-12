'use client';

import React, { useEffect, useState } from 'react';

const PLAN_TIERS = [
  { id: 'basic', name: 'Basic', price: 99, limits: '50 Products' },
  { id: 'starter', name: 'Starter', price: 149, limits: '200 Products', features: 'Themes & Instagram Bots' },
  { id: 'pro', name: 'Pro', price: 249, limits: '1,000 Products', features: 'Analytics & Custom Domain' },
  { id: 'advanced', name: 'Advanced', price: 349, limits: '5,000 Products', features: 'API Access' },
  { id: 'premium', name: 'Premium', price: 499, limits: '10,000 Products', features: '24/7 Support' },
  { id: 'business', name: 'Business', price: 749, limits: '25,000 Products', features: 'White-Label Branding' },
  { id: 'agency', name: 'Agency', price: 999, limits: '50,000 Products', features: 'Multi-Storefronts' },
  { id: 'vip', name: 'VIP', price: 1499, limits: '100,000 Products', features: 'Custom Integrations' },
  { id: 'enterprise', name: 'Enterprise', price: 1999, limits: '500,000 Products', features: 'Dedicated Account Manager' }
];

export default function BillingPage() {
  const [merchantPlan, setMerchantPlan] = useState<string>('');
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    const fetchStore = async () => {
      const token = localStorage.getItem('maghgo_merchant_token');
      if (!token) return;
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiUrl}/api/dashboard/store`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMerchantPlan(data.subscription_plan);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchStore();
  }, []);

  const handleSubscribe = async (planId: string, price: number) => {
    setIsUpgrading(true);
    try {
      const token = localStorage.getItem('maghgo_merchant_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/dashboard/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: price, plan: planId })
      });
      const data = await res.json();
      
      if (data.bypassed) {
        window.location.reload(); // Reload to apply new plan
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      alert('Failed to subscribe.');
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-black text-gray-900 mb-2">Billing & Subscriptions</h1>
      <p className="text-gray-600 mb-8">Manage your plan and billing details.</p>

      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm mb-12 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Current Plan</h2>
          <div className="text-4xl font-black text-gray-900 capitalize">{merchantPlan || 'Loading...'}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Status</div>
          <div className="text-green-500 font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Active</div>
        </div>
      </div>

      <h2 className="text-2xl font-black text-gray-900 mb-6">Upgrade Your Store</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PLAN_TIERS.map((plan) => (
          <div key={plan.id} className={`bg-white rounded-2xl border ${merchantPlan === plan.id ? 'border-accent ring-2 ring-accent/20' : 'border-gray-200'} p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden`}>
            {merchantPlan === plan.id && (
              <div className="absolute top-0 right-0 bg-accent text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                Current
              </div>
            )}
            
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <div className="text-3xl font-black text-gray-900 mb-4">₹{plan.price}<span className="text-sm text-gray-500 font-medium">/mo</span></div>
              
              <ul className="space-y-3 mb-6 text-sm text-gray-600">
                <li className="flex items-center gap-2">📦 {plan.limits}</li>
                {plan.features && <li className="flex items-center gap-2 text-accent font-medium">✨ Unlocks: {plan.features}</li>}
              </ul>
            </div>

            <button 
              onClick={() => handleSubscribe(plan.id, plan.price)}
              disabled={merchantPlan === plan.id || isUpgrading}
              className={`w-full py-3 rounded-lg font-bold transition-colors ${
                merchantPlan === plan.id 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-black text-white hover:bg-gray-800'
              }`}
            >
              {merchantPlan === plan.id ? 'Current Plan' : isUpgrading ? 'Updating...' : `Upgrade to ${plan.name}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
