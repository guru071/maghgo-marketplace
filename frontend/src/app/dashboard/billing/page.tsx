'use client';

import React, { useEffect, useState } from 'react';
import { Merchant } from '@/types';

export default function DashboardBilling() {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStore = async () => {
      const token = localStorage.getItem('maghgo_merchant_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      try {
        const res = await fetch(`${apiUrl}/api/dashboard/store`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setMerchant(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStore();
  }, []);

  if (isLoading) return <div className="text-gray-500">Loading billing...</div>;
  if (!merchant) return <div className="text-red-500">Failed to load.</div>;

  const isTrial = merchant.subscription_plan === 'trial';
  const planName = merchant.subscription_plan.toUpperCase();
  const trialEnds = new Date(merchant.trial_ends_at).toLocaleDateString();

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-500 mt-1">Manage your plan and upgrade limits.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Current Plan</h2>
        
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="text-sm font-semibold text-accent uppercase tracking-wider mb-1">Active Plan</div>
              <div className="text-3xl font-black text-gray-900">{planName}</div>
            </div>
            {isTrial && (
              <div className="bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1 rounded-full">
                TRIAL ACTIVE
              </div>
            )}
          </div>
          <div className="text-sm text-gray-600">
            {isTrial ? (
              <p>Your free trial will expire on <strong>{trialEnds}</strong>.</p>
            ) : (
              <p>Your subscription is currently active until <strong>{trialEnds}</strong>.</p>
            )}
          </div>
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-4">Need More Capacity?</h3>
        <p className="text-gray-600 text-sm mb-6">
          To upgrade your plan, unlock more products, and remove the GOAT'ECH branding, please return to your WhatsApp chat with the Maghgo bot and type:
        </p>
        <div className="bg-gray-900 text-green-400 font-mono text-center py-4 rounded-xl text-lg shadow-inner">
          UPGRADE
        </div>
      </div>
    </div>
  );
}
