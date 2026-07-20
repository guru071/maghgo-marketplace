'use client';

import React, { useEffect, useState } from 'react';
import { getSubscriptionStatus } from '@/lib/subscription';

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
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
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
          setEndsAt(data.subscription_ends_at || null);
          setLoaded(true);
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

      {(() => {
        const st = getSubscriptionStatus({ subscription_plan: merchantPlan, subscription_ends_at: endsAt });
        const tone = !loaded
          ? { dot: 'bg-gray-300', text: 'text-gray-400', label: 'Loading…' }
          : !st.hasPlan
            ? { dot: 'bg-gray-400', text: 'text-gray-500', label: 'No plan yet' }
            : st.expired
              ? { dot: 'bg-red-500', text: 'text-red-600', label: 'Expired' }
              : st.expiringSoon
                ? { dot: 'bg-amber-500', text: 'text-amber-600', label: 'Expiring soon' }
                : { dot: 'bg-green-500', text: 'text-green-600', label: 'Active' };

        return (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm mb-12">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Current Plan</h2>
                <div className="text-4xl font-black text-gray-900 capitalize">
                  {loaded ? (st.hasPlan ? merchantPlan : 'None') : 'Loading…'}
                </div>
              </div>
              <div className="sm:text-right">
                <div className="text-sm text-gray-500">Status</div>
                <div className={`font-bold flex items-center gap-1.5 sm:justify-end ${tone.text}`}>
                  <span className={`w-2 h-2 rounded-full ${tone.dot}`} /> {tone.label}
                </div>
              </div>
            </div>

            {loaded && st.hasPlan && (
              <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    {st.expired ? 'Expired on' : 'Renews / expires on'}
                  </div>
                  <div className="text-lg font-bold text-gray-900">{st.endsAtLabel}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    {st.expired ? 'Offline for' : 'Time remaining'}
                  </div>
                  <div className={`text-lg font-bold ${st.expired ? 'text-red-600' : st.expiringSoon ? 'text-amber-600' : 'text-gray-900'}`}>
                    {st.expired
                      ? `${Math.abs(st.daysLeft)} day${Math.abs(st.daysLeft) === 1 ? '' : 's'}`
                      : `${st.daysLeft} day${st.daysLeft === 1 ? '' : 's'}`}
                  </div>
                </div>
              </div>
            )}

            {loaded && st.expired && st.hasPlan && (
              <p className="mt-5 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                Your storefront is offline. Your products, orders and settings are all safe — renewing below
                brings the store straight back.
              </p>
            )}
            {loaded && st.expiringSoon && (
              <p className="mt-5 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                Renew before {st.endsAtLabel} to keep your storefront online. We&apos;ll also remind you on the bot.
              </p>
            )}
          </div>
        );
      })()}

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
